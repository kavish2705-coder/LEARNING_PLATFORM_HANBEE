-- Replaces the Java Programming course content with the 25 chapters of the
-- Java notes (public/notes/java). Each lesson opens its chapter inside the
-- lesson page (external_url '/notes/java/...'), so the notes keep their own
-- layout for every student. Units group the chapters in order. Runs only while
-- the old placeholder lessons are still there.

do $$
declare
  v_course uuid;
  v_module uuid;
begin
  select id into v_course from courses where title = 'Java Programming';
  if v_course is null then return; end if;
  if exists (select 1 from lessons l join modules m on m.id = l.module_id where m.course_id = v_course and l.external_url like '/notes/%') then
    return;
  end if;

  delete from modules where course_id = v_course;

  insert into modules (course_id, title, sort_order) values (v_course, 'Unit 1: Foundations', 1) returning id into v_module;
  insert into lessons (module_id, title, content_type, published, body_text, external_url, youtube_id, sort_order) values
    (v_module, 'Introduction to Java', 'document', true, '', '/notes/java/01-introduction.html', null, 1),
    (v_module, 'Language Basics', 'document', true, '', '/notes/java/02-language-basics.html', null, 2),
    (v_module, 'Control Flow Statements', 'document', true, '', '/notes/java/03-control-flow.html', null, 3),
    (v_module, 'Arrays and Strings', 'document', true, '', '/notes/java/04-arrays-strings.html', null, 4),
    (v_module, 'Methods', 'document', true, '', '/notes/java/05-methods.html', null, 5);

  insert into modules (course_id, title, sort_order) values (v_course, 'Unit 2: Object-Oriented Java', 2) returning id into v_module;
  insert into lessons (module_id, title, content_type, published, body_text, external_url, youtube_id, sort_order) values
    (v_module, 'Classes and Objects', 'document', true, '', '/notes/java/06-classes-objects.html', null, 1),
    (v_module, 'Inheritance, Polymorphism and Abstraction', 'document', true, '', '/notes/java/07-inheritance-polymorphism.html', null, 2),
    (v_module, 'Interfaces, Enums, Records and Nested Classes', 'document', true, '', '/notes/java/08-interfaces-enums-records.html', null, 3),
    (v_module, 'Exception Handling', 'document', true, '', '/notes/java/09-exception-handling.html', null, 4);

  insert into modules (course_id, title, sort_order) values (v_course, 'Unit 3: Core Libraries', 3) returning id into v_module;
  insert into lessons (module_id, title, content_type, published, body_text, external_url, youtube_id, sort_order) values
    (v_module, 'Generics, Wrapper Classes and Utility APIs', 'document', true, '', '/notes/java/10-generics-wrappers-utilities.html', null, 1),
    (v_module, 'Collections Framework', 'document', true, '', '/notes/java/11-collections-framework.html', null, 2),
    (v_module, 'Lambdas, Functional Interfaces and Streams', 'document', true, '', '/notes/java/12-lambda-streams.html', null, 3),
    (v_module, 'File I/O, NIO and Serialization', 'document', true, '', '/notes/java/13-file-io.html', null, 4),
    (v_module, 'Multithreading and Concurrency', 'document', true, '', '/notes/java/14-multithreading.html', null, 5),
    (v_module, 'Modern Java (Java 9 to 25)', 'document', true, '', '/notes/java/15-modern-java.html', null, 6);

  insert into modules (course_id, title, sort_order) values (v_course, 'Unit 4: Advanced and Tooling', 4) returning id into v_module;
  insert into lessons (module_id, title, content_type, published, body_text, external_url, youtube_id, sort_order) values
    (v_module, 'JVM Internals, Reflection and Annotations', 'document', true, '', '/notes/java/16-jvm-reflection-annotations.html', null, 1),
    (v_module, 'JDBC: Java Database Connectivity', 'document', true, '', '/notes/java/17-jdbc.html', null, 2),
    (v_module, 'Build Tools, Testing and Logging', 'document', true, '', '/notes/java/18-build-testing-logging.html', null, 3),
    (v_module, 'SOLID Principles and Design Patterns', 'document', true, '', '/notes/java/19-design-patterns-solid.html', null, 4);

  insert into modules (course_id, title, sort_order) values (v_course, 'Unit 5: Enterprise Java', 5) returning id into v_module;
  insert into lessons (module_id, title, content_type, published, body_text, external_url, youtube_id, sort_order) values
    (v_module, 'Jakarta EE (JEE) Overview and Architecture', 'document', true, '', '/notes/java/20-jee-overview.html', null, 1),
    (v_module, 'Servlets', 'document', true, '', '/notes/java/21-servlets.html', null, 2),
    (v_module, 'JSP, Expression Language and JSTL', 'document', true, '', '/notes/java/22-jsp-jstl-el.html', null, 3),
    (v_module, 'Sessions, Cookies, Filters, Listeners and Web Security', 'document', true, '', '/notes/java/23-sessions-filters-security.html', null, 4),
    (v_module, 'JPA and Hibernate (ORM)', 'document', true, '', '/notes/java/24-jpa-hibernate.html', null, 5),
    (v_module, 'REST APIs and Spring Boot', 'document', true, '', '/notes/java/25-rest-spring-boot.html', null, 6);

end $$;
