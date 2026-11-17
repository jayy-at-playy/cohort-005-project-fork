import { noteDraftStatus as status, type NoteDraftStatus } from "./lib/draft";

export type { NoteDraftStatus };

/**
 * What the note editor should show for the text a Student has typed, given
 * the note already saved for the lesson (`null` when there is none).
 */
export function noteDraftStatus(
  draft: string,
  savedBody: string | null
): NoteDraftStatus {
  return status(draft, savedBody);
}
