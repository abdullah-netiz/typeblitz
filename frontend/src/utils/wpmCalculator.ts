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
  const timeElapsedMs = Math.max(0, endTime - startTime);

  // If the test ended in under 1.5 seconds or typed fewer than 3 characters, rate is zero
  if (timeElapsedMs < 1500 || typedCharacters < 3) {
    const accuracy = typedCharacters > 0
      ? Math.max(0, Math.min(100, Math.round(((typedCharacters - errors) / typedCharacters) * 100)))
      : 100;
    return { wpm: 0, rawWpm: 0, accuracy };
  }

  const timeElapsedInMinutes = timeElapsedMs / 60000;

  // Raw WPM: (Total Keystrokes / 5) / Time (mins) - clamped to realistic bounds
  const rawWpm = Math.min(300, Math.round((typedCharacters / 5) / timeElapsedInMinutes));

  // Net WPM: (Total Keystrokes - Errors) / 5 / Time (mins)
  const wpm = Math.min(
    300,
    Math.max(0, Math.round(((typedCharacters - errors) / 5) / timeElapsedInMinutes))
  );

  // Accuracy: Correct Characters / Total Typed Characters
  const correctCharacters = Math.max(0, typedCharacters - errors);
  const accuracy = Math.round((correctCharacters / typedCharacters) * 100);

  return { wpm, rawWpm, accuracy };
}
