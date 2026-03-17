// Hadith Finder Script

// DOM elements
const queryInput = document.getElementById("queryInput");
const languageSelect = document.getElementById("languageSelect");
const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const statusSection = document.getElementById("statusSection");
const statusText = document.getElementById("status");
const searchResults = document.getElementById("searchResults");
const randomResultSection = document.getElementById("randomResult");
const hadithText = document.getElementById("hadithText");
const referenceText = document.getElementById("reference");
const gradeText = document.getElementById("grade");

// Constants
// Base URL for Fawaz Ahmed's Hadith API datasets
const API_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1";

// Editions used when fetching a random hadith (English)
const RANDOM_EDITIONS = [
  "eng-abudawud",
  "eng-ibnmajah",
  "eng-nasai"
];

// Offline fallback hadiths in case remote API is unreachable
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

// Supported languages with their edition lists
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

// Caches for downloaded editions to avoid repeated network requests
const editionCache = {};

/**
 * Get a random element from an array.
 * @param {Array} array
 * @returns {*}
 */
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Show a status message to the user. This will reveal the status section
 * and update its text content.
 * @param {string} message
 */
function showStatus(message) {
  statusSection.classList.remove("hidden");
  statusText.textContent = message;
}

/**
 * Hide the status section.
 */
function hideStatus() {
  statusSection.classList.add("hidden");
}

/**
 * Clear previously rendered search results.
 */
function clearSearchResults() {
  searchResults.innerHTML = "";
  searchResults.classList.add("hidden");
}

/**
 * Render search results as a list of blocks.
 * @param {Array<{text: string, reference: string, grade: string}>} results
 */
function renderSearchResults(results) {
  searchResults.innerHTML = "";
  results.forEach(item => {
    const div = document.createElement("div");
    div.className = "result-item";
    const blockquote = document.createElement("blockquote");
    blockquote.textContent = item.text;
    div.appendChild(blockquote);
    if (item.reference) {
      const ref = document.createElement("p");
      ref.className = "reference";
      ref.textContent = `Reference: ${item.reference}`;
      div.appendChild(ref);
    }
    if (item.grade) {
      const gr = document.createElement("p");
      gr.className = "grade";
      gr.textContent = `Grade: ${item.grade}`;
      div.appendChild(gr);
    }
    searchResults.appendChild(div);
  });
  searchResults.classList.remove("hidden");
}

/**
 * Fetch JSON data. Tries the minified version first and falls back to full JSON.
 * @param {string} urlBase
 * @returns {Promise<any>}
 */
async function fetchJsonWithFallback(urlBase) {
  const urls = [`${urlBase}.min.json`, `${urlBase}.json`];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.json();
    } catch (_err) {
      // ignore and try next
    }
  }
  throw new Error("Failed to fetch JSON");
}

/**
 * Load a hadith edition. Caches the result for future use.
 * @param {string} editionName
 * @returns {Promise<Array<{text: string, grades: any[], reference: any, hadithnumber: number}>>}
 */
async function loadEdition(editionName) {
  if (editionCache[editionName]) return editionCache[editionName];
  const data = await fetchJsonWithFallback(`${API_BASE}/editions/${editionName}`);
  const list = Array.isArray(data?.hadiths) ? data.hadiths.filter(item => item?.text) : [];
  editionCache[editionName] = list;
  return list;
}

/**
 * Search for hadiths within the editions of a specific language. The search is
 * performed by splitting the query into words and requiring that each word be
 * present in the hadith text. The search stops after finding up to 10 matches.
 * @param {string} query
 * @param {string} languageCode
 * @returns {Promise<Array<{text: string, reference: string, grade: string}>>}
 */
async function searchHadith(query, languageCode) {
  const language = LANGUAGES.find(l => l.code === languageCode);
  if (!language) return [];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];
  for (const editionName of language.editions) {
    const list = await loadEdition(editionName);
    for (const hadith of list) {
      if (!hadith.text) continue;
      const textLower = hadith.text.toLowerCase();
      // Check if all query words are contained
      if (words.every(w => textLower.includes(w))) {
        // derive grade
        const grade = Array.isArray(hadith.grades) && hadith.grades.length
          ? hadith.grades.map(item => item.grade).filter(Boolean).join(" | ")
          : "";
        // derive reference
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
        results.push({
          text: hadith.text,
          reference,
          grade
        });
        if (results.length >= 10) break;
      }
    }
    if (results.length >= 10) break;
  }
  return results;
}

/**
 * Perform a search based on user input and update the UI accordingly.
 */
async function performSearch() {
  const query = queryInput.value.trim();
  const languageCode = languageSelect.value;
  clearSearchResults();
  randomResultSection.classList.add("hidden");
  if (!query) {
    showStatus("Please enter a search query.");
    return;
  }
  showStatus("Searching…");
  try {
    // Perform a unified search across the selected language's editions.
    // For English and other languages, we use the dataset hosted on jsDelivr.
    const results = await searchHadith(query, languageCode);
    hideStatus();
    if (results && results.length) {
      renderSearchResults(results);
    } else {
      showStatus("No results found.");
    }
  } catch (error) {
    console.error(error);
    showStatus("An error occurred while searching. Please try again.");
  }
}

/**
 * Fetch and display a random hadith from the predefined English editions. If
 * network requests fail, show an offline fallback reminder.
 */
async function fetchRandomHadith() {
  // Hide search results when showing random
  clearSearchResults();
  searchResults.classList.add("hidden");
  randomResultSection.classList.remove("hidden");
  showStatus("Loading random hadith…");
  hadithText.textContent = "";
  referenceText.textContent = "";
  gradeText.textContent = "";
  try {
    const edition = randomItem(RANDOM_EDITIONS);
    const list = await loadEdition(edition);
    const hadith = randomItem(list);
    if (!hadith || !hadith.text) throw new Error("No hadith found");
    const grade = Array.isArray(hadith.grades) && hadith.grades.length
      ? hadith.grades.map(item => item.grade).filter(Boolean).join(" | ")
      : "Not provided";
    let reference = edition;
    if (hadith.reference && typeof hadith.reference === "object") {
      const parts = [];
      if (hadith.reference.book != null) parts.push(`Book ${hadith.reference.book}`);
      if (hadith.reference.hadith != null) parts.push(`Hadith ${hadith.reference.hadith}`);
      if (parts.length) reference = `${edition} — ${parts.join(", ")}`;
    } else if (hadith.reference) {
      reference = `${edition} — ${hadith.reference}`;
    } else if (hadith.hadithnumber != null) {
      reference = `${edition} — Hadith ${hadith.hadithnumber}`;
    }
    hadithText.textContent = hadith.text || "";
    referenceText.textContent = reference ? `Reference: ${reference}` : "";
    gradeText.textContent = grade ? `Grade: ${grade}` : "";
    statusText.textContent = "Random reminder";
  } catch (error) {
    // If remote fetch fails, fall back to offline reminders
    const fallback = randomItem(fallbackHadiths);
    hadithText.textContent = fallback.text;
    referenceText.textContent = `Reference: ${fallback.reference}`;
    gradeText.textContent = `Grade: ${fallback.grade}`;
    statusText.textContent = "Showing offline reminder";
  }
}

/**
 * Populate the language dropdown on page load.
 */
function populateLanguages() {
  languageSelect.innerHTML = "";
  LANGUAGES.forEach(lang => {
    const opt = document.createElement("option");
    opt.value = lang.code;
    opt.textContent = lang.name;
    languageSelect.appendChild(opt);
  });
  languageSelect.value = "eng";
}

// Initialize the app
populateLanguages();
searchBtn.addEventListener("click", performSearch);
randomBtn.addEventListener("click", fetchRandomHadith);