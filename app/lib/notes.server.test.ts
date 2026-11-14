import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { getNote, listNotesForStudent, saveNote } from "./notes.server";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonId: number;
let secondLessonId: number;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonId = db
    .insert(schema.lessons)
    .values({ moduleId: module.id, title: "Lesson 1", position: 1 })
    .returning()
    .get().id;

  secondLessonId = db
    .insert(schema.lessons)
    .values({ moduleId: module.id, title: "Lesson 2", position: 2 })
    .returning()
    .get().id;
});

function minutesLater(minutes: number) {
  return new Date(NOW.getTime() + minutes * 60_000);
}

describe("saving a Note", () => {
  it("creates the Note with the body trimmed", () => {
    expect(
      saveNote(db, base.user.id, lessonId, "  Rewatch the end.  ", NOW)
    ).toMatchObject({ ok: true });

    expect(getNote(db, base.user.id, lessonId)).toMatchObject({
      body: "Rewatch the end.",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it("replaces the body and moves the last edited time on when saved again", () => {
    saveNote(db, base.user.id, lessonId, "First thought.", NOW);
    saveNote(db, base.user.id, lessonId, "Second thought.", minutesLater(30));

    expect(getNote(db, base.user.id, lessonId)).toMatchObject({
      body: "Second thought.",
      createdAt: NOW.toISOString(),
      updatedAt: minutesLater(30).toISOString(),
    });
  });
});

describe("the Note length cap", () => {
  it("accepts a Note of exactly 2,000 characters", () => {
    const body = "a".repeat(2000);

    expect(saveNote(db, base.user.id, lessonId, body, NOW)).toMatchObject({
      ok: true,
    });
    expect(getNote(db, base.user.id, lessonId)?.body).toBe(body);
  });

  it("refuses a Note of 2,001 characters with a message and stores nothing", () => {
    expect(
      saveNote(db, base.user.id, lessonId, "a".repeat(2001), NOW)
    ).toEqual({
      ok: false,
      error: "A note can be at most 2,000 characters.",
    });
    expect(getNote(db, base.user.id, lessonId)).toBeUndefined();
  });

  it("refuses a Note that is only whitespace", () => {
    expect(saveNote(db, base.user.id, lessonId, "   ", NOW)).toEqual({
      ok: false,
      error: "Write something before saving your note.",
    });
    expect(getNote(db, base.user.id, lessonId)).toBeUndefined();
  });
});

describe("listing a Student's Notes", () => {
  it("never holds two Notes on the same Lesson", () => {
    saveNote(db, base.user.id, lessonId, "One.", NOW);
    saveNote(db, base.user.id, lessonId, "Two.", minutesLater(1));

    expect(listNotesForStudent(db, base.user.id)).toHaveLength(1);
  });

  it("lists only that Student's Notes, last edited first, with their Lesson and Course", () => {
    const other = db
      .insert(schema.users)
      .values({
        name: "Priya",
        email: "priya@example.com",
        role: schema.UserRole.Student,
      })
      .returning()
      .get();
    saveNote(db, base.user.id, lessonId, "Older note.", NOW);
    saveNote(db, base.user.id, secondLessonId, "Newer note.", minutesLater(5));
    saveNote(db, other.id, lessonId, "Not mine.", minutesLater(10));
    // Editing the older Note brings it back to the top.
    saveNote(db, base.user.id, lessonId, "Older note, edited.", minutesLater(20));

    expect(listNotesForStudent(db, base.user.id)).toMatchObject([
      {
        lessonId,
        lessonTitle: "Lesson 1",
        courseTitle: "Test Course",
        courseSlug: "test-course",
        body: "Older note, edited.",
        updatedAt: minutesLater(20).toISOString(),
      },
      {
        lessonId: secondLessonId,
        lessonTitle: "Lesson 2",
        courseTitle: "Test Course",
        courseSlug: "test-course",
        body: "Newer note.",
        updatedAt: minutesLater(5).toISOString(),
      },
    ]);
  });
});
