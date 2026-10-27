import { puzzles, topics } from "./puzzles.mjs";

export const POINTS_PER_CLUE = 25;
export const CLUE_COUNT = 4;
export const GAME_TIME_ZONE = "America/Sao_Paulo";

export function normalizeAnswer(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ");
}

export function scoreForClues(clueCount) {
  return Math.max(0, 100 - POINTS_PER_CLUE * clueCount);
}

export function gameDateAt(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GAME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dailyPuzzleFor(gameDate) {
  const dateNumber = Number(gameDate.replaceAll("-", ""));
  const pool = topics.flatMap(({ id }) => puzzles[id].map((puzzle) => ({ ...puzzle, topicId: id })));
  return pool[dateNumber % pool.length];
}

export function isCorrectGuess(puzzle, guess) {
  const normalizedGuess = normalizeAnswer(guess);
  return [puzzle.answer, ...(puzzle.aliases ?? [])]
    .some((answer) => normalizeAnswer(answer) === normalizedGuess);
}
