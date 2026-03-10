/**
 * Calculates typing statistics based on raw inputs.
 *
 * @param typedCharacters - Total characters typed (including spaces)
 * @param errors - Number of incorrectly typed characters/errors made
 * @param startTime - The timestamp when typing started (in ms)
 * @param endTime - The timestamp when typing ended or current time (in ms)
 * @returns Object containing `wpm` (net WPM), `rawWpm`, and `accuracy` (percentage).
 */
export function calculateWPM(
  typedCharacters: number,
  errors: number,
  startTime: number,
  endTime: number
): { wpm: number; rawWpm: number; accuracy: number } {
  const timeElapsedInMinutes = (endTime - startTime) / 60000;

  if (timeElapsedInMinutes <= 0 || typedCharacters === 0) {
    return { wpm: 0, rawWpm: 0, accuracy: 100 };
  }

  // Raw WPM: (Total Keystrokes / 5) / Time (mins)
  const rawWpm = Math.round(typedCharacters / 5 / timeElapsedInMinutes);

  // Net WPM: (Total Keystrokes - Errors) / 5 / Time (mins)
  // We make sure net WPM doesn't drop below 0.
  const wpm = Math.max(
    0,
    Math.round((typedCharacters - errors) / 5 / timeElapsedInMinutes)
  );

  // Accuracy: Correct Characters / Total Typed Characters
  // Note: this represents raw character accuracy.
  const correctCharacters = Math.max(0, typedCharacters - errors);
  const accuracy = Math.round((correctCharacters / typedCharacters) * 100);

  return { wpm, rawWpm, accuracy };
}
