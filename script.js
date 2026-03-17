const languageSelect = document.getElementById("languageSelect");
const randomBtn = document.getElementById("randomBtn");
const statusSection = document.getElementById("statusSection");
const statusText = document.getElementById("status");
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

function hideStatus() {
  statusSection.classList.add("hidden");
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
    if (parts.length) reference += ` — ${parts.join(", ")}`;
  } else if (hadith.reference) {
    reference += ` — ${hadith.reference}`;
  } else if (hadith.book?.bookNumber != null || hadith.hadithNumber != null) {
    const parts = [];
    if (hadith.book?.bookNumber != null) parts.push(`Book ${hadith.book.bookNumber}`);
    if (hadith.hadithNumber != null) parts.push(`Hadith ${hadith.hadithNumber}`);
    if (parts.length) reference += ` — ${parts.join(", ")}`;
  }

  return reference;
}

function getHadithText(hadith) {
  return (
    hadith.hadithEnglish ||
    hadith.hadithArabic ||
    hadith.text ||
    hadith.body ||
    hadith.content ||
    "No hadith text available."
  );
}

function getGrade(hadith) {
  return hadith.grade || hadith.status || "Grade not provided";
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

async function loadEdition(edition) {
  if (editionCache[edition]) {
    return editionCache[edition];
  }

  const response = await fetch(`${API_BASE}/editions/${edition}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load edition ${edition}`);
  }

  const data = await response.json();
  const collection = data?.hadiths?.data || data?.hadiths || data?.data || [];
  editionCache[edition] = Array.isArray(collection) ? collection : [];
  return editionCache[edition];
}

function showRandomHadith(hadith, editionName) {
  hadithText.textContent = getHadithText(hadith);
  referenceText.textContent = `Reference: ${buildReference(editionName, hadith)}`;
  gradeText.textContent = `Grade: ${getGrade(hadith)}`;
  randomResultSection.classList.remove("hidden");
}

function showFallbackRandomHadith() {
  const hadith = randomItem(fallbackHadiths);
  showRandomHadith(hadith, "Offline fallback");
  showStatus("Showing offline fallback hadith.");
}

async function generateRandomHadith() {
  clearRandomResult();
  setBusyState(true);
  showStatus("Loading random hadith...");

  try {
    const selectedLanguage = LANGUAGES.find(item => item.code === languageSelect.value);
    const editions = selectedLanguage?.editions?.length
      ? selectedLanguage.editions
      : RANDOM_EDITIONS;

    const edition = randomItem(editions);
    const hadiths = await loadEdition(edition);

    if (!hadiths.length) {
      throw new Error("No hadiths found in the selected edition.");
    }

    const hadith = randomItem(hadiths);
    showRandomHadith(hadith, edition);
    showStatus("Random hadith loaded.");
  } catch (error) {
    console.error(error);
    showFallbackRandomHadith();
  } finally {
    setBusyState(false);
  }
}

populateLanguages();
randomBtn.addEventListener("click", generateRandomHadith);
generateRandomHadith();
