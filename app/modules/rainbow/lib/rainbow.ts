export type RainbowWord = { position: number; word: string; className: string };
export type RainbowLine = { position: number; words: RainbowWord[] };

const RAINBOW_CLASSES = [
  "text-red-600 dark:text-red-400",
  "text-orange-600 dark:text-orange-400",
  "text-yellow-500 dark:text-yellow-300",
  "text-green-600 dark:text-green-400",
  "text-blue-600 dark:text-blue-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-violet-600 dark:text-violet-400",
] as const;

export function colourLines(lines: readonly string[]): RainbowLine[] {
  let wordPosition = 0;
  return lines.map((line, linePosition) => ({
    position: linePosition,
    words: (line.match(/\S+/g) ?? []).map((word) => {
      const position = wordPosition++;
      const className = RAINBOW_CLASSES[position % RAINBOW_CLASSES.length];
      return { position, word, className };
    }),
  }));
}
