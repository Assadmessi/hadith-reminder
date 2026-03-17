# Hadith AI Finder

A static hadith app with:
- random real hadith reminders
- grounded hadith retrieval
- AI answers based on retrieved hadith context
- Netlify Functions backend so the API key stays hidden

## Setup

1. Push this project to GitHub.
2. Import it into Netlify.
3. Add environment variable:
   - `GROQ_API_KEY=your_free_groq_key`
4. Optional:
   - `GROQ_MODEL=openai/gpt-oss-20b`
5. Deploy.

## Local development

If you want to test functions locally:

```bash
npm install -g netlify-cli
netlify dev
```

## Notes

- Random hadith still works even if AI is down.
- AI answers are grounded by the top hadith matches passed into the function.
- Free tier AI services have rate limits.
