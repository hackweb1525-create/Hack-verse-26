from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import uuid
import re
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Mongo
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
GEMINI_PROVIDER = "gemini"
GEMINI_MODEL = "gemini-2.5-flash"

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "te": "Telugu (తెలుగు)",
    "ta": "Tamil (தமிழ்)",
}

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def lang_name(code: str) -> str:
    return LANGUAGE_NAMES.get(code, "English")


def make_chat(session_id: str, system_message: str) -> LlmChat:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(GEMINI_PROVIDER, GEMINI_MODEL)
    return chat


def extract_json(text: str) -> dict:
    """Extract first JSON object from LLM text response."""
    # Strip code fences
    cleaned = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    # Find first { ... }
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        raise ValueError("No JSON found in response")
    return json.loads(match.group(0))


# ===== Models =====
class DiseaseDetectRequest(BaseModel):
    image_base64: str
    language: str = "en"


class FertilizerChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "en"


class CalculatorRequest(BaseModel):
    location: str
    land_size: float
    land_unit: str = "acres"
    season: Optional[str] = None
    soil_type: Optional[str] = None
    language: str = "en"


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"message": "AgriMind AI backend running", "model": GEMINI_MODEL}


@api_router.get("/languages")
async def languages():
    return [{"code": k, "name": v} for k, v in LANGUAGE_NAMES.items()]


# ----- Disease Detection -----
@api_router.post("/disease/detect")
async def disease_detect(req: DiseaseDetectRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")
    try:
        target_lang = lang_name(req.language)
        system = (
            "You are an expert agricultural plant pathologist helping Indian farmers. "
            "Analyze the provided plant/leaf image and identify any disease. "
            f"Respond ONLY in valid JSON. All text values must be in {target_lang}."
        )
        chat = make_chat(f"disease-{uuid.uuid4()}", system)
        prompt = (
            "Identify the plant disease (or pest) in this image. Return JSON exactly with these keys: "
            '{"disease":"<name>","plant":"<plant name>","confidence":"<low|medium|high>",'
            '"summary":"<2-3 sentences explaining the issue>",'
            '"steps":["<step 1>","<step 2>","<step 3>","<step 4>","<step 5>"],'
            '"organic_remedies":["<remedy 1>","<remedy 2>"],'
            '"youtube_query":"<short english search query for a how-to video>"}'
        )
        image = ImageContent(image_base64=req.image_base64)
        msg = UserMessage(text=prompt, file_contents=[image])
        raw = await chat.send_message(msg)
        data = extract_json(raw)

        # MOCKED YouTube lookup (no key provided)
        yt_query = data.get("youtube_query", "plant disease treatment")
        yt = mock_youtube_search(yt_query)
        data["video"] = yt

        return data
    except Exception as e:
        logger.exception("disease_detect failed")
        raise HTTPException(500, f"Disease detection failed: {e}")


# ----- Fertilizer Chat -----
class ChatMessageDoc(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str
    content: str
    language: str
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@api_router.post("/fertilizer/chat")
async def fertilizer_chat(req: FertilizerChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")
    try:
        target_lang = lang_name(req.language)
        system = (
            "You are AgriMind, an expert in ORGANIC and NON-PESTICIDE farming for Indian farmers. "
            "Provide practical, low-cost, traditional and scientific advice for organic fertilizers, "
            "compost, biopesticides, and crop care. Use simple words, short sentences, and step-by-step lists. "
            f"Always respond in {target_lang}."
        )
        chat = make_chat(req.session_id, system)
        reply = await chat.send_message(UserMessage(text=req.message))

        # Persist
        await db.chat_messages.insert_one(
            ChatMessageDoc(
                session_id=req.session_id,
                role="user",
                content=req.message,
                language=req.language,
            ).dict()
        )
        await db.chat_messages.insert_one(
            ChatMessageDoc(
                session_id=req.session_id,
                role="assistant",
                content=reply,
                language=req.language,
            ).dict()
        )

        return {"reply": reply, "session_id": req.session_id}
    except Exception as e:
        logger.exception("fertilizer_chat failed")
        raise HTTPException(500, f"Chat failed: {e}")


@api_router.get("/fertilizer/history/{session_id}")
async def fertilizer_history(session_id: str):
    docs = (
        await db.chat_messages.find(
            {"session_id": session_id}, {"_id": 0}
        )
        .sort("timestamp", 1)
        .to_list(500)
    )
    return docs


# ----- Smart Calculator -----
@api_router.post("/calculator/recommend")
async def calculator_recommend(req: CalculatorRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")
    try:
        target_lang = lang_name(req.language)
        month = datetime.now().strftime("%B")
        season = req.season or month
        soil = req.soil_type or "typical local soil"
        system = (
            "You are an expert Indian agronomist. Recommend the best crops for a farmer "
            "based on location, land size, season and soil. Use realistic Indian agriculture knowledge "
            f"(rabi/kharif, water needs, MSP, market demand). All text in {target_lang}. JSON only."
        )
        prompt = (
            f"Farmer context:\n"
            f"- Location: {req.location}\n"
            f"- Land size: {req.land_size} {req.land_unit}\n"
            f"- Season/Month: {season}\n"
            f"- Soil: {soil}\n\n"
            "Return JSON exactly: "
            '{"suggested":[{"crop":"<name>","reason":"<why this crop succeeds here>",'
            '"yield_estimate":"<short>","water_need":"<low|medium|high>"}],'
            '"rejected":[{"crop":"<name>","reason":"<why NOT — e.g., insufficient rainfall>"}],'
            '"general_tip":"<one short tip>"}\n'
            "Suggest 3 crops, reject 2 common but unsuitable crops."
        )
        chat = make_chat(f"calc-{uuid.uuid4()}", system)
        raw = await chat.send_message(UserMessage(text=prompt))
        return extract_json(raw)
    except Exception as e:
        logger.exception("calculator failed")
        raise HTTPException(500, f"Calculator failed: {e}")


# ----- Translate (used to dynamically translate UI texts / TTS output) -----
class TranslateRequest(BaseModel):
    text: str
    language: str = "en"


@api_router.post("/translate")
async def translate(req: TranslateRequest):
    if not EMERGENT_LLM_KEY or req.language == "en":
        return {"text": req.text}
    try:
        target_lang = lang_name(req.language)
        system = f"You are a translator. Translate the user message into {target_lang}. Output ONLY the translated text, nothing else."
        chat = make_chat(f"tr-{uuid.uuid4()}", system)
        out = await chat.send_message(UserMessage(text=req.text))
        return {"text": out.strip()}
    except Exception:
        return {"text": req.text}


# ===== MOCKED endpoints (clearly marked) =====
def mock_youtube_search(query: str) -> dict:
    """MOCKED — replace with real YouTube Data API v3 once key provided."""
    # Using known farming videos as fallback. Always returns something searchable.
    return {
        "_mocked": True,
        "query": query,
        "video_id": "Yc8CJSwwhzo",  # a real public farming video
        "title": f"How to treat: {query}",
        "url": f"https://www.youtube.com/watch?v=Yc8CJSwwhzo",
        "embed_url": f"https://www.youtube.com/embed/Yc8CJSwwhzo",
        "thumbnail": "https://img.youtube.com/vi/Yc8CJSwwhzo/hqdefault.jpg",
    }


@api_router.get("/youtube/search")
async def youtube_search(q: str):
    return mock_youtube_search(q)


@api_router.get("/weather")
async def weather(lat: float = 20.5937, lon: float = 78.9629, location: str = "India"):
    """MOCKED 5-day forecast — replace with OpenWeatherMap once API key is provided."""
    import random

    base_temp = 28
    icons = ["sun", "cloud", "cloud-rain", "cloud-sun", "cloudy"]
    days = []
    today = datetime.now()
    for i in range(5):
        d = today.timestamp() + i * 86400
        date = datetime.fromtimestamp(d).strftime("%a, %d %b")
        days.append(
            {
                "date": date,
                "temp_max": base_temp + random.randint(-2, 5),
                "temp_min": base_temp - random.randint(5, 10),
                "humidity": random.randint(50, 85),
                "rain_prob": random.randint(10, 90),
                "wind_kmh": random.randint(5, 20),
                "icon": random.choice(icons),
                "condition": random.choice(
                    ["Sunny", "Partly Cloudy", "Light Rain", "Cloudy", "Showers"]
                ),
            }
        )
    return {
        "_mocked": True,
        "location": location,
        "lat": lat,
        "lon": lon,
        "days": days,
    }


@api_router.get("/schemes")
async def schemes(language: str = "en"):
    """MOCKED list of latest Indian agriculture schemes (would use Google Custom Search live)."""
    base = [
        {
            "id": "pmkisan",
            "title": "PM-KISAN Samman Nidhi",
            "summary": "₹6,000 per year direct income support to all eligible farmer families in 3 instalments.",
            "url": "https://pmkisan.gov.in/",
            "tags": ["Income Support", "Central"],
        },
        {
            "id": "pmfby",
            "title": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "summary": "Crop insurance scheme covering pre-sowing to post-harvest losses at low premium.",
            "url": "https://pmfby.gov.in/",
            "tags": ["Insurance", "Central"],
        },
        {
            "id": "kcc",
            "title": "Kisan Credit Card (KCC)",
            "summary": "Short-term credit at concessional interest for cultivation, animal husbandry & fisheries.",
            "url": "https://www.myscheme.gov.in/schemes/kcc",
            "tags": ["Credit", "Central"],
        },
        {
            "id": "soilhealth",
            "title": "Soil Health Card Scheme",
            "summary": "Free soil testing & nutrient recommendations every 2 years for every farm.",
            "url": "https://soilhealth.dac.gov.in/",
            "tags": ["Soil", "Central"],
        },
        {
            "id": "pmksy",
            "title": "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
            "summary": "Per-drop-more-crop micro-irrigation subsidy up to 55% for small & marginal farmers.",
            "url": "https://pmksy.gov.in/",
            "tags": ["Irrigation", "Central"],
        },
        {
            "id": "enam",
            "title": "e-NAM (National Agriculture Market)",
            "summary": "Online unified market for transparent price discovery across India's mandis.",
            "url": "https://www.enam.gov.in/",
            "tags": ["Market", "Central"],
        },
    ]
    return {"_mocked": True, "schemes": base}


@api_router.get("/seedbanks")
async def seedbanks(lat: float = 12.9716, lon: float = 77.5946):
    """MOCKED nearby seed banks / KVKs — replace with Google Maps Places API."""
    sample = [
        {
            "name": "Krishi Vigyan Kendra (KVK)",
            "type": "KVK",
            "distance_km": 4.2,
            "address": "ICAR-KVK, near district HQ",
            "phone": "+91-080-12345678",
        },
        {
            "name": "National Seed Corporation Outlet",
            "type": "Seed Bank",
            "distance_km": 7.8,
            "address": "NSC Regional Office, Main Road",
            "phone": "+91-080-22334455",
        },
        {
            "name": "State Agri Department - Seed Centre",
            "type": "Seed Bank",
            "distance_km": 11.5,
            "address": "State Govt. Agri Complex",
            "phone": "+91-080-99887766",
        },
        {
            "name": "Community Seed Bank (NGO)",
            "type": "Community",
            "distance_km": 14.0,
            "address": "Village Cooperative Society",
            "phone": "+91-080-55667788",
        },
    ]
    return {
        "_mocked": True,
        "lat": lat,
        "lon": lon,
        "maps_search_url": f"https://www.google.com/maps/search/krishi+vigyan+kendra+seed+bank/@{lat},{lon},12z",
        "results": sample,
    }


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
