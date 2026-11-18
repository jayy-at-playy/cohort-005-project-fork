import { describe, expect, it } from "vitest";
import { noteDraftStatus } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("noteDraftStatus", () => {
  it("cannot save an empty draft when there is no note", () => {
    expect(noteDraftStatus("", null)).toEqual({
      length: 0,
      maxLength: MAX_NOTE_LENGTH,
      tooLong: false,
      empty: true,
      unsaved: false,
      canSave: false,
    });
  });

  it("can save a new draft", () => {
    const status = noteDraftStatus("Types vanish at runtime", null);
    expect(status.length).toBe(23);
    expect(status.unsaved).toBe(true);
    expect(status.empty).toBe(false);
    expect(status.canSave).toBe(true);
  });

  it("cannot save a draft identical to the saved note", () => {
    const status = noteDraftStatus("same", "same");
    expect(status.unsaved).toBe(false);
    expect(status.canSave).toBe(false);
  });

  it("can save an edited note", () => {
    const status = noteDraftStatus("same, edited", "same");
    expect(status.unsaved).toBe(true);
    expect(status.canSave).toBe(true);
  });

  it("treats a whitespace-only draft as empty", () => {
    const status = noteDraftStatus("   \n", null);
    expect(status.empty).toBe(true);
    expect(status.unsaved).toBe(false);
    expect(status.canSave).toBe(false);
  });

  it("accepts a draft of exactly the maximum length", () => {
    const status = noteDraftStatus("a".repeat(MAX_NOTE_LENGTH), null);
    expect(status.tooLong).toBe(false);
    expect(status.canSave).toBe(true);
  });

  it("rejects a draft one character over the maximum", () => {
    const status = noteDraftStatus("a".repeat(MAX_NOTE_LENGTH + 1), null);
    expect(status.tooLong).toBe(true);
    expect(status.canSave).toBe(false);
  });
});

describe("noteDraftStatus after a save trims the draft", () => {
  it("treats a draft as saved when it differs only by surrounding whitespace", () => {
    const status = noteDraftStatus("same \n", "same");
    expect(status.unsaved).toBe(false);
    expect(status.canSave).toBe(false);
  });

  it("measures length the way the save action does, after trimming", () => {
    const status = noteDraftStatus(` ${"a".repeat(MAX_NOTE_LENGTH)} `, null);
    expect(status.length).toBe(MAX_NOTE_LENGTH);
    expect(status.tooLong).toBe(false);
    expect(status.canSave).toBe(true);
  });
});
