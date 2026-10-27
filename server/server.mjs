import { createReadStream } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { randomInt, randomUUID } from "node:crypto";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { CLUE_COUNT, dailyPuzzleFor, gameDateAt, isCorrectGuess, scoreForClues } from "./game.mjs";
import { puzzles, topics } from "./puzzles.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = resolve(projectRoot, "public");
const gameRounds = new Map();
const MAX_BODY_BYTES = 4096;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      const error = new Error("O pedido excede o tamanho permitido.");
      error.status = 413;
      throw error;
    }
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("O corpo do pedido não contém JSON válido.");
    error.status = 400;
    throw error;
  }
}

function createRound(puzzle, mode, gameDate = null) {
  const roundId = randomUUID();
  const round = { roundId, puzzle, mode, gameDate, cluesRevealed: 0, attempts: 0, solved: false };
  gameRounds.set(roundId, round);
  if (gameRounds.size > 10_000) {
    const oldestId = gameRounds.keys().next().value;
    gameRounds.delete(oldestId);
  }
  return round;
}

function roundSummary(round) {
  return {
    roundId: round.roundId,
    mode: round.mode,
    topic: topics.find(({ id }) => id === round.puzzle.topicId),
    cluesRevealed: round.cluesRevealed,
    attempts: round.attempts,
    solved: round.solved,
    ...(round.solved ? { answer: round.puzzle.answer } : {})
  };
}

function dailyMetadata() {
  const gameDate = gameDateAt();
  const puzzle = dailyPuzzleFor(gameDate);
  const topic = topics.find(({ id }) => id === puzzle.topicId);
  return {
    gameDate,
    topic,
    clueCount: CLUE_COUNT,
    pointsPerClue: 25
  };
}

async function handleApi(request, response, url) {
  const { pathname } = url;
  if (request.method === "GET" && pathname === "/api/v1/daily") {
    sendJson(response, 200, dailyMetadata());
    return true;
  }

  if (request.method === "POST" && pathname === "/api/v1/daily/rounds") {
    const body = await readJson(request);
    const current = typeof body.roundId === "string" ? gameRounds.get(body.roundId) : null;
    const gameDate = gameDateAt();
    if (current?.mode === "daily" && current.gameDate === gameDate) {
      sendJson(response, 200, roundSummary(current));
      return true;
    }
    const round = createRound(dailyPuzzleFor(gameDate), "daily", gameDate);
    sendJson(response, 201, roundSummary(round));
    return true;
  }

  if (request.method === "GET" && pathname === "/api/v1/practice/topics") {
    sendJson(response, 200, { topics });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/v1/health") {
    sendJson(response, 200, { status: "ok" });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/v1/practice/rounds") {
    const body = await readJson(request);
    const topicId = body.topicId;
    if (typeof topicId !== "string" || !Object.hasOwn(puzzles, topicId)) {
      sendJson(response, 400, { error: { code: "INVALID_TOPIC", message: "Escolha um tema válido." } });
      return true;
    }
    const puzzle = { ...puzzles[topicId][randomInt(puzzles[topicId].length)], topicId };
    const round = createRound(puzzle, "practice");
    sendJson(response, 201, roundSummary(round));
    return true;
  }

  const clueMatch = /^\/api\/v1\/rounds\/([a-f0-9-]+)\/clues$/.exec(pathname);
  if (request.method === "POST" && clueMatch) {
    const body = await readJson(request);
    const round = gameRounds.get(clueMatch[1]);
    const expectedIndex = body.expectedClueIndex;
    if (!round) {
      sendJson(response, 404, { error: { code: "ROUND_NOT_FOUND", message: "Esta partida não está mais disponível." } });
      return true;
    }
    if (round.mode === "daily" && round.gameDate !== gameDateAt()) {
      sendJson(response, 409, { error: { code: "DAILY_ROUND_EXPIRED", message: "O desafio diário encerrou. Atualize a página para jogar o desafio de hoje." } });
      return true;
    }
    if (!Number.isInteger(expectedIndex) || expectedIndex < 0 || expectedIndex >= CLUE_COUNT) {
      sendJson(response, 400, { error: { code: "INVALID_CLUE_INDEX", message: "Não há mais pistas para revelar." } });
      return true;
    }
    if (expectedIndex < round.cluesRevealed) {
      sendJson(response, 200, {
        clueIndex: expectedIndex + 1,
        text: round.puzzle.clues[expectedIndex],
        cluesRevealed: round.cluesRevealed,
        score: scoreForClues(round.cluesRevealed)
      });
      return true;
    }
    if (round.solved) {
      sendJson(response, 409, { error: { code: "ROUND_ALREADY_SOLVED", message: "Essa palavra já foi descoberta." } });
      return true;
    }
    if (expectedIndex !== round.cluesRevealed) {
      sendJson(response, 409, { error: { code: "CLUE_OUT_OF_ORDER", message: "Revele as pistas na ordem indicada." } });
      return true;
    }
    round.cluesRevealed += 1;
    sendJson(response, 200, {
      clueIndex: expectedIndex + 1,
      text: round.puzzle.clues[expectedIndex],
      cluesRevealed: round.cluesRevealed,
      score: scoreForClues(round.cluesRevealed)
    });
    return true;
  }

  const guessMatch = /^\/api\/v1\/rounds\/([a-f0-9-]+)\/guesses$/.exec(pathname);
  if (request.method === "POST" && guessMatch) {
    const body = await readJson(request);
    const round = gameRounds.get(guessMatch[1]);
    if (!round) {
      sendJson(response, 404, { error: { code: "ROUND_NOT_FOUND", message: "Esta partida não está mais disponível." } });
      return true;
    }
    if (round.mode === "daily" && round.gameDate !== gameDateAt()) {
      sendJson(response, 409, { error: { code: "DAILY_ROUND_EXPIRED", message: "O desafio diário encerrou. Atualize a página para jogar o desafio de hoje." } });
      return true;
    }
    if (round.solved) {
      sendJson(response, 409, { error: { code: "ROUND_ALREADY_SOLVED", message: "Essa palavra já foi descoberta." } });
      return true;
    }
    if (typeof body.guess !== "string" || !body.guess.trim() || body.guess.length > 80) {
      sendJson(response, 400, { error: { code: "INVALID_GUESS", message: "Digite um palpite com até 80 caracteres." } });
      return true;
    }
    round.attempts += 1;
    const correct = isCorrectGuess(round.puzzle, body.guess);
    if (correct) round.solved = true;
    sendJson(response, 200, correct
      ? { correct: true, answer: round.puzzle.answer, attempts: round.attempts }
      : { correct: false, attempts: round.attempts });
    return true;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Este recurso não existe." } });
    return true;
  }
  return false;
}

async function serveStatic(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  let requestedPath;
  try {
    requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }
  const filePath = resolve(publicRoot, `.${requestedPath}`);
  if (!filePath.startsWith(`${publicRoot}${sep}`) && filePath !== publicRoot) {
    response.writeHead(403);
    response.end();
    return;
  }
  const extension = extname(filePath);
  if (!MIME_TYPES[extension]) {
    response.writeHead(404);
    response.end();
    return;
  }
  try {
    const stream = createReadStream(filePath);
    stream.on("open", () => {
      response.writeHead(200, {
        "Content-Type": MIME_TYPES[extension],
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"
      });
      if (request.method === "HEAD") {
        stream.destroy();
        response.end();
      } else {
        stream.pipe(response);
      }
    });
    stream.on("error", () => {
      if (!response.headersSent) {
        response.writeHead(404);
        response.end();
      } else {
        response.destroy();
      }
    });
  } catch {
    response.writeHead(404);
    response.end();
  }
}

export function createGameServer() {
  return createHttpServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    try {
      const isApi = await handleApi(request, response, url);
      if (!isApi && !response.writableEnded) await serveStatic(request, response, url);
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      sendJson(response, error.status ?? 500, {
        error: {
          code: error.status ? "INVALID_REQUEST" : "INTERNAL_ERROR",
          message: error.status ? error.message : "Ocorreu um erro ao processar o pedido."
        }
      });
    }
  });
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  const port = Number(process.env.PORT ?? 3000);
  const server = createGameServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`pista disponível em http://localhost:${port}`);
  });
}
