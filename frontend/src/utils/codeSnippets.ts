export type TypingMode = 'words' | 'javascript' | 'python' | 'json' | 'sql' | 'zen';

export const CODE_SNIPPETS: Record<'javascript' | 'python' | 'json' | 'sql', string[]> = {
  javascript: [
    `const fetchUserData = async (userId) => { const res = await fetch(\`/api/users/\${userId}\`); if (!res.ok) throw new Error("Not found"); return await res.json(); };`,
    `function debounce(fn, ms) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); }; }`,
    `const numbers = [12, 45, 67, 89, 23]; const evens = numbers.filter(n => n % 2 === 0).map(n => n * 2); console.log(evens.reduce((a, b) => a + b, 0));`,
    `export interface UserSession { id: string; token: string; expiresAt: number; roles: string[]; }`,
    `const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]); useEffect(() => { window.addEventListener("resize", handleResize); return () => window.removeEventListener("resize", handleResize); }, []);`
  ],
  python: [
    `def calculate_fibonacci(n: int) -> list[int]: sequence = [0, 1] while len(sequence) < n: sequence.append(sequence[-1] + sequence[-2]) return sequence[:n]`,
    `class DatabaseConnection: def __init__(self, uri: str): self.uri = uri self.connected = False def connect(self): self.connected = True return self`,
    `import json with open("config.json", "r", encoding="utf-8") as f: data = json.load(f) total = sum(item.get("score", 0) for item in data.values())`,
    `def binary_search(arr: list[int], target: int) -> int: low, high = 0, len(arr) - 1 while low <= high: mid = (low + high) // 2 if arr[mid] == target: return mid elif arr[mid] < target: low = mid + 1 else: high = mid - 1 return -1`,
    `async def get_metrics(session, endpoint: str): async with session.get(endpoint) as response: return await response.json()`
  ],
  json: [
    `{ "name": "typeblitz", "version": "2.0.0", "private": true, "dependencies": { "react": "^19.0.0", "vite": "^6.0.0" }, "scripts": { "dev": "vite", "build": "vite build" } }`,
    `{ "status": "success", "code": 200, "data": { "user": { "id": "usr_9918", "username": "speeddemon", "rank": 1, "wpm": 142.5 } } }`,
    `{ "query": "SELECT * FROM typists", "params": { "min_wpm": 80, "limit": 25 }, "cached": true, "latency_ms": 14.8 }`,
    `{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler", "strict": true, "jsx": "react-jsx" } }`
  ],
  sql: [
    `SELECT u.id, u.username, MAX(r.wpm) AS pb_wpm, AVG(r.accuracy) AS avg_accuracy FROM users u INNER JOIN results r ON u.id = r.user_id GROUP BY u.id, u.username ORDER BY pb_wpm DESC LIMIT 10;`,
    `INSERT INTO leaderboard (user_id, wpm, raw_wpm, accuracy, created_at) VALUES ('usr_101', 118, 124, 98.5, NOW()) ON CONFLICT (user_id) DO UPDATE SET wpm = EXCLUDED.wpm;`,
    `CREATE INDEX idx_results_user_wpm ON results (user_id, wpm DESC); ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;`,
    `UPDATE user_preferences SET theme = 'midnight-cyber', sound_profile = 'cream-linear', volume = 0.6 WHERE user_id = 'usr_101';`
  ]
};

export function getRandomCodeWords(mode: 'javascript' | 'python' | 'json' | 'sql'): string[] {
  const snippets = CODE_SNIPPETS[mode];
  const snippet = snippets[Math.floor(Math.random() * snippets.length)];
  return snippet.trim().split(/\s+/).filter(Boolean);
}
