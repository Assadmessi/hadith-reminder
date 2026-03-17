# Hadith AI Reminder

A hadith app with:
- real random hadith generation
- AI reflection for each random hadith
- language support
- Netlify Functions backend so the API key stays hidden

## Setup

1. Push this project to GitHub.
2. Import it into Netlify.
3. Add environment variable:
   - `GROQ_API_KEY=your_free_groq_key`
4. Optional:
   - `GROQ_MODEL=openai/gpt-oss-20b`
5. Deploy.

## What changed

- Removed Ask AI about user situations
- Kept random hadith
- Added AI reflection for the random hadith only
