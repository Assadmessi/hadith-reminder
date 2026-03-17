const queryInput = document.getElementById("queryInput");
const languageSelect = document.getElementById("languageSelect");
const answerMode = document.getElementById("answerMode");
const askBtn = document.getElementById("askBtn");
const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const statusSection = document.getElementById("statusSection");
const statusText = document.getElementById("status");
const aiSection = document.getElementById("aiSection");
const aiAnswer = document.getElementById("aiAnswer");
const searchResults = document.getElementById("searchResults");
const randomResultSection = document.getElementById("randomResult");
const hadithText = document.getElementById("hadithText");
const referenceText = document.getElementById("reference");
const gradeText = document.getElementById("grade");

const API_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1";
const MAX_CONTEXT_RESULTS = 6;

const RANDOM_EDITIONS = [
  "eng-abudawud",
  "eng-ibnmajah",
  "eng-nasai",
  "eng-bukhari",
  "eng-muslim",
  "eng-tirmidhi"
];

const fallbackHadiths = [
  {
    text: "Actions are judged by intentions, and every person will have what they intended.",
    reference: "Sahih al-Bukhari 1 / Sahih Muslim 1907",
    grade: "Sahih"
  },
  {
    text: "Allah is gentle and loves gentleness in all matters.",
    reference: "Sahih al-Bukhari 6927 / Sahih Muslim 2165",
    grade: "Sahih"
  },
  {
    text: "Whoever believes in Allah and the Last Day should speak good or remain silent.",
    reference: "Sahih al-Bukhari 6018 / Sahih Muslim 47",
    grade: "Sahih"
  },
  {
    text: "The most beloved deeds to Allah are those done regularly, even if they are small.",
    reference: "Sahih al-Bukhari 6464 / Sahih Muslim 783",
    grade: "Sahih"
  },
  {
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    reference: "Sahih al-Bukhari 13 / Sahih Muslim 45",
    grade: "Sahih"
  },
  {
    text: "The strong person is not the one who overcomes others by force, but the one who controls himself when angry.",
    reference: "Sahih al-Bukhari 6114 / Sahih Muslim 2609",
    grade: "Sahih"
  }
];

const LANGUAGES = [
  {
    code: "eng",
    name: "English",
    editions: [
      "eng-bukhari",
      "eng-muslim",
      "eng-abudawud",
      "eng-ibnmajah",
      "eng-nasai",
      "eng-tirmidhi"
    ]
  },
  {
    code: "ara",
    name: "Arabic",
    editions: ["ara-bukhari", "ara-muslim"]
  },
  {
    code: "urd",
    name: "Urdu",
    editions: ["urd-bukhari", "urd-muslim"]
  },
  {
    code: "ben",
    name: "Bengali",
    editions: ["ben-bukhari", "ben-muslim"]
  },
  {
    code: "fra",
    name: "French",
    editions: ["fra-bukhari", "fra-muslim"]
  },
  {
    code: "ind",
    name: "Indonesian",
    editions: ["ind-bukhari", "ind-muslim"]
  },
  {
    code: "tur",
    name: "Turkish",
    editions: ["tur-bukhari", "tur-muslim"]
  },
  {
    code: "rus",
    name: "Russian",
    editions: ["rus-bukhari", "rus-muslim"]
  }
];

const editionCache = {};

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function showStatus(message) {
  statusSection.classList.remove("hidden");
  statusText.textContent = message;
}

function hideStatus() {
  statusSection.classList.add("hidden");
}

function clearSearchResults() {
  searchResults.innerHTML = "";
  searchResults.classList.add("hidden");
}

function clearAiAnswer() {
  aiAnswer.textContent = "";
  aiSection.classList.add("hidden");
}

function clearRandomResult() {
  hadithText.textContent = "";
  referenceText.textContent = "";
  gradeText.textContent = "";
  randomResultSection.classList.add("hidden");
}

function setBusyState(isBusy) {
  askBtn.disabled = isBusy;
  searchBtn.disabled = isBusy;
  randomBtn.disabled = isBusy;
}

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const stopwords = new Set([
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "at", "for", "is", "are", "was", "were",
    "be", "been", "with", "that", "this", "it", "as", "by", "from", "i", "me", "my", "you", "your",
    "about", "what", "how", "when", "if", "am", "im", "so", "can", "do", "does", "did", "should",
    "want", "need", "have", "has", "had", "feel", "feeling"
  ]);

  return normalizeText(text)
    .split(" ")
    .filter(word => word && word.length > 1 && !stopwords.has(word));
}

function buildReference(editionName, hadith) {
  let reference = editionName;
  if (hadith.reference && typeof hadith.reference === "object") {
    const parts = [];
    if (hadith.reference.book != null) parts.push(`Book ${hadith.reference.book}`);
    if (hadith.reference.hadith != null) parts.push(`Hadith ${hadith.reference.hadith}`);
    if (parts.length) reference = `${editionName} — ${parts.join(", ")}`;
  } else if (hadith.reference) {
    reference = `${editionName} — ${hadith.reference}`;
  } else if (hadith.hadithnumber != null) {
    reference = `${editionName} — Hadith ${hadith.hadithnumber}`;
  }
  return reference;
}

function buildGrade(hadith) {
  return Array.isArray(hadith.grades) && hadith.grades.length
    ? hadith.grades.map(item => item.grade).filter(Boolean).join(" | ")
    : "Not provided";
}

function renderSearchResults(results, heading = "Related hadith") {
  searchResults.innerHTML = `
    <div class="section-head">
      <h2>${heading}</h2>
      <p class="mini">Top grounded matches from the hadith collections.</p>
    </div>
  `;

  results.forEach(item => {
    const div = document.createElement("div");
    div.className = "result-item";

    const blockquote = document.createElement("blockquote");
    blockquote.textContent = item.text;
    div.appendChild(blockquote);

    const bookLine = document.createElement("p");
    bookLine.className = "bookline";
    bookLine.textContent = `Collection: ${item.editionName}`;
    div.appendChild(bookLine);

    const ref = document.createElement("p");
    ref.className = "reference";
    ref.textContent = `Reference: ${item.reference}`;
    div.appendChild(ref);

    const grade = document.createElement("p");
    grade.className = "grade";
    grade.textContent = `Grade: ${item.grade}`;
    div.appendChild(grade);

    if (typeof item.score === "number") {
      const score = document.createElement("p");
      score.className = "score";
      score.textContent = `Relevance score: ${item.score}`;
      div.appendChild(score);
    }

    searchResults.appendChild(div);
  });

  searchResults.classList.remove("hidden");
}

async function fetchJsonWithFallback(urlBase) {
  const urls = [`${urlBase}.min.json`, `${urlBase}.json`];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.json();
    } catch (_error) {
      // try next source
    }
  }
  throw new Error("Failed to fetch JSON");
}

async function loadEdition(editionName) {
  if (editionCache[editionName]) return editionCache[editionName];
  const data = await fetchJsonWithFallback(`${API_BASE}/editions/${editionName}`);
  const list = Array.isArray(data?.hadiths) ? data.hadiths.filter(item => item?.text) : [];
  editionCache[editionName] = list;
  return list;
}

function scoreHadith(question, hadithText) {
  const questionNorm = normalizeText(question);
  const hadithNorm = normalizeText(hadithText);
  const questionTokens = tokenize(question);
  const hadithTokens = tokenize(hadithText);
  const hadithSet = new Set(hadithTokens);

  let score = 0;

  for (const token of questionTokens) {
    if (hadithSet.has(token)) score += 5;
    if (hadithNorm.includes(token)) score += 2;
  }

  if (hadithNorm.includes(questionNorm) && questionNorm.length > 8) score += 25;

  const bigrams = [];
  for (let i = 0; i < questionTokens.length - 1; i += 1) {
    bigrams.push(`${questionTokens[i]} ${questionTokens[i + 1]}`);
  }

  for (const bigram of bigrams) {
    if (hadithNorm.includes(bigram)) score += 8;
  }

  if (/angry|anger/.test(questionNorm) && /anger|angry/.test(hadithNorm)) score += 12;
  if (/patience|sabr|patient/.test(questionNorm) && /patience|patient/.test(hadithNorm)) score += 12;
  if (/forgive|forgiveness/.test(questionNorm) && /forgive|forgiveness/.test(hadithNorm)) score += 12;
  if (/sad|grief|depressed|worry|anxious/.test(questionNorm) && /sad|grief|worry|hardship|affliction/.test(hadithNorm)) score += 12;
  if (/brother|sister|family|mother|father|parent/.test(questionNorm) && /brother|family|kinship|parent|mother|father/.test(hadithNorm)) score += 12;
  if (/marriage|wife|husband/.test(questionNorm) && /wife|husband|marriage/.test(hadithNorm)) score += 12;
  if (/money|debt|charity|wealth/.test(questionNorm) && /charity|wealth|debt|money/.test(hadithNorm)) score += 12;
  if (/pray|prayer|salah/.test(questionNorm) && /pray|prayer|salah/.test(hadithNorm)) score += 12;

  return score;
}

async function findRelevantHadiths(question, languageCode) {
  const language = LANGUAGES.find(item => item.code === languageCode);
  if (!language) return [];

  const matches = [];

  for (const editionName of language.editions) {
    const list = await loadEdition(editionName);

    for (const hadith of list) {
      if (!hadith.text) continue;
      const score = scoreHadith(question, hadith.text);
      if (score <= 0) continue;

      matches.push({
        text: hadith.text,
        reference: buildReference(editionName, hadith),
        grade: buildGrade(hadith),
        editionName,
        score
      });
    }
  }

  matches.sort((a, b) => b.score - a.score || a.text.length - b.text.length);

  const deduped = [];
  const seen = new Set();
  for (const item of matches) {
    const key = normalizeText(item.text).slice(0, 140);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    if (deduped.length >= MAX_CONTEXT_RESULTS) break;
  }

  return deduped;
}

function renderAiAnswer(text) {
  aiAnswer.textContent = text;
  aiSection.classList.remove("hidden");
}

function buildFallbackAdvice(question, relatedHadiths) {
  if (!relatedHadiths.length) {
    return `I could not find a strong AI answer right now, but you can still read the hadith results or try a simpler keyword search for: ${question}`;
  }

  const top = relatedHadiths[0];
  return [
    "AI is unavailable right now, so here is a grounded fallback.",
    "",
    "Best related hadith found:",
    top.text,
    "",
    `Reference: ${top.reference}`,
    `Grade: ${top.grade}`,
    "",
    "Read the related hadith cards below for more context."
  ].join("\n");
}

async function askAiAboutHadith(question, languageCode, relatedHadiths) {
  const response = await fetch("/.netlify/functions/ask-hadith", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question,
      languageCode,
      context: relatedHadiths
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "AI request failed");
  }

  return data?.answer || "No answer returned.";
}

async function performSearch() {
  const query = queryInput.value.trim();
  const languageCode = languageSelect.value;

  clearAiAnswer();
  clearRandomResult();
  clearSearchResults();

  if (!query) {
    showStatus("Please enter a question or keyword.");
    return;
  }

  setBusyState(true);
  showStatus("Searching hadith collections...");

  try {
    const results = await findRelevantHadiths(query, languageCode);

    if (!results.length) {
      showStatus("No related hadith found. Try simpler words like anger, patience, family, prayer, debt, or forgiveness.");
      return;
    }

    renderSearchResults(results);
    hideStatus();
  } catch (error) {
    console.error(error);
    showStatus("An error occurred while searching hadiths.");
  } finally {
    setBusyState(false);
  }
}

async function performAiAsk() {
  const question = queryInput.value.trim();
  const languageCode = languageSelect.value;

  clearAiAnswer();
  clearRandomResult();
  clearSearchResults();

  if (!question) {
    showStatus("Please enter your question first.");
    return;
  }

  setBusyState(true);
  showStatus("Finding related hadiths...");

  try {
    const relatedHadiths = await findRelevantHadiths(question, languageCode);

    if (relatedHadiths.length) {
      renderSearchResults(relatedHadiths);
    }

    if (answerMode.value === "search") {
      if (relatedHadiths.length) {
        hideStatus();
      } else {
        showStatus("No related hadith found.");
      }
      return;
    }

    showStatus("Generating AI answer from grounded hadith context...");

    try {
      const answer = await askAiAboutHadith(question, languageCode, relatedHadiths);
      renderAiAnswer(answer);
      hideStatus();
    } catch (aiError) {
      console.error(aiError);
      renderAiAnswer(buildFallbackAdvice(question, relatedHadiths));
      showStatus("AI is unavailable, so a grounded fallback answer is shown.");
    }
  } catch (error) {
    console.error(error);
    showStatus("An error occurred while building the answer.");
  } finally {
    setBusyState(false);
  }
}

async function fetchRandomHadith() {
  clearAiAnswer();
  clearSearchResults();
  randomResultSection.classList.remove("hidden");
  setBusyState(true);
  showStatus("Loading random hadith...");

  try {
    const edition = randomItem(RANDOM_EDITIONS);
    const list = await loadEdition(edition);
    const hadith = randomItem(list);
    if (!hadith || !hadith.text) throw new Error("No hadith found");

    hadithText.textContent = hadith.text;
    referenceText.textContent = `Reference: ${buildReference(edition, hadith)}`;
    gradeText.textContent = `Grade: ${buildGrade(hadith)}`;
    statusText.textContent = "Random reminder";
  } catch (error) {
    const fallback = randomItem(fallbackHadiths);
    hadithText.textContent = fallback.text;
    referenceText.textContent = `Reference: ${fallback.reference}`;
    gradeText.textContent = `Grade: ${fallback.grade}`;
    statusText.textContent = "Showing offline reminder";
  } finally {
    setBusyState(false);
  }
}

function populateLanguages() {
  languageSelect.innerHTML = "";
  LANGUAGES.forEach(lang => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = lang.name;
    languageSelect.appendChild(option);
  });
  languageSelect.value = "eng";
}

function handleEnterShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    performAiAsk();
  }
}

populateLanguages();
askBtn.addEventListener("click", performAiAsk);
searchBtn.addEventListener("click", performSearch);
randomBtn.addEventListener("click", fetchRandomHadith);
queryInput.addEventListener("keydown", handleEnterShortcut);
