-- The Java Programming course: published, three modules, two lessons each.
-- Lessons have no video yet (youtube_id is null), so the lesson page shows a
-- video placeholder. Idempotent: skipped if the course already exists. The
-- Java section is created for the course, and the seeded student ava is
-- enrolled so she can see it; other students get it through enroll_student.

do $$
declare
  v_owner uuid;
  v_course uuid;
  v_module uuid;
  v_section uuid;
  v_student uuid;
begin
  if exists (select 1 from courses where title = 'Java Programming') then
    return;
  end if;

  select id into v_owner from profiles where email = 'hanbeetechnology@gmail.com';
  if v_owner is null then
    select id into v_owner from profiles where role in ('staff', 'manager') order by created_at limit 1;
  end if;
  if v_owner is null then
    raise notice 'Skipping Java course seed because no staff or manager profile exists yet';
    return;
  end if;

  insert into courses (title, description, status, cover_accent, owner_id)
  values (
    'Java Programming',
    'Learn Java from first program to object-oriented design: syntax, control flow, classes, collections and exceptions.',
    'published',
    '#e76f51',
    v_owner
  )
  returning id into v_course;

  insert into modules (course_id, title, sort_order) values (v_course, 'Getting Started', 1) returning id into v_module;
  insert into lessons (module_id, title, content_type, published, body_text, external_url, youtube_id, sort_order) values
    (v_module, 'What Java is and how it runs', 'text', true,
     'Java is a class-based, object-oriented language. Source code is compiled to bytecode, and the Java Virtual Machine (JVM) runs that bytecode on any platform. You write code once and run it anywhere the JVM is available.',
     '', null, 1),
    (v_module, 'Your first program', 'text', true,
     E'Every Java program starts from a class with a main method:\n\npublic class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello, Hanbee!");\n    }\n}\n\nSave it as Hello.java, compile with javac Hello.java, and run with java Hello.',
     '', null, 2);

  insert into modules (course_id, title, sort_order) values (v_course, 'Core Language', 2) returning id into v_module;
  insert into lessons (module_id, title, content_type, published, body_text, external_url, youtube_id, sort_order) values
    (v_module, 'Variables and types', 'text', true,
     'Java is statically typed: every variable has a declared type such as int, double, boolean or String. Declare with int count = 0; and reassign later with count = count + 1;.',
     '', null, 1),
    (v_module, 'Control flow and loops', 'text', true,
     'Use if and else for decisions, and for, while and do-while for repetition. An enhanced for loop walks any collection: for (String name : names) { ... }.',
     '', null, 2);

  insert into modules (course_id, title, sort_order) values (v_course, 'Object-Oriented Java', 3) returning id into v_module;
  insert into lessons (module_id, title, content_type, published, body_text, external_url, youtube_id, sort_order) values
    (v_module, 'Classes and objects', 'text', true,
     'A class describes the state (fields) and behaviour (methods) of a kind of object. Create instances with new: Car c = new Car();. Constructors set up each new object.',
     '', null, 1),
    (v_module, 'Inheritance and interfaces', 'text', true,
     'A subclass extends a superclass to reuse and specialise its behaviour. An interface declares a contract that classes implement, so unrelated classes can share a type.',
     '', null, 2);

  insert into sections (course_id, name, start_date, end_date)
  values (v_course, 'Java Section A', current_date, current_date + 90)
  returning id into v_section;

  select id into v_student from profiles where email = 'ava@student.edu' and role = 'student';
  if v_student is not null then
    insert into enrollments (section_id, student_id, status) values (v_section, v_student, 'active')
    on conflict (section_id, student_id) do nothing;
  end if;
end $$;
