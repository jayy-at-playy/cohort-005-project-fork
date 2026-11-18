import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraftStatus = {
  length: number;
  maxLength: number;
  tooLong: boolean;
  empty: boolean;
  unsaved: boolean;
  canSave: boolean;
};

export function noteDraftStatus(
  draft: string,
  savedBody: string | null
): NoteDraftStatus {
  // The save action trims before it validates and stores, so judge the draft
  // the same way or a trailing space reads as "unsaved" forever.
  const trimmed = draft.trim();
  const length = trimmed.length;
  const tooLong = length > MAX_NOTE_LENGTH;
  const empty = length === 0;
  const unsaved = trimmed !== (savedBody ?? "");
  return {
    length,
    maxLength: MAX_NOTE_LENGTH,
    tooLong,
    empty,
    unsaved,
    canSave: unsaved && !empty && !tooLong,
  };
}
