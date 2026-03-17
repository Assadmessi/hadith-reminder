exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

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
      "Only answer from the hadith context provided by the app.",
      "Do not invent hadith, scholars, grades, rulings, or references.",
      "Do not pretend certainty when the evidence is not clear.",
      "The user often wants a practical answer like: yes, no, avoid, recommended, or unclear.",
      "You may infer a practical answer only from the provided hadith context.",
      "If the context is not enough for a clear ruling, say 'Unclear from these hadith alone'.",
      `Reply in ${answerLanguage}.`,
      "Use this exact structure:",
      "Verdict: one short line only. Use one of these labels -> Yes, No, Better to avoid, Recommended, Discouraged, Unclear from these hadith alone.",
      "Reason: 2-4 short sentences explaining why, based only on the hadith context.",
      "Evidence: quote or paraphrase the most relevant hadith and include its reference.",
      "What to do: give 1-3 practical next steps.",
      "If the user asks whether something is halal or haram and the hadith context alone does not clearly establish that, do not say halal or haram. Use 'Unclear from these hadith alone' instead."
    ].join(" ");

    const userPrompt = [
      `User question: ${question}`,
      "",
      "Retrieved hadith context:",
      contextText,
      "",
      "Give a practical answer. The first line must begin with 'Verdict:'.",
      "If the question is about whether the user can do something, make the verdict explicit instead of only summarizing the hadith.",
      "Never answer from general knowledge outside the provided hadith context."
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
        temperature: 0.15,
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
