/**
 * Kisan Assistant LLM chat service.
 *
 * Talk to the FastAPI ai-service `/chat` endpoint, which in turn calls Groq
 * (free LLM). The Groq API key lives ONLY on the backend — it is never exposed
 * here in the frontend bundle. If the ai-service is unreachable, we reject so
 * the chatbot can fall back to its offline KB reply.
 */

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

export async function chatRequest(query, language = 'en') {
  const res = await fetch(`${AI_SERVICE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, language }),
  });

  if (!res.ok) {
    throw new Error(`Chat endpoint returned status ${res.status}`);
  }

  const data = await res.json();
  return data.reply;
}

export default chatRequest;