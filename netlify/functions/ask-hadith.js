exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { mode, languageCode, hadith } = body;

    if (mode !== "random_reflection") {
      return jsonResponse(400, { error: "Unsupported mode" });
    }

    if (!hadith || typeof hadith.text !== "string" || !hadith.text.trim()) {
      return jsonResponse(400, { error: "Missing hadith text" });
    }

    if (!process.env.GROQ_API_KEY) {
      return jsonResponse(500, { error: "Missing GROQ_API_KEY environment variable" });
    }

    const supportedLanguageMap = {
      eng: "English",
      ara: "Arabic",
      urd: "Urdu",
      ben: "Bengali",
      fra: "French",
      ind: "Indonesian",
      tur: "Turkish",
      rus: "Russian"
    };

    const answerLanguage = supportedLanguageMap[languageCode] || "English";

    const systemPrompt = [
      "You are a careful Islamic hadith reminder assistant.",
      "Only use the hadith provided by the app.",
      "Do not invent hadith, scholars, rulings, or references.",
      "Do not say halal or haram unless the hadith text itself clearly says that.",
      `Reply in ${answerLanguage}.`,
      "Write a short helpful reminder in this format:",
      "Main lesson: one short sentence.",
      "Reflection: 2 to 4 short sentences explaining the lesson from the hadith.",
      "Action today: 1 short practical step.",
      "Keep it simple, warm, and grounded in the hadith only."
    ].join(" ");

    const userPrompt = [
      "Use this hadith only:",
      hadith.text,
      `Reference: ${hadith.reference || "Not provided"}`,
      `Grade: ${hadith.grade || "Not provided"}`,
      `Collection: ${hadith.editionName || "Not provided"}`
    ].join("\n");

    const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse(response.status, {
        error: data?.error?.message || "Groq request failed"
      });
    }

    const answer = data?.choices?.[0]?.message?.content?.trim();

    return jsonResponse(200, {
      answer: answer || "No answer returned."
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error.message || "Unexpected server error"
    });
  }
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(body)
  };
}
