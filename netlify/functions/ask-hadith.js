exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { question, languageCode, context } = body;

    if (!question || typeof question !== "string") {
      return jsonResponse(400, { error: "Missing question" });
    }

    const relatedHadiths = Array.isArray(context) ? context.slice(0, 6) : [];

    if (!process.env.GROQ_API_KEY) {
      return jsonResponse(500, {
        error: "Missing GROQ_API_KEY environment variable"
      });
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

    const contextText = relatedHadiths.length
      ? relatedHadiths.map((item, index) => {
          return [
            `Hadith ${index + 1}:`,
            item.text,
            `Reference: ${item.reference}`,
            `Grade: ${item.grade}`,
            `Collection: ${item.editionName}`
          ].join("\n");
        }).join("\n\n")
      : "No related hadith context was found in retrieval.";

    const systemPrompt = [
      "You are a careful Islamic hadith assistant.",
      "Only answer using the hadith context provided by the app.",
      "Do not invent hadith, chains, grades, scholars, or references.",
      "If the context is weak or insufficient, say so clearly.",
      `Reply in ${answerLanguage}.`,
      "Keep the structure simple:",
      "1. Short answer",
      "2. Relevant hadith(s)",
      "3. Practical takeaway",
      "Avoid giving fatwa-style certainty."
    ].join(" ");

    const userPrompt = [
      `User question: ${question}`,
      "",
      "Retrieved hadith context:",
      contextText,
      "",
      "Answer using only this retrieved context. If no context is enough, say that clearly and ask the user to try a simpler keyword."
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
        temperature: 0.2,
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
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
}
