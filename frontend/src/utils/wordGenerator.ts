export const COMMON_WORDS = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for",
  "they", "I", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you",
  "do", "but", "from", "or", "which", "one", "would", "all", "will", "there",
  "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other",
  "so", "what", "time", "up", "go", "about", "than", "into", "could", "state",
  "only", "new", "year", "some", "take", "come", "these", "know", "see", "use",
  "get", "like", "then", "first", "any", "work", "now", "may", "such", "give",
  "over", "think", "most", "even", "find", "day", "also", "after", "way", "many",
  "must", "look", "before", "great", "back", "through", "long", "where", "much",
  "should", "well", "people", "down", "own", "just", "because", "good", "each",
  "those", "feel", "seem", "how", "high", "too", "place", "little", "world",
  "very", "still", "nation", "hand", "old", "life", "tell", "write", "become",
  "here", "show", "house", "both", "between", "need", "mean", "call", "develop",
  "under", "last", "right", "move", "thing", "general", "school", "never", "same",
  "another", "begin", "while", "number", "part", "turn", "real", "leave", "might",
  "want", "point", "form", "off", "child", "few", "small", "since", "against",
  "ask", "late", "home", "interest", "large", "person", "end", "open", "public",
  "follow", "during", "present", "without", "again", "hold", "govern", "around",
  "possible", "head", "consider", "word", "program", "problem", "however", "lead",
  "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact", "group",
  "play", "stand", "increase", "early", "course", "change", "help", "line"
];

/**
 * Generates an array of random words from the common words list.
 * @param count - The number of words to generate.
 * @param options - Optional flags for punctuation and numbers.
 * @returns An array of randomly selected words.
 */
export function generateWords(count: number, options?: { punctuation?: boolean, numbers?: boolean }): string[] {
  const result: string[] = [];
  const punctuationMarks = [".", ",", "!", "?", ";", ":"];
  
  for (let i = 0; i < count; i++) {
    let word = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
    
    // 10% chance to replace with a number if enabled
    if (options?.numbers && Math.random() < 0.1) {
      word = Math.floor(Math.random() * 1000).toString();
    }
    
    // Add punctuation if enabled (15% chance)
    if (options?.punctuation && Math.random() < 0.15) {
      const mark = punctuationMarks[Math.floor(Math.random() * punctuationMarks.length)];
      word += mark;
    }
    
    // Randomly capitalize if punctuation is on (simulate sentences)
    if (options?.punctuation && Math.random() < 0.1) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    result.push(word);
  }
  return result;
}
