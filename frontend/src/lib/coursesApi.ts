import { authenticatedSupabaseFetch, readStoredSession } from "./supabaseAuth";

type Enrollment = { id: string; section_id: string; status: "active" | "completed" };
type Section = { id: string; course_id: string; name: string };
type Course = { id: string; title: string; description: string; cover_accent: string; status: string };
type Module = { id: string; course_id: string; title: string; sort_order: number };
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  published: boolean;
  content_type: string;
  body_text: string;
  external_url: string;
  youtube_id: string | null;
  sort_order: number;
};
type Completion = { enrollment_id: string; lesson_id: string; completed_at: string };
type LessonMaterialRow = { id: string; lesson_id: string; file_name: string; file_size_bytes: number; storage_path: string };

export interface LessonMaterial {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  storagePath: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  contentType: string;
  bodyText: string;
  externalUrl: string;
  youtubeId: string | null;
  completed: boolean;
  materials: LessonMaterial[];
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseContent {
  id: string;
  title: string;
  description: string;
  modules: CourseModule[];
  completedLessonCount: number;
  lessonCount: number;
  progressPercent: number;
}

export interface StudentCourseSummary {
  id: string;
  title: string;
  description: string;
  coverAccent: string;
  sectionNames: string[];
  moduleCount: number;
  lessonCount: number;
  completedLessonCount: number;
  progressPercent: number;
  status: "in_progress" | "completed";
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(",")})`;
}

async function fetchRows<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const query = new URLSearchParams({ select: "*", ...params });
  return authenticatedSupabaseFetch<T[]>(`/rest/v1/${table}?${query.toString()}`);
}

export async function fetchMyCourses(): Promise<StudentCourseSummary[]> {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");

  const enrollments = await fetchRows<Enrollment>("enrollments", {
    select: "id,section_id,status",
    student_id: `eq.${session.user.id}`,
    status: "in.(active,completed)",
    order: "enrolled_date.desc",
  });
  if (enrollments.length === 0) return [];

  const sections = await fetchRows<Section>("sections", {
    select: "id,course_id,name",
    id: inFilter([...new Set(enrollments.map((enrollment) => enrollment.section_id))]),
  });
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const courseIds = [...new Set(sections.map((section) => section.course_id))];
  if (courseIds.length === 0) return [];

  const courses = await fetchRows<Course>("courses", {
    select: "id,title,description,cover_accent,status",
    id: inFilter(courseIds),
    status: "eq.published",
    order: "created_at.desc",
  });
  const courseIdSet = new Set(courses.map((course) => course.id));
  if (courseIdSet.size === 0) return [];

  const modules = await fetchRows<Module>("modules", {
    select: "id,course_id,title,sort_order",
    course_id: inFilter([...courseIdSet]),
    order: "sort_order.asc",
  });
  const moduleIds = modules.map((module) => module.id);
  const lessons = moduleIds.length === 0
    ? []
    : await fetchRows<Lesson>("lessons", {
      select: "id,module_id,title,published,sort_order",
      module_id: inFilter(moduleIds),
      published: "eq.true",
      order: "sort_order.asc",
    });
  const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
  const completions = enrollmentIds.length === 0
    ? []
    : await fetchRows<Completion>("lesson_completions", {
      select: "enrollment_id,lesson_id,completed_at",
      enrollment_id: inFilter(enrollmentIds),
    });

  const modulesByCourse = new Map<string, Module[]>();
  for (const module of modules) {
    modulesByCourse.set(module.course_id, [...(modulesByCourse.get(module.course_id) ?? []), module]);
  }
  const lessonsByModule = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    lessonsByModule.set(lesson.module_id, [...(lessonsByModule.get(lesson.module_id) ?? []), lesson]);
  }

  return courses.map((course) => {
    const courseModules = modulesByCourse.get(course.id) ?? [];
    const courseLessons = courseModules.flatMap((module) => lessonsByModule.get(module.id) ?? []);
    const courseSections = sections.filter((section) => section.course_id === course.id);
    const courseEnrollmentIds = new Set(enrollments
      .filter((enrollment) => courseSections.some((section) => section.id === enrollment.section_id))
      .map((enrollment) => enrollment.id));
    const completedIds = new Set(completions
      .filter((completion) => courseEnrollmentIds.has(completion.enrollment_id))
      .map((completion) => completion.lesson_id));
    const completedLessonCount = courseLessons.filter((lesson) => completedIds.has(lesson.id)).length;
    const progressPercent = courseLessons.length === 0
      ? 0
      : Math.round((completedLessonCount / courseLessons.length) * 100);

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverAccent: course.cover_accent,
      sectionNames: courseSections.map((section) => section.name),
      moduleCount: courseModules.length,
      lessonCount: courseLessons.length,
      completedLessonCount,
      progressPercent,
      status: progressPercent === 100 && courseLessons.length > 0 ? "completed" : "in_progress",
    };
  });
}

export async function completeLesson(lessonId: string, courseId: string, courseTitle: string): Promise<boolean> {
  await authenticatedSupabaseFetch<unknown>("/rest/v1/rpc/complete_lesson", {
    method: "POST",
    body: JSON.stringify({ p_lesson_id: lessonId }),
  });
  const updatedCourse = await fetchCourseContent(courseId);
  if (updatedCourse.lessonCount > 0 && updatedCourse.progressPercent === 100) {
    await authenticatedSupabaseFetch<unknown>("/rest/v1/rpc/issue_certificate", {
      method: "POST",
      body: JSON.stringify({ p_course_title: courseTitle }),
    });
    return true;
  }
  return false;
}

export async function fetchCourseContent(courseId: string): Promise<CourseContent> {
  const courses = await fetchRows<Course>("courses", {
    select: "id,title,description,cover_accent,status",
    id: `eq.${courseId}`,
    status: "eq.published",
    limit: "1",
  });
  const course = courses[0];
  if (!course) throw new Error("This course is unavailable or you are not enrolled.");

  const modules = await fetchRows<Module>("modules", {
    select: "id,course_id,title,sort_order",
    course_id: `eq.${courseId}`,
    order: "sort_order.asc",
  });
  const moduleIds = modules.map((module) => module.id);
  const lessons = moduleIds.length === 0
    ? []
    : await fetchRows<Lesson>("lessons", {
      select: "id,module_id,title,content_type,body_text,external_url,youtube_id,published,sort_order",
      module_id: inFilter(moduleIds),
      published: "eq.true",
      order: "sort_order.asc",
    });
  const enrollments = await fetchRows<Enrollment>("enrollments", {
    select: "id,section_id,status",
    status: "in.(active,completed)",
  });
  const sections = enrollments.length === 0
    ? []
    : await fetchRows<Section>("sections", {
      select: "id,course_id,name",
      id: inFilter([...new Set(enrollments.map((enrollment) => enrollment.section_id))]),
      course_id: `eq.${courseId}`,
    });
  const courseSectionIds = new Set(sections.map((section) => section.id));
  const courseEnrollmentIds = enrollments
    .filter((enrollment) => courseSectionIds.has(enrollment.section_id))
    .map((enrollment) => enrollment.id);
  const completions = courseEnrollmentIds.length === 0 || lessons.length === 0
    ? []
    : await fetchRows<Completion>("lesson_completions", {
      select: "enrollment_id,lesson_id,completed_at",
      enrollment_id: inFilter(courseEnrollmentIds),
      lesson_id: inFilter(lessons.map((lesson) => lesson.id)),
    });
  const completedIds = new Set(completions.map((completion) => completion.lesson_id));
  const materials = lessons.length === 0
    ? []
    : await fetchRows<LessonMaterialRow>("lesson_materials", {
      select: "id,lesson_id,file_name,file_size_bytes,storage_path",
      lesson_id: inFilter(lessons.map((lesson) => lesson.id)),
    });
  const materialsByLesson = new Map<string, LessonMaterial[]>();
  for (const material of materials) {
    materialsByLesson.set(material.lesson_id, [...(materialsByLesson.get(material.lesson_id) ?? []), {
      id: material.id,
      fileName: material.file_name,
      fileSizeBytes: material.file_size_bytes,
      storagePath: material.storage_path,
    }]);
  }
  const lessonsByModule = new Map<string, CourseLesson[]>();
  for (const lesson of lessons) {
    lessonsByModule.set(lesson.module_id, [...(lessonsByModule.get(lesson.module_id) ?? []), {
      id: lesson.id,
      title: lesson.title,
      contentType: lesson.content_type,
      bodyText: lesson.body_text,
      externalUrl: lesson.external_url,
      youtubeId: lesson.youtube_id,
      completed: completedIds.has(lesson.id),
      materials: materialsByLesson.get(lesson.id) ?? [],
    }]);
  }
  const contentModules = modules.map((module) => ({
    id: module.id,
    title: module.title,
    lessons: lessonsByModule.get(module.id) ?? [],
  }));
  const lessonCount = lessons.length;
  const completedLessonCount = lessons.filter((lesson) => completedIds.has(lesson.id)).length;

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    modules: contentModules,
    completedLessonCount,
    lessonCount,
    progressPercent: lessonCount === 0 ? 0 : Math.round((completedLessonCount / lessonCount) * 100),
  };
}

// --- Lesson attachments (private "lesson-attachments" storage bucket) ---
// Path convention (0073_reconcile_lesson_attachments.sql): "<lesson_id>/<file_name>",
// must equal lesson_materials.storage_path. No service-role key ever belongs
// in the browser -- uploads/signed URLs go through the authenticated client
// only, and the bucket's own RLS policies do the real access control.

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!url) throw new Error("Supabase URL is not configured.");
  return url;
}

export async function fetchAttachmentDownloadUrl(storagePath: string): Promise<string> {
  const { signedURL } = await authenticatedSupabaseFetch<{ signedURL: string }>(
    `/storage/v1/object/sign/lesson-attachments/${storagePath}`,
    { method: "POST", body: JSON.stringify({ expiresIn: 120 }) },
  );
  return `${getSupabaseUrl()}/storage/v1${signedURL}`;
}

export async function uploadLessonAttachment(lessonId: string, file: File): Promise<void> {
  const storagePath = `${lessonId}/${file.name}`;
  await authenticatedSupabaseFetch<unknown>(`/storage/v1/object/lesson-attachments/${storagePath}`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  await authenticatedSupabaseFetch<unknown>("/rest/v1/lesson_materials", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      lesson_id: lessonId,
      file_name: file.name,
      file_size_bytes: file.size,
      storage_path: storagePath,
    }),
  });
}

export async function deleteLessonAttachment(materialId: string, storagePath: string): Promise<void> {
  await authenticatedSupabaseFetch<unknown>(`/storage/v1/object/lesson-attachments/${storagePath}`, {
    method: "DELETE",
  });
  await authenticatedSupabaseFetch<unknown>(`/rest/v1/lesson_materials?id=eq.${materialId}`, {
    method: "DELETE",
  });
}

export async function fetchLessonMaterials(lessonId: string): Promise<LessonMaterial[]> {
  const rows = await fetchRows<LessonMaterialRow>("lesson_materials", {
    select: "id,lesson_id,file_name,file_size_bytes,storage_path",
    lesson_id: `eq.${lessonId}`,
  });
  return rows.map((row) => ({
    id: row.id,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    storagePath: row.storage_path,
  }));
}
