import { colourLines, type RainbowLine, type RainbowWord } from "./lib/rainbow";

export type { RainbowLine, RainbowWord };

/**
 * Splits each line into words and gives every word the next colour of the
 * rainbow, red to violet, carrying on across lines and wrapping after violet.
 * Each colour has a light-mode and a dark-mode shade. Every line and word
 * carries its position in the title, unique within it, for use as a key.
 */
export function rainbowLines(lines: readonly string[]): RainbowLine[] {
  return colourLines(lines);
}
