import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import {
  isBookmarked,
  listBookmarksForStudent,
  toggleBookmark,
} from "./bookmarks.server";

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

function addStudent(name: string) {
  return db
    .insert(schema.users)
    .values({
      name,
      email: `${name.toLowerCase()}@example.com`,
      role: schema.UserRole.Student,
    })
    .returning()
    .get();
}

describe("toggling a Bookmark", () => {
  it("bookmarks a Lesson that has no Bookmark", () => {
    expect(toggleBookmark(db, base.user.id, lessonId, NOW)).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonId)).toBe(true);
  });

  it("removes the Bookmark when toggled again", () => {
    toggleBookmark(db, base.user.id, lessonId, NOW);

    expect(toggleBookmark(db, base.user.id, lessonId, NOW)).toBe(false);
    expect(isBookmarked(db, base.user.id, lessonId)).toBe(false);
  });
});

describe("listing a Student's Bookmarks", () => {
  it("never holds two Bookmarks on the same Lesson", () => {
    toggleBookmark(db, base.user.id, lessonId, NOW);
    toggleBookmark(db, base.user.id, lessonId, minutesLater(1));
    toggleBookmark(db, base.user.id, lessonId, minutesLater(2));

    expect(listBookmarksForStudent(db, base.user.id)).toHaveLength(1);
  });

  it("lists only that Student's Bookmarks, newest first, with their Lesson and Course", () => {
    const other = addStudent("Priya");
    toggleBookmark(db, base.user.id, lessonId, NOW);
    toggleBookmark(db, base.user.id, secondLessonId, minutesLater(5));
    toggleBookmark(db, other.id, lessonId, minutesLater(10));

    expect(listBookmarksForStudent(db, base.user.id)).toMatchObject([
      {
        lessonId: secondLessonId,
        lessonTitle: "Lesson 2",
        courseTitle: "Test Course",
        courseSlug: "test-course",
        createdAt: minutesLater(5).toISOString(),
      },
      {
        lessonId,
        lessonTitle: "Lesson 1",
        courseTitle: "Test Course",
        courseSlug: "test-course",
        createdAt: NOW.toISOString(),
      },
    ]);
  });
});
