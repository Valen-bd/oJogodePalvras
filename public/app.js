const DAILY_STORAGE_PREFIX = "pista:v1:daily:";
const STATS_STORAGE_KEY = "pista:v1:stats";
const DEFAULT_STATS = {
  dailyWins: 0,
  bestDailyScore: null,
  dailyPointsTotal: 0,
  playedDays: [],
  practicePlayed: 0,
  practiceWins: 0,
  practicePointsTotal: 0
};

const elements = Object.fromEntries([
  "daily-mode", "practice-mode", "topic-stamp", "practice-picker", "topic-select",
  "new-practice", "puzzle-title", "round-count", "puzzle-prompt", "score-value",
  "score-track", "clue-list", "clue-empty", "hint-button", "hint-label", "hint-cost",
  "guess-form", "guess-input", "submit-button", "game-feedback", "guess-history",
  "date-day", "date-month", "stat-wins", "stat-best", "stat-points", "stat-days",
  "practice-played", "practice-wins", "practice-points", "share-button", "share-note"
].map((id) => [id, document.getElementById(id)]));

let dailyMetadata;
let dailyRound;
let practiceRound;
let activeMode = "daily";
let stats = loadStats();
let busy = false;

function loadStats() {
  const saved = readJson(STATS_STORAGE_KEY, DEFAULT_STATS);
  return {
    dailyWins: Number.isSafeInteger(saved.dailyWins) && saved.dailyWins >= 0 ? saved.dailyWins : 0,
    bestDailyScore: Number.isSafeInteger(saved.bestDailyScore) && saved.bestDailyScore >= 0 && saved.bestDailyScore <= 100
      ? saved.bestDailyScore
      : null,
    dailyPointsTotal: Number.isSafeInteger(saved.dailyPointsTotal) && saved.dailyPointsTotal >= 0 ? saved.dailyPointsTotal : 0,
    playedDays: Array.isArray(saved.playedDays)
      ? [...new Set(saved.playedDays.filter((day) => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort()
      : [],
    practicePlayed: Number.isSafeInteger(saved.practicePlayed) && saved.practicePlayed >= 0 ? saved.practicePlayed : 0,
    practiceWins: Number.isSafeInteger(saved.practiceWins) && saved.practiceWins >= 0 ? saved.practiceWins : 0,
    practicePointsTotal: Number.isSafeInteger(saved.practicePointsTotal) && saved.practicePointsTotal >= 0 ? saved.practicePointsTotal : 0
  };
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return structuredClone(fallback);
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : structuredClone(fallback);
  } catch {
    setFeedback("O progresso salvo não pôde ser lido. Você ainda pode jogar; ele ficará só nesta sessão.", "error");
    return structuredClone(fallback);
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    setFeedback("Não foi possível salvar neste navegador. A partida continua disponível enquanto esta página estiver aberta.", "error");
    return false;
  }
}

function setFeedback(message, kind = "") {
  elements["game-feedback"].textContent = message;
  elements["game-feedback"].dataset.kind = kind;
}

function currentRound() {
  return activeMode === "daily" ? dailyRound : practiceRound;
}

function requestJson(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  }).then(async (response) => {
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(body?.error?.message || "Não foi possível completar essa ação.");
      error.code = body?.error?.code;
      error.status = response.status;
      throw error;
    }
    return body;
  });
}

function updateStats() {
  elements["stat-wins"].textContent = String(stats.dailyWins);
  elements["stat-best"].textContent = stats.bestDailyScore === null ? "—" : `${stats.bestDailyScore} pts`;
  elements["stat-points"].textContent = String(stats.dailyPointsTotal);
  elements["stat-days"].textContent = String(stats.playedDays.length);
  elements["practice-played"].textContent = String(stats.practicePlayed);
  elements["practice-wins"].textContent = String(stats.practiceWins);
  elements["practice-points"].textContent = String(stats.practicePointsTotal);
}

function persistActiveRound() {
  if (activeMode === "daily" && dailyRound) {
    saveJson(`${DAILY_STORAGE_PREFIX}${dailyMetadata.gameDate}`, dailyRound);
  }
  saveJson(STATS_STORAGE_KEY, stats);
  updateStats();
}

function markRoundStarted(round) {
  if (round.started) return;
  round.started = true;
  if (activeMode === "daily") {
    markDailyPlayed();
  } else {
    stats.practicePlayed += 1;
  }
}

function markDailyPlayed() {
  if (!stats.playedDays.includes(dailyMetadata.gameDate)) {
    stats.playedDays.push(dailyMetadata.gameDate);
    stats.playedDays.sort();
  }
}

function render() {
  const round = currentRound();
  if (!round) return;

  elements["daily-mode"].setAttribute("aria-pressed", String(activeMode === "daily"));
  elements["practice-mode"].setAttribute("aria-pressed", String(activeMode === "practice"));
  elements["practice-picker"].hidden = activeMode !== "practice";
  elements["topic-stamp"].hidden = activeMode === "practice";
  elements["puzzle-title"].textContent = activeMode === "daily" ? "A palavra de hoje" : "Uma palavra para descobrir";
  elements["round-count"].textContent = activeMode === "daily" ? "DESAFIO DO DIA" : "RODADA DE PRÁTICA";
  elements["puzzle-prompt"].textContent = activeMode === "daily"
    ? "Uma resposta, quatro pistas possíveis. Você escolhe quando pedir ajuda."
    : "Mais palavras, no seu ritmo. Errar faz parte: tente quantas vezes quiser.";
  elements["score-value"].textContent = String(Math.max(0, 100 - round.clueCount * 25));
  elements["score-track"].querySelectorAll("span").forEach((segment, index) => {
    segment.classList.toggle("on", index < 4 - round.clueCount);
  });

  elements["clue-list"].replaceChildren(...round.clues.map((text, index) => {
    const item = document.createElement("li");
    const number = document.createElement("span");
    const clue = document.createElement("span");
    number.className = "clue-number";
    number.textContent = `0${index + 1}`;
    clue.textContent = text;
    item.append(number, clue);
    return item;
  }));
  elements["clue-empty"].hidden = round.clues.length > 0;
  const cluesFinished = round.clueCount === 4;
  elements["hint-button"].disabled = busy || round.solved || cluesFinished;
  elements["topic-select"].disabled = busy;
  elements["new-practice"].disabled = busy;
  elements["daily-mode"].disabled = busy;
  elements["practice-mode"].disabled = busy;
  elements["hint-label"].textContent = cluesFinished ? "Todas as pistas reveladas" : `Revelar pista ${round.clueCount + 1}`;
  elements["hint-cost"].textContent = cluesFinished ? "Agora é só chutar — você consegue!" : "Cada pista custa 25 pontos";
  elements["guess-input"].disabled = busy || round.solved;
  elements["submit-button"].disabled = busy || round.solved;
  elements["guess-input"].placeholder = round.solved ? "Palavra descoberta!" : "Qual é a palavra?";
  elements["guess-history"].replaceChildren();
  if (round.guesses.length) {
    const label = document.createElement("span");
    label.className = "guess-history-label";
    label.textContent = "Já tentou:";
    elements["guess-history"].append(label);
    for (const guess of round.guesses) {
      const chip = document.createElement("span");
      chip.className = "guess-chip";
      chip.textContent = guess;
      elements["guess-history"].append(chip);
    }
  }
  elements["share-button"].disabled = activeMode !== "daily" || busy;
  elements["share-note"].textContent = activeMode === "daily"
    ? "A palavra fica só com você; compartilhamos apenas seu resultado."
    : "O compartilhamento do desafio diário fica disponível no modo diário.";
  updateStats();
}

async function revealClue() {
  const round = currentRound();
  if (!round || busy || round.solved || round.clueCount >= 4) return;
  busy = true;
  render();
  try {
    const clue = await requestJson(`/api/v1/rounds/${encodeURIComponent(round.roundId)}/clues`, {
      method: "POST",
      body: JSON.stringify({ expectedClueIndex: round.clueCount })
    });
    round.clues.push(clue.text);
    round.clueCount = clue.cluesRevealed;
    markRoundStarted(round);
    persistActiveRound();
    setFeedback(round.clueCount === 4
      ? "Última pista revelada. Seus palpites continuam valendo — mesmo com zero pontos."
      : `Pista revelada! A resposta ainda pode valer ${clue.score} pontos.`);
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    busy = false;
    render();
  }
}

async function submitGuess(event) {
  event.preventDefault();
  const round = currentRound();
  const guess = elements["guess-input"].value.trim();
  if (!round || busy || round.solved || !guess) return;
  busy = true;
  render();
  try {
    const result = await requestJson(`/api/v1/rounds/${encodeURIComponent(round.roundId)}/guesses`, {
      method: "POST",
      body: JSON.stringify({ guess })
    });
    round.attempts = result.attempts;
    markRoundStarted(round);
    if (result.correct) {
      round.solved = true;
      round.answer = result.answer;
      if (activeMode === "daily") {
        stats.dailyWins += 1;
        const points = 100 - round.clueCount * 25;
        stats.bestDailyScore = stats.bestDailyScore === null ? points : Math.max(stats.bestDailyScore, points);
        stats.dailyPointsTotal += points;
      } else {
        stats.practiceWins += 1;
        stats.practicePointsTotal += 100 - round.clueCount * 25;
      }
      setFeedback(`Acertou! A palavra era ${result.answer}. Você fez ${100 - round.clueCount * 25} pontos. Boa!`, "good");
    } else {
      round.guesses.push(guess);
      setFeedback("Ainda não — tente outra palavra. Seus palpites são ilimitados.", "bad");
    }
    elements["guess-input"].value = "";
    persistActiveRound();
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    busy = false;
    render();
  }
}

async function startPractice(topicId = elements["topic-select"].value) {
  if (busy) return;
  const current = practiceRound;
  if (current && !current.solved && (current.clueCount > 0 || current.guesses.length > 0)) {
    if (!window.confirm("Esta partida ainda não foi concluída. Quer começar outra mesmo assim?")) {
      elements["topic-select"].value = current.topic.id;
      return;
    }
  }
  busy = true;
  render();
  try {
    const next = await requestJson("/api/v1/practice/rounds", {
      method: "POST",
      body: JSON.stringify({ topicId })
    });
    practiceRound = {
      roundId: next.roundId,
      topic: next.topic,
      clues: [],
      clueCount: 0,
      guesses: [],
      attempts: 0,
      solved: next.solved,
      answer: next.answer,
      started: false
    };
    elements["topic-select"].value = next.topic.id;
    setFeedback("Palavra nova na mesa. Pode começar!");
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    busy = false;
    render();
  }
}

function activateMode(mode) {
  if (busy) return;
  if (mode === "practice" && !practiceRound) {
    activeMode = "practice";
    elements["practice-picker"].hidden = false;
    elements["topic-stamp"].hidden = true;
    void startPractice();
    return;
  }
  activeMode = mode;
  if (mode === "daily") {
    setFeedback(dailyRound.solved
      ? "Desafio do dia concluído. Até amanhã — ou bora praticar?"
      : "Pode chutar quantas vezes quiser. Sem pressa :)");
  } else {
    setFeedback("Prática livre: escolha uma pista quando quiser.");
  }
  render();
}

async function shareDailyResult() {
  if (!dailyRound || activeMode !== "daily") return;
  const clueGrid = `${"🟩".repeat(dailyRound.clueCount)}${"⬜".repeat(4 - dailyRound.clueCount)}`;
  const result = dailyRound.solved
    ? `pista. — Desafio do dia (${dailyMetadata.gameDate}): acertei em ${100 - dailyRound.clueCount * 25} pontos e ${dailyRound.attempts} tentativas!\n${clueGrid}\n${window.location.origin}`
    : `pista. — Desafio do dia (${dailyMetadata.gameDate}): já pedi ${dailyRound.clueCount} de 4 pistas.\n${clueGrid}\n${window.location.origin}`;
  const shareData = { title: "pista — uma palavra por vez", text: result };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(result);
      setFeedback("Resultado copiado! Pode compartilhar sem entregar a palavra.", "good");
    } else {
      const field = document.createElement("textarea");
      field.value = result;
      field.setAttribute("readonly", "");
      field.className = "share-fallback";
      document.body.append(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      if (!copied) throw new Error("Não foi possível copiar automaticamente. Selecione e copie o resultado exibido.");
      setFeedback("Resultado copiado! Pode compartilhar sem entregar a palavra.", "good");
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    setFeedback(error.message || "Não foi possível compartilhar agora. Tente novamente.", "error");
  }
}

function renderGameDate(gameDate) {
  const date = new Date(`${gameDate}T12:00:00-03:00`);
  elements["date-day"].textContent = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(date);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "America/Sao_Paulo"
  }).format(date);
  const monthYear = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo"
  }).format(date);
  elements["date-month"].textContent = `${weekday} · ${monthYear}`;
}

async function initialize() {
  elements["guess-form"].addEventListener("submit", submitGuess);
  elements["hint-button"].addEventListener("click", revealClue);
  elements["daily-mode"].addEventListener("click", () => activateMode("daily"));
  elements["practice-mode"].addEventListener("click", () => activateMode("practice"));
  elements["new-practice"].addEventListener("click", () => startPractice());
  elements["topic-select"].addEventListener("change", (event) => startPractice(event.target.value));
  elements["share-button"].addEventListener("click", shareDailyResult);

  try {
    dailyMetadata = await requestJson("/api/v1/daily");
    const saved = readJson(`${DAILY_STORAGE_PREFIX}${dailyMetadata.gameDate}`, null);
    const serverRound = await requestJson("/api/v1/daily/rounds", {
      method: "POST",
      body: JSON.stringify({ roundId: saved?.roundId })
    });
    const matchesSavedRound = saved?.roundId === serverRound.roundId;
    const savedClues = matchesSavedRound && Array.isArray(saved.clues) ? saved.clues.slice(0, 4) : [];
    const clues = savedClues.length === serverRound.cluesRevealed
      ? savedClues
      : await Promise.all(Array.from({ length: serverRound.cluesRevealed }, async (_, index) => {
          const clue = await requestJson(`/api/v1/rounds/${encodeURIComponent(serverRound.roundId)}/clues`, {
            method: "POST",
            body: JSON.stringify({ expectedClueIndex: index })
          });
          return clue.text;
        }));
    dailyRound = {
      roundId: serverRound.roundId,
      topic: serverRound.topic,
      clues,
      clueCount: serverRound.cluesRevealed,
      guesses: matchesSavedRound && Array.isArray(saved.guesses)
        ? saved.guesses.filter((guess) => typeof guess === "string").slice(0, 100)
        : [],
      attempts: serverRound.attempts,
      solved: serverRound.solved,
      answer: serverRound.answer ?? (matchesSavedRound && typeof saved.answer === "string" ? saved.answer : undefined),
      started: serverRound.cluesRevealed > 0 || serverRound.attempts > 0 || serverRound.solved
    };
    elements["topic-stamp"].textContent = `Tema de hoje · ${dailyMetadata.topic.label}`;
    elements["topic-stamp"].hidden = false;
    renderGameDate(dailyMetadata.gameDate);
    elements["topic-select"].disabled = false;
    elements["new-practice"].disabled = false;
    elements["guess-input"].disabled = Boolean(dailyRound.solved);
    elements["submit-button"].disabled = Boolean(dailyRound.solved);
    elements["hint-button"].disabled = Boolean(dailyRound.solved);
    setFeedback(dailyRound.solved
      ? `Você já descobriu a palavra: ${dailyRound.answer ?? "desafio concluído"}.`
      : "Pode chutar quantas vezes quiser. Sem pressa :)",
    dailyRound.solved ? "good" : "");
    render();
  } catch (error) {
    setFeedback(`Não foi possível carregar o desafio: ${error.message} Atualize a página para tentar novamente.`, "error");
    elements["daily-mode"].disabled = true;
    elements["practice-mode"].disabled = true;
  }
}

async function refreshDailyChallenge() {
  if (busy || !dailyMetadata) return;
  try {
    const latest = await requestJson("/api/v1/daily");
    if (latest.gameDate === dailyMetadata.gameDate) return;
    const saved = readJson(`${DAILY_STORAGE_PREFIX}${latest.gameDate}`, null);
    const serverRound = await requestJson("/api/v1/daily/rounds", {
      method: "POST",
      body: JSON.stringify({ roundId: saved?.roundId })
    });
    dailyMetadata = latest;
    dailyRound = {
      roundId: serverRound.roundId,
      topic: serverRound.topic,
      clues: [],
      clueCount: serverRound.cluesRevealed,
      guesses: [],
      attempts: serverRound.attempts,
      solved: serverRound.solved,
      answer: serverRound.answer,
      started: serverRound.cluesRevealed > 0 || serverRound.attempts > 0 || serverRound.solved
    };
    elements["topic-stamp"].textContent = `Tema de hoje · ${latest.topic.label}`;
    renderGameDate(latest.gameDate);
    if (activeMode === "daily") {
      setFeedback("O desafio diário mudou. Uma nova palavra está esperando por você.");
      render();
    }
    saveJson(`${DAILY_STORAGE_PREFIX}${latest.gameDate}`, dailyRound);
  } catch (error) {
    setFeedback(`Não foi possível confirmar o desafio atual: ${error.message}`, "error");
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshDailyChallenge();
});
window.addEventListener("pageshow", () => void refreshDailyChallenge());

void initialize();
