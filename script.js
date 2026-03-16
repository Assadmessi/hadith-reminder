const generateBtn = document.getElementById("generateBtn");
const result = document.getElementById("result");
const statusText = document.getElementById("status");
const hadithText = document.getElementById("hadithText");
const referenceText = document.getElementById("reference");
const gradeText = document.getElementById("grade");

const API_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1";
const API_EDITIONS = [
  "eng-abudawud",
  "eng-ibnmajah",
  "eng-nasai"
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

const hadithCache = {};

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function showResult({ text, reference, grade, sourceMessage }) {
  result.classList.remove("hidden");
  statusText.textContent = sourceMessage || "Your reminder";
  hadithText.textContent = text || "No reminder found.";
  referenceText.textContent = reference ? `Reference: ${reference}` : "";
  gradeText.textContent = grade ? `Grade: ${grade}` : "";
}

function normalizeHadithFromApi(data, editionName) {
  const hadith = Array.isArray(data?.hadiths) ? data.hadiths[0] : data?.hadith || data;

  if (!hadith || !hadith.text) {
    return null;
  }

  const grade = Array.isArray(hadith.grades) && hadith.grades.length
    ? hadith.grades.map(item => item.grade).filter(Boolean).join(" | ")
    : "Not provided";

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

  return {
    text: hadith.text,
    reference,
    grade,
    sourceMessage: "Your reminder"
  };
}

async function fetchJsonWithFallback(urlBase) {
  const urls = [`${urlBase}.min.json`, `${urlBase}.json`];

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.json();
    } catch (error) {
      // try the next format
    }
  }

  throw new Error("Failed to fetch JSON");
}

async function fetchRandomHadithFromEdition(editionName) {
  if (!hadithCache[editionName]) {
    const editionData = await fetchJsonWithFallback(`${API_BASE}/editions/${editionName}`);
    const list = Array.isArray(editionData?.hadiths) ? editionData.hadiths.filter(item => item?.text) : [];

    if (!list.length) {
      throw new Error("Edition has no readable hadiths");
    }

    hadithCache[editionName] = list;
  }

  const hadith = randomItem(hadithCache[editionName]);

  return normalizeHadithFromApi({ hadiths: [hadith] }, editionName);
}

async function getHadithReminder() {
  generateBtn.disabled = true;
  result.classList.remove("hidden");
  statusText.textContent = "Loading hadith reminder...";
  hadithText.textContent = "";
  referenceText.textContent = "";
  gradeText.textContent = "";

  try {
    const edition = randomItem(API_EDITIONS);
    const reminder = await fetchRandomHadithFromEdition(edition);

    if (!reminder) {
      throw new Error("No valid hadith returned");
    }

    showResult(reminder);
  } catch (error) {
    const fallback = randomItem(fallbackHadiths);
    showResult({
      text: fallback.text,
      reference: fallback.reference,
      grade: fallback.grade,
      sourceMessage: "API unavailable, showing offline reminder instead."
    });
  } finally {
    generateBtn.disabled = false;
  }
}

generateBtn.addEventListener("click", getHadithReminder);
