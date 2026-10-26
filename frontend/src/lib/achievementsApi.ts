import { fetchMyCourses } from "./coursesApi";
import { fetchMyCertificates } from "./certificatesApi";
import { authenticatedSupabaseFetch, readStoredSession } from "./supabaseAuth";

export interface StudentAchievement {
  id: string;
  kind: "course" | "certificate" | "tournament";
  title: string;
  detail: string;
  earnedAt?: string;
}

interface TeamMembership {
  tournament_id: string;
  joined_at: string;
}

interface Tournament {
  id: string;
  title: string;
}

export async function fetchMyAchievements(): Promise<StudentAchievement[]> {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");

  const membershipsQuery = new URLSearchParams({
    select: "tournament_id,joined_at",
    student_id: `eq.${session.user.id}`,
    order: "joined_at.asc",
    limit: "1",
  });

  const [courses, certificates, memberships] = await Promise.all([
    fetchMyCourses(),
    fetchMyCertificates(),
    authenticatedSupabaseFetch<TeamMembership[]>(
      `/rest/v1/tournament_team_members?${membershipsQuery.toString()}`,
    ),
  ]);

  const achievements: StudentAchievement[] = [];
  const completedCourse = courses.find((course) => course.status === "completed");
  if (completedCourse) {
    achievements.push({
      id: `first-course-${completedCourse.id}`,
      kind: "course",
      title: "First course completed",
      detail: completedCourse.title,
    });
  }

  for (const certificate of certificates) {
    achievements.push({
      id: `certificate-${certificate.id}`,
      kind: "certificate",
      title: "Certificate earned",
      detail: certificate.course_title,
      earnedAt: certificate.issued_at,
    });
  }

  const firstMembership = memberships[0];
  if (firstMembership) {
    const tournamentQuery = new URLSearchParams({
      select: "id,title",
      id: `eq.${firstMembership.tournament_id}`,
      limit: "1",
    });
    const tournaments = await authenticatedSupabaseFetch<Tournament[]>(
      `/rest/v1/tournaments?${tournamentQuery.toString()}`,
    );
    const tournament = tournaments[0];
    if (!tournament) throw new Error("We couldn't load the tournament for your team achievement.");

    achievements.push({
      id: `tournament-team-${firstMembership.tournament_id}`,
      kind: "tournament",
      title: "Tournament teammate",
      detail: `Joined ${tournament.title}`,
      earnedAt: firstMembership.joined_at,
    });
  }

  return achievements.sort((a, b) => {
    if (!a.earnedAt) return b.earnedAt ? 1 : 0;
    if (!b.earnedAt) return -1;
    return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
  });
}
