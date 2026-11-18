import { describe, it, expect } from "vitest";
import { rainbowLines } from "../index";

describe("rainbowLines", () => {
  it("colours the home title red to violet, one colour per word, across lines", () => {
    const lines = rainbowLines(["Learn to code,", "at your own pace"]);

    expect(lines).toEqual([
      {
        position: 0,
        words: [
          {
            position: 0,
            word: "Learn",
            className: "text-red-600 dark:text-red-400",
          },
          {
            position: 1,
            word: "to",
            className: "text-orange-600 dark:text-orange-400",
          },
          {
            position: 2,
            word: "code,",
            className: "text-yellow-500 dark:text-yellow-300",
          },
        ],
      },
      {
        position: 1,
        words: [
          {
            position: 3,
            word: "at",
            className: "text-green-600 dark:text-green-400",
          },
          {
            position: 4,
            word: "your",
            className: "text-blue-600 dark:text-blue-400",
          },
          {
            position: 5,
            word: "own",
            className: "text-indigo-600 dark:text-indigo-400",
          },
          {
            position: 6,
            word: "pace",
            className: "text-violet-600 dark:text-violet-400",
          },
        ],
      },
    ]);
  });

  it("starts again at red after violet", () => {
    const [line] = rainbowLines(["a b c d e f g h i"]);

    expect(line.words.map((w) => w.className.split(" ")[0])).toEqual([
      "text-red-600",
      "text-orange-600",
      "text-yellow-500",
      "text-green-600",
      "text-blue-600",
      "text-indigo-600",
      "text-violet-600",
      "text-red-600",
      "text-orange-600",
    ]);
  });

  it("ignores extra whitespace between words", () => {
    const [line] = rainbowLines(["  Learn   to  "]);

    expect(line.words.map((w) => w.word)).toEqual(["Learn", "to"]);
  });

  it("gives an empty line no words and does not skip a colour for it", () => {
    const [, empty, last] = rainbowLines(["Learn", "", "to"]);

    expect(empty.words).toEqual([]);
    expect(last.words[0]).toEqual({
      position: 1,
      word: "to",
      className: "text-orange-600 dark:text-orange-400",
    });
  });
});
