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
  const length = draft.length;
  const tooLong = length > MAX_NOTE_LENGTH;
  // The save action rejects a blank note, so a blank draft is never saveable.
  const empty = draft.trim().length === 0;
  const unsaved = draft !== (savedBody ?? "");
  return {
    length,
    maxLength: MAX_NOTE_LENGTH,
    tooLong,
    empty,
    unsaved,
    canSave: unsaved && !empty && !tooLong,
  };
}
