"""
Kisan Assistant LLM chat service.

Uses Groq's free, OpenAI-compatible API (no purchase, no credit card). The
key lives ONLY here on the backend — never in the frontend bundle. If no key
is configured (or the call fails), we raise so the route can return a graceful
offline fallback instead of crashing.
"""

import logging
from typing import List, Optional

import httpx

from app.config import settings
from app.schemas import ChatMessage

logger = logging.getLogger(__name__)

GROQ_CHAT_URL = f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions"

SYSTEM_PROMPT_EN = (
    "You are the Kisan Assistant for AgriConnect, a friendly farm advisor for "
    "Indian farmers. Answer clearly and concisely in simple English, using short "
    "paragraphs or bullets where useful. Cover Indian farming topics: mandi and "
    "crop prices, government schemes (PM Kisan, PMFBY crop insurance, Kisan Credit "
    "Card, MSP), sowing and seasons (Kharif/Rabi), seeds, fertilizers and urea, pest "
    "and disease control, irrigation, soil testing, weather, organic farming, "
    "post-harvest storage, selling produce (including on AgriConnect), delivery/"
    "logistics, and dairy or livestock. If a question is off-topic or unsafe, "
    "politely say you only answer farming questions. If you are not sure, say so and "
    "suggest contacting their local Krishi Vigyan Kendra (KVK) or state agriculture "
    "helpline."
)

SYSTEM_PROMPT_HI = (
    "आप एग्रीकनेक्ट के 'किसान सहायक' हैं, भारतीय किसानों के लिए एक मददगार कृषि सलाहकार। "
    "स्पष्ट और संक्षिप्त, सरल हिंदी में उत्तर दें, जहाँ ज़रूरी लगे वहाँ छोटे पैराग्राफ या बुलेट उपयोग करें। "
    "भारतीय कृषि विषयों को कवर करें: मंडी और फसल भाव, सरकारी योजनाएँ (पीएम किसान, पीएमएफबीवाई फसल "
    "बीमा, किसान क्रेडिट कार्ड, एमएसपी), बुवाई और मौसम (खरीफ/रबी), बीज, खाद और यूरिया, कीट और रोग "
    "नियंत्रण, सिंचाई, मिट्टी परीक्षण, मौसम, जैविक खेती, कटाई के बाद भंडारण, फसल बेचना (एग्रीकनेक्ट पर "
    "भी), डिलीवरी/लॉजिस्टिक्स, और पशुपालन। यदि प्रश्न विषय से बाहर या असुरक्षित हो, तो विनम्रता से कहें "
    "कि आप केवल कृषि के प्रश्नों का उत्तर देते हैं। यदि निश्चित न हों, तो ऐसा कहें और सुझाव दें कि वे "
    "अपने स्थानीय कृषि विज्ञान केंद्र (केवीके) या राज्य कृषि हेल्पलाइन से संपर्क करें।"
)

# Friendly message used when the LLM cannot be reached (offline / key missing).
FALLBACK_EN = (
    "I couldn't reach my AI backend right now, so I can only guide you on the "
    "topics I already know well (PM Kisan, crop insurance, mandi prices, pests, "
    "selling on AgriConnect…). Please try a more specific question — or try again "
    "in a moment."
)
FALLBACK_HI = (
    "अभी मैं अपने AI बैकएंड तक नहीं पहुँच पा रहा हूँ, इसलिए केवल उन विषयों पर मार्गदर्शन कर सकता हूँ "
    "जिन्हें मैं पहले से अच्छी तरह जानता हूँ (पीएम किसान, फसल बीमा, मंडी भाव, कीट, एग्रीकनेक्ट पर बिक्री…)। "
    "कृपया कोई और स्पष्ट प्रश्न पूछें — या थोड़ी देर बाद फिर कोशिश करें।"
)


class ChatterError(Exception):
    """Raised when the LLM is unavailable (missing key, network, provider error)."""


def ask_llm(query: str, language: str = "en", history: Optional[List[ChatMessage]] = None) -> str:
    """Ask the Groq LLM a farming question and return the assistant's reply.

    Raises ChatterError if a reply cannot be produced, so the caller can return
    a graceful offline fallback.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise ChatterError("GROQ_API_KEY is not set in ai-service/.env")

    system = SYSTEM_PROMPT_HI if language == "hi" else SYSTEM_PROMPT_EN

    messages: List[dict] = [{"role": "system", "content": system}]
    # Optional recent conversation turns (oldest to newest) to give context.
    if history:
        messages.extend(
            {"role": m.role, "content": m.content}
            for m in history[-8:]
            if m.role in ("user", "assistant")
        )
    messages.append({"role": "user", "content": query})

    try:
        resp = httpx.post(
            GROQ_CHAT_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": settings.LLM_MODEL,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 400,
            },
            timeout=30.0,
        )
    except httpx.HTTPError as exc:  # network / connection failures
        logger.warning("Groq request failed: %s", exc)
        raise ChatterError(str(exc)) from exc

    if resp.status_code != 200:
        logger.warning("Groq returned %s: %s", resp.status_code, resp.text[:300])
        raise ChatterError(f"Groq HTTP {resp.status_code}")

    try:
        return resp.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ChatterError(f"Unexpected Groq payload: {exc}") from exc


def fallback_reply(language: str = "en") -> str:
    """Canned reply when the LLM is unavailable."""
    return FALLBACK_HI if language == "hi" else FALLBACK_EN