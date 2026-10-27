import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../server/server.mjs";
import { dailyPuzzleFor, gameDateAt, isCorrectGuess, normalizeAnswer, scoreForClues } from "../server/game.mjs";

async function postJson(origin, path, body) {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return { response, body: await response.json() };
}

async function startTestServer(context) {
  const server = createGameServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test("normalizes case, accents and repeated whitespace without removing meaningful separators", () => {
  assert.equal(normalizeAnswer("  PÃO   DE queijo "), "pao de queijo");
  assert.equal(normalizeAnswer("CORAÇÃO"), "coracao");
  assert.equal(normalizeAnswer("guarda-chuva"), "guarda-chuva");
  assert.notEqual(normalizeAnswer("guarda chuva"), normalizeAnswer("guarda-chuva"));
  assert.equal(isCorrectGuess({ answer: "pão de queijo" }, "Pao  de QUEIJO"), true);
  assert.equal(isCorrectGuess({ answer: "pão de queijo", aliases: ["pao de queijo"] }, "PÃO DE QUEIJO"), true);
  assert.equal(isCorrectGuess({ answer: "pão de queijo" }, "pao-de-queijo"), false);
});

test("scores all clue counts and clamps at zero", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(scoreForClues), [100, 75, 50, 25, 0, 0]);
});

test("uses the Sao Paulo calendar date for the daily puzzle", () => {
  assert.equal(gameDateAt(new Date("2026-10-13T02:59:59.000Z")), "2026-10-12");
  assert.equal(gameDateAt(new Date("2026-10-13T03:00:00.000Z")), "2026-10-13");
  assert.equal(gameDateAt(new Date("2026-10-14T02:59:59.000Z")), "2026-10-13");
  assert.equal(gameDateAt(new Date("2026-10-14T03:00:00.000Z")), "2026-10-14");
  assert.equal(dailyPuzzleFor("2026-10-13").clues.length, 4);
});

test("daily and practice APIs reveal clues incrementally and only return the answer after a correct guess", async (context) => {
  const origin = await startTestServer(context);

  const health = await fetch(`${origin}/api/v1/health`);
  assert.deepEqual(await health.json(), { status: "ok" });

  const dailyResponse = await fetch(`${origin}/api/v1/daily`);
  const daily = await dailyResponse.json();
  const dailyPuzzle = dailyPuzzleFor(daily.gameDate);
  assert.equal(dailyResponse.status, 200);
  assert.equal("answer" in daily, false);
  assert.equal("clues" in daily, false);

  const { response: dailyRoundResponse, body: dailyRound } = await postJson(origin, "/api/v1/daily/rounds", {});
  assert.equal(dailyRoundResponse.status, 201);
  assert.equal("answer" in dailyRound, false);
  const roundPath = `/api/v1/rounds/${dailyRound.roundId}`;

  const skippedClue = await postJson(origin, `${roundPath}/clues`, { expectedClueIndex: 1 });
  assert.equal(skippedClue.response.status, 409);
  assert.equal(skippedClue.body.error.code, "CLUE_OUT_OF_ORDER");

  const firstClue = await postJson(origin, `${roundPath}/clues`, { expectedClueIndex: 0 });
  assert.equal(firstClue.body.text, dailyPuzzle.clues[0]);
  assert.equal(firstClue.body.score, 75);
  const repeatedClue = await postJson(origin, `${roundPath}/clues`, { expectedClueIndex: 0 });
  assert.equal(repeatedClue.body.cluesRevealed, 1);
  assert.equal(repeatedClue.body.score, 75);

  for (let expectedClueIndex = 1; expectedClueIndex < 4; expectedClueIndex += 1) {
    const clue = await postJson(origin, `${roundPath}/clues`, { expectedClueIndex });
    assert.equal(clue.response.status, 200);
    assert.equal(clue.body.text, dailyPuzzle.clues[expectedClueIndex]);
    assert.equal(clue.body.score, scoreForClues(expectedClueIndex + 1));
  }
  const wrongGuess = await postJson(origin, `${roundPath}/guesses`, { guess: "resposta errada" });
  assert.deepEqual(wrongGuess.body, { correct: false, attempts: 1 });
  const correctGuess = await postJson(origin, `${roundPath}/guesses`, {
    guess: dailyPuzzle.answer.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase()
  });
  assert.equal(correctGuess.body.correct, true);
  assert.equal(correctGuess.body.answer, dailyPuzzle.answer);
  assert.equal(correctGuess.body.attempts, 2);
  const afterWin = await postJson(origin, `${roundPath}/guesses`, { guess: dailyPuzzle.answer });
  assert.equal(afterWin.response.status, 409);
  assert.equal(afterWin.body.error.code, "ROUND_ALREADY_SOLVED");

  const restoredRound = await postJson(origin, "/api/v1/daily/rounds", { roundId: dailyRound.roundId });
  assert.equal(restoredRound.body.roundId, dailyRound.roundId);
  assert.equal(restoredRound.body.solved, true);
  assert.equal(restoredRound.body.attempts, 2);
  assert.equal(restoredRound.body.answer, dailyPuzzle.answer);

  const practiceResult = await postJson(origin, "/api/v1/practice/rounds", { topicId: "comida" });
  const practice = practiceResult.body;
  assert.equal(practiceResult.response.status, 201);
  assert.equal(practice.topic.id, "comida");
  assert.equal("answer" in practice, false);

  const unknownTopic = await postJson(origin, "/api/v1/practice/rounds", { topicId: "inexistente" });
  assert.equal(unknownTopic.response.status, 400);
});

test("serves the client but does not expose server-side puzzle source files", async (context) => {
  const origin = await startTestServer(context);

  const home = await fetch(origin);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Uma palavra/);
  assert.match(home.headers.get("content-type"), /text\/html/);
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
  const privateSource = await fetch(`${origin}/server/puzzles.mjs`);
  assert.equal(privateSource.status, 404);
  const traversedSource = await fetch(`${origin}/..%2Fserver%2Fpuzzles.mjs`);
  assert.equal(traversedSource.status, 403);
  const head = await fetch(`${origin}/`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  const unsupportedMethod = await fetch(origin, { method: "POST" });
  assert.equal(unsupportedMethod.status, 405);
  assert.equal(unsupportedMethod.headers.get("allow"), "GET, HEAD");
});

test("lists topics and keeps daily metadata free of the answer and clues", async (context) => {
  const origin = await startTestServer(context);
  const topicsResponse = await fetch(`${origin}/api/v1/practice/topics`);
  const { topics } = await topicsResponse.json();
  assert.equal(topicsResponse.status, 200);
  assert.deepEqual(topics.map(({ id }) => id), [
    "comida",
    "animais",
    "objetos-do-cotidiano",
    "cultura-pop"
  ]);
  assert.ok(topics.every(({ label }) => typeof label === "string" && label.length > 0));

  const dailyResponse = await fetch(`${origin}/api/v1/daily`);
  const daily = await dailyResponse.json();
  assert.equal(dailyResponse.status, 200);
  assert.match(daily.gameDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(daily.clueCount, 4);
  assert.equal(daily.pointsPerClue, 25);
  assert.equal("answer" in daily, false);
  assert.equal("clues" in daily, false);
});

test("rejects malformed, oversized and invalid API requests with explicit errors", async (context) => {
  const origin = await startTestServer(context);
  const malformedJson = await fetch(`${origin}/api/v1/daily/rounds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });
  assert.equal(malformedJson.status, 400);
  assert.equal((await malformedJson.json()).error.code, "INVALID_REQUEST");

  const oversizedBody = await fetch(`${origin}/api/v1/daily/rounds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(5000) })
  });
  assert.equal(oversizedBody.status, 413);
  assert.equal((await oversizedBody.json()).error.code, "INVALID_REQUEST");

  const invalidTopic = await postJson(origin, "/api/v1/practice/rounds", { topicId: 7 });
  assert.equal(invalidTopic.response.status, 400);
  assert.equal(invalidTopic.body.error.code, "INVALID_TOPIC");
  const unknownEndpoint = await fetch(`${origin}/api/v1/not-found`);
  assert.equal(unknownEndpoint.status, 404);
  assert.equal((await unknownEndpoint.json()).error.code, "NOT_FOUND");

  const { body: round } = await postJson(origin, "/api/v1/daily/rounds", {});
  const roundPath = `/api/v1/rounds/${round.roundId}`;
  for (const expectedClueIndex of [-1, 4, "0"]) {
    const invalidClue = await postJson(origin, `${roundPath}/clues`, { expectedClueIndex });
    assert.equal(invalidClue.response.status, 400);
    assert.equal(invalidClue.body.error.code, "INVALID_CLUE_INDEX");
  }
  const missingRound = await postJson(origin, "/api/v1/rounds/00000000-0000-0000-0000-000000000000/guesses", {
    guess: "qualquer"
  });
  assert.equal(missingRound.response.status, 404);
  assert.equal(missingRound.body.error.code, "ROUND_NOT_FOUND");
});

test("validates guesses without consuming attempts and prevents actions after solving", async (context) => {
  const origin = await startTestServer(context);
  const daily = await (await fetch(`${origin}/api/v1/daily`)).json();
  const { body: round } = await postJson(origin, "/api/v1/daily/rounds", {});
  const roundPath = `/api/v1/rounds/${round.roundId}`;

  for (const guess of [undefined, "", "   ", "x".repeat(81), 42]) {
    const invalidGuess = await postJson(origin, `${roundPath}/guesses`, { guess });
    assert.equal(invalidGuess.response.status, 400);
    assert.equal(invalidGuess.body.error.code, "INVALID_GUESS");
  }

  const correctGuess = await postJson(origin, `${roundPath}/guesses`, {
    guess: dailyPuzzleFor(daily.gameDate).answer
  });
  assert.equal(correctGuess.response.status, 200);
  assert.equal(correctGuess.body.correct, true);
  assert.equal(correctGuess.body.attempts, 1);
  assert.equal("answer" in round, false);

  const anotherGuess = await postJson(origin, `${roundPath}/guesses`, { guess: "outro palpite" });
  assert.equal(anotherGuess.response.status, 409);
  assert.equal(anotherGuess.body.error.code, "ROUND_ALREADY_SOLVED");
  const clueAfterSolve = await postJson(origin, `${roundPath}/clues`, { expectedClueIndex: 0 });
  assert.equal(clueAfterSolve.response.status, 409);
  assert.equal(clueAfterSolve.body.error.code, "ROUND_ALREADY_SOLVED");
});

test("creates practice rounds without exposing puzzle data", async (context) => {
  const origin = await startTestServer(context);
  const { response, body } = await postJson(origin, "/api/v1/practice/rounds", { topicId: "comida" });
  assert.equal(response.status, 201);
  assert.equal(body.mode, "practice");
  assert.equal(body.topic.id, "comida");
  assert.equal("answer" in body, false);
  assert.equal("clues" in body, false);
});
