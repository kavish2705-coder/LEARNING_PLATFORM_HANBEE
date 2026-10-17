// HanbeeLms — Supabase seed script.
// Run once, after the migrations in supabase/migrations/ have been applied,
// against a fresh project: `node supabase/seed.mjs`.
//
// Needs two env vars (never commit these):
//   SUPABASE_URL              — Project Settings → API → Project URL
//   SUPABASE_SERVICE_ROLE_KEY — Project Settings → API → service_role key
//                                (NOT the anon key — this script needs to
//                                create auth users and bypass RLS to seed).
//
// This recreates the same demo accounts and a working slice of the mock
// data every frontend/src/lib/mock*.ts file currently hardcodes, so the app
// behaves familiarly once wired to real Supabase calls.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Every Supabase write below is wrapped so a failure is loud and the script
// stops immediately, rather than silently leaving partial seed data behind —
// the .insert() calls further down would otherwise swallow their own errors.
async function insert(table, rows) {
  const { data, error } = await admin.from(table).insert(rows).select();
  if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
  return data;
}

async function upsertAuthUser(email, password, fullName, role) {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === email);
  if (found) return found.id;

  // Migration 0048 permits at most one manager, ever (profiles_single_manager_idx).
  // A real project can already have its one permanent manager (confirmed by
  // email in that migration), which a fresh/CI database won't — so creating
  // a second manager here would hit handle_new_user's invite-only fallback.
  // Skip instead of crashing the whole seed run over an account that was
  // never meant to coexist with a real manager.
  if (role === "manager") {
    const { data: existingManager } = await admin.from("profiles").select("email").eq("role", "manager").maybeSingle();
    if (existingManager) {
      console.log(`Skipping ${email}: ${existingManager.email} is already the one permitted manager.`);
      return null;
    }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) throw error;
  return data.user.id;
}

async function upsertSchoolStaffAuthUser(email, password, fullName, schoolName, registrationNo, officialEmail) {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === email);
  if (found) return found.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "school_staff",
      school_name: schoolName,
      registration_no: registrationNo,
      official_email: officialEmail,
      guardian_consent: "true",
    },
  });
  if (error) throw error;

  // A real school_staff signup starts unapproved with a pending org, waiting
  // on verify_school() by a manager/Hanbee staff. For a seed account, skip
  // that wait and activate it directly (service role bypasses RLS).
  const { error: profileError } = await admin
    .from("profiles")
    .update({ approved: true, account_status: "active" })
    .eq("id", data.user.id);
  if (profileError) throw new Error(`activating school_staff profile failed: ${profileError.message}`);

  const { error: orgError } = await admin.from("organizations").update({ status: "active" }).eq("created_by", data.user.id);
  if (orgError) throw new Error(`activating seed school failed: ${orgError.message}`);

  return data.user.id;
}

async function upsertStudentAuthUser(email, password, fullName, invitedBy) {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === email);
  if (found) return found.id;

  // Since migration 0024, handle_new_user only allows a brand-new student
  // signup via a real invite_token (there's no direct self-signup branch
  // for role 'student') — so a fresh student seed has to create a real
  // invitation first, the same way the app's own invite flow would.
  const { data: invitation, error: inviteError } = await admin
    .from("invitations")
    .insert({ email, role: "student", invited_by: invitedBy })
    .select("token")
    .single();
  if (inviteError) throw new Error(`insert into invitations failed: ${inviteError.message}`);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "student", invite_token: invitation.token },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  console.log("Creating demo accounts...");
  // Passwords need one of each: lowercase, UPPERCASE, digit, symbol — the
  // project's password policy (Supabase Auth settings, S10 hardening) now
  // requires all four; the old all-lowercase demo passwords fail it.
  const staffId = await upsertAuthUser("jamie@hanbeelms.edu", "Staff123!", "Jamie Rivera", "staff");
  const studentId = await upsertStudentAuthUser("ava@student.edu", "Student123!", "Ava Chen", staffId);
  await upsertAuthUser("morgan@hanbeelms.edu", "Manager123!", "Morgan Ellis", "manager");
  const schoolStaffId = await upsertSchoolStaffAuthUser(
    "principal@brookfield.edu",
    "SchoolStaff123!",
    "Riley Brooks",
    "Brookfield Academy",
    "REG-BROOKFIELD-001",
    "office@brookfield.edu",
  );
  // The handle_new_user trigger creates the profiles row automatically.

  // .maybeSingle() requires EXACTLY 0 or 1 matching rows and returns an
  // error (not data) on 2+ — which this check wasn't looking at, so once a
  // second duplicate existed it silently read as "not found" and created
  // more. Use a plain limited select and check row count instead.
  const { data: existingCourses } = await admin.from("courses").select("id").eq("title", "Intro to Design").limit(1);
  const existingCourse = existingCourses?.[0];
  if (existingCourse) {
    console.log("Skipping course content: \"Intro to Design\" already exists from a previous seed run.");
  } else {
    console.log("Seeding course content...");
    const { data: course } = await admin
      .from("courses")
      .insert({ title: "Intro to Design", description: "A foundational course covering design principles, color, and typography.", status: "published", owner_id: staffId })
      .select()
      .single();

    const { data: section } = await admin
      .from("sections")
      .insert({ course_id: course.id, name: "Intro to Design — Section B", capacity: 50, start_date: "2025-08-12", end_date: "2025-09-23" })
      .select()
      .single();

    const { data: mod1 } = await admin.from("modules").insert({ course_id: course.id, title: "Module 1: Foundations", sort_order: 0 }).select().single();
    const { data: mod2 } = await admin.from("modules").insert({ course_id: course.id, title: "Module 2: Typography", sort_order: 1 }).select().single();

    // Every object below lists every column explicitly (even when empty/null) —
    // PostgREST builds one bulk INSERT from the union of all objects' keys, so
    // a row missing a key gets an explicit NULL for it (bypassing the column's
    // DEFAULT), which then fails any NOT NULL constraint on that column.
    const emptyLesson = { body_text: "", external_url: "", youtube_id: null };
    await insert("lessons", [
      { ...emptyLesson, module_id: mod1.id, title: "Welcome & syllabus", content_type: "text", published: true, sort_order: 0, body_text: "Welcome to Intro to Design! Over the next 6 weeks we'll cover color theory, typography, and layout fundamentals." },
      { ...emptyLesson, module_id: mod1.id, title: "Color Theory", content_type: "video", published: true, sort_order: 1, youtube_id: "_2LLXnUdUIc" },
      { ...emptyLesson, module_id: mod1.id, title: "Reading: principles of design", content_type: "document", published: false, sort_order: 2 },
      { ...emptyLesson, module_id: mod2.id, title: "Type pairing", content_type: "slides", published: true, sort_order: 0 },
      { ...emptyLesson, module_id: mod2.id, title: "Further reading", content_type: "link", published: false, sort_order: 1, external_url: "https://www.interaction-design.org/literature/topics/typography" },
    ]);

    // ava@student.edu is a pre-existing legacy account that may already
    // have an enrollment (and roll_no, which is globally unique) from
    // before this script's current form — check by student_id, not just
    // whether this specific course/section exists yet.
    const { data: existingEnrollments } = await admin.from("enrollments").select("id").eq("student_id", studentId).limit(1);
    if (existingEnrollments?.[0]) {
      console.log(`Skipping enrollment: student ${studentId} already has one.`);
    } else {
      console.log("Enrolling the demo student...");
      await insert("enrollments", {
        section_id: section.id,
        student_id: studentId,
        status: "active",
        roll_no: "STU-2026-001",
        age: 21,
        institution: "Brookfield College",
        phone: "(555) 301-7742",
      });
    }
  }

  const { data: existingHolidays } = await admin.from("holidays").select("id").eq("name", "Founders' Day").limit(1);
  if (existingHolidays?.[0]) {
    console.log("Skipping holiday/announcement: already seeded from a previous run.");
  } else {
    console.log("Seeding a holiday and an announcement...");
    await insert("holidays", { name: "Founders' Day", holiday_date: "2026-09-25", scope: "center" });
    await insert("announcements", {
      author_id: staffId,
      title: "Welcome to the course",
      body: "Excited to have you all this term — check the syllabus for the full schedule and grading breakdown.",
      audience: "all",
    });
  }

  console.log(
    "Done. Demo accounts: jamie@hanbeelms.edu / Staff123!, ava@student.edu / Student123!, " +
      "morgan@hanbeelms.edu / Manager123! (skipped if the project already has a manager), " +
      "principal@brookfield.edu / SchoolStaff123!",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
