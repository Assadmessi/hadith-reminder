const languageSelect = document.getElementById("languageSelect");
const randomBtn = document.getElementById("randomBtn");
const statusSection = document.getElementById("statusSection");
const statusText = document.getElementById("status");
const aiSection = document.getElementById("aiSection");
const aiAnswer = document.getElementById("aiAnswer");
const randomResultSection = document.getElementById("randomResult");
const hadithText = document.getElementById("hadithText");
const referenceText = document.getElementById("reference");
const gradeText = document.getElementById("grade");

const API_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1";

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
  randomBtn.disabled = isBusy;
  languageSelect.disabled = isBusy;
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
    : (hadith.grade || hadith.status || "Not provided");
}

async function fetchJsonWithFallback(urlBase) {
  const urls = [`${urlBase}.min.json`, `${urlBase}.json`];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.json();
    } catch (_error) {}
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

function getSelectedLanguage() {
  return LANGUAGES.find(item => item.code === languageSelect.value) || LANGUAGES[0];
}

function showRandomHadith(hadith, editionName) {
  hadithText.textContent = hadith.text || "No hadith text available.";
  referenceText.textContent = `Reference: ${buildReference(editionName, hadith)}`;
  gradeText.textContent = `Grade: ${buildGrade(hadith)}`;
  randomResultSection.classList.remove("hidden");
}

function showFallbackRandomHadith() {
  const hadith = randomItem(fallbackHadiths);
  showRandomHadith(hadith, "Offline fallback");
  showStatus("Showing offline fallback hadith.");
  return {
    text: hadith.text,
    reference: hadith.reference,
    grade: hadith.grade,
    editionName: "Offline fallback"
  };
}

async function generateAiReflection(hadith) {
  try {
    showStatus("Generating AI reflection...");
    const response = await fetch("/.netlify/functions/ask-hadith", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "random_reflection",
        languageCode: languageSelect.value,
        hadith
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "AI reflection failed.");
    }

    aiAnswer.textContent = data?.answer || "No AI reflection returned.";
    aiSection.classList.remove("hidden");
    showStatus("Random hadith and AI reflection loaded.");
  } catch (error) {
    console.error(error);
    aiAnswer.textContent = "AI reflection is unavailable right now. The random hadith still works normally.";
    aiSection.classList.remove("hidden");
    showStatus("Random hadith loaded, but AI reflection is unavailable.");
  }
}

async function generateRandomHadith() {
  clearRandomResult();
  clearAiAnswer();
  setBusyState(true);
  showStatus("Loading random hadith...");

  try {
    const selectedLanguage = getSelectedLanguage();
    const editions = selectedLanguage.editions?.length ? selectedLanguage.editions : RANDOM_EDITIONS;
    const editionName = randomItem(editions);
    const hadiths = await loadEdition(editionName);

    if (!hadiths.length) {
      throw new Error("No hadiths found in this edition.");
    }

    const hadith = randomItem(hadiths);
    const hadithForAi = {
      text: hadith.text,
      reference: buildReference(editionName, hadith),
      grade: buildGrade(hadith),
      editionName
    };

    showRandomHadith(hadith, editionName);
    await generateAiReflection(hadithForAi);
  } catch (error) {
    console.error(error);
    const hadithForAi = showFallbackRandomHadith();
    await generateAiReflection(hadithForAi);
  } finally {
    setBusyState(false);
  }
}

function populateLanguages() {
  languageSelect.innerHTML = "";
  LANGUAGES.forEach(language => {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = language.name;
    languageSelect.appendChild(option);
  });
  languageSelect.value = "eng";
}

populateLanguages();
randomBtn.addEventListener("click", generateRandomHadith);
generateRandomHadith();
