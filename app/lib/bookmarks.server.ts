import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, desc, eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import { bookmarks, courses, lessons, modules } from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;

function ownBookmark(userId: number, lessonId: number) {
  return and(eq(bookmarks.userId, userId), eq(bookmarks.lessonId, lessonId));
}

export function isBookmarked(db: Db, userId: number, lessonId: number) {
  return !!db.select().from(bookmarks).where(ownBookmark(userId, lessonId)).get();
}

/**
 * Adds the Student's Bookmark on a Lesson, or removes it if there is one.
 * Returns whether the Lesson is now bookmarked. The unique index on
 * (user, lesson) means a second racing insert is ignored, not an error.
 */
export function toggleBookmark(
  db: Db,
  userId: number,
  lessonId: number,
  now: Date
): boolean {
  const removed = db
    .delete(bookmarks)
    .where(ownBookmark(userId, lessonId))
    .returning()
    .all();
  if (removed.length > 0) return false;

  db.insert(bookmarks)
    .values({ userId, lessonId, createdAt: now.toISOString() })
    .onConflictDoNothing()
    .run();
  return true;
}

/** The Student's Bookmarks, newest first, each with its Lesson and Course. */
export function listBookmarksForStudent(db: Db, userId: number) {
  return db
    .select({
      id: bookmarks.id,
      createdAt: bookmarks.createdAt,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(bookmarks)
    .innerJoin(lessons, eq(bookmarks.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.id))
    .all();
}
