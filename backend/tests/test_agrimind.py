"""AgriMind AI backend integration tests."""
import io
import base64
import uuid
import pytest
import requests
from PIL import Image, ImageDraw

TIMEOUT = 90


# ---------- helpers ----------
def _make_real_leaf_image_b64() -> str:
    """Build a JPEG with real visual features (textures, edges) per /app/image_testing.md.
    Simulates a leaf with diseased spots — NOT a solid color."""
    img = Image.new("RGB", (512, 512), (34, 120, 45))
    draw = ImageDraw.Draw(img)
    # leaf veins
    draw.line([(256, 0), (256, 511)], fill=(20, 80, 30), width=6)
    for y in range(20, 511, 30):
        draw.line([(256, y), (40, y + 60)], fill=(25, 90, 35), width=3)
        draw.line([(256, y), (472, y + 60)], fill=(25, 90, 35), width=3)
    # "diseased" brown/yellow spots
    spots = [(120, 140, 60), (300, 200, 45), (200, 350, 55), (380, 380, 40), (150, 420, 35)]
    for cx, cy, r in spots:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(140, 90, 30))
        draw.ellipse([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2], fill=(180, 150, 60))
    # texture noise
    import random
    random.seed(1)
    for _ in range(800):
        x, y = random.randint(0, 511), random.randint(0, 511)
        draw.point((x, y), fill=(random.randint(15, 80), random.randint(80, 160), random.randint(20, 60)))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


# ---------- 1. health ----------
def test_root_health(api_client, base_url):
    r = api_client.get(f"{base_url}/api/", timeout=TIMEOUT)
    assert r.status_code == 200
    j = r.json()
    assert "AgriMind" in j.get("message", "")
    assert j.get("model") == "gemini-2.5-flash"


# ---------- 2. languages ----------
def test_languages(api_client, base_url):
    r = api_client.get(f"{base_url}/api/languages", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 5
    codes = {d["code"] for d in data}
    assert codes == {"en", "hi", "kn", "te", "ta"}


# ---------- 3. disease detect ----------
def test_disease_detect_real_image(api_client, base_url):
    img_b64 = _make_real_leaf_image_b64()
    r = api_client.post(
        f"{base_url}/api/disease/detect",
        json={"image_base64": img_b64, "language": "en"},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["disease", "plant", "confidence", "summary", "steps", "organic_remedies", "video"]:
        assert k in d, f"missing key {k}"
    assert isinstance(d["steps"], list) and len(d["steps"]) >= 3
    assert isinstance(d["organic_remedies"], list) and len(d["organic_remedies"]) >= 1
    assert isinstance(d["video"], dict) and "url" in d["video"]
    assert d["video"].get("_mocked") is True


# ---------- 4. fertilizer chat (en + hi + history) ----------
def test_fertilizer_chat_en_hi_history(api_client, base_url):
    sid = f"TEST_sess_{uuid.uuid4().hex[:8]}"
    # English
    r1 = api_client.post(
        f"{base_url}/api/fertilizer/chat",
        json={"session_id": sid, "message": "How do I make vermicompost at home?", "language": "en"},
        timeout=TIMEOUT,
    )
    assert r1.status_code == 200, r1.text
    j1 = r1.json()
    assert j1.get("session_id") == sid
    assert isinstance(j1.get("reply"), str) and len(j1["reply"]) > 20

    # Hindi
    r2 = api_client.post(
        f"{base_url}/api/fertilizer/chat",
        json={"session_id": sid, "message": "नीम का उपयोग कैसे करें?", "language": "hi"},
        timeout=TIMEOUT,
    )
    assert r2.status_code == 200, r2.text
    reply_hi = r2.json().get("reply", "")
    # Devanagari range
    assert any("\u0900" <= ch <= "\u097F" for ch in reply_hi), f"No Hindi script in reply: {reply_hi[:200]}"

    # History
    r3 = api_client.get(f"{base_url}/api/fertilizer/history/{sid}", timeout=TIMEOUT)
    assert r3.status_code == 200
    docs = r3.json()
    assert len(docs) >= 4  # 2 user + 2 assistant
    roles = [d["role"] for d in docs]
    assert roles.count("user") >= 2 and roles.count("assistant") >= 2
    # Ensure no Mongo _id leaks
    for d in docs:
        assert "_id" not in d


# ---------- 5. calculator ----------
def test_calculator_recommend(api_client, base_url):
    payload = {
        "location": "Belgaum, Karnataka",
        "land_size": 5,
        "season": "Kharif",
        "soil_type": "Black soil",
        "language": "en",
    }
    r = api_client.post(f"{base_url}/api/calculator/recommend", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "suggested" in d and "rejected" in d and "general_tip" in d
    assert isinstance(d["suggested"], list) and len(d["suggested"]) == 3
    assert isinstance(d["rejected"], list) and len(d["rejected"]) == 2
    for s in d["suggested"]:
        for k in ["crop", "reason", "yield_estimate", "water_need"]:
            assert k in s, f"suggested missing {k}: {s}"
    for s in d["rejected"]:
        for k in ["crop", "reason"]:
            assert k in s, f"rejected missing {k}: {s}"
    assert isinstance(d["general_tip"], str) and len(d["general_tip"]) > 0


# ---------- 6. translate ----------
def test_translate_to_hindi(api_client, base_url):
    r = api_client.post(
        f"{base_url}/api/translate",
        json={"text": "Hello, how are you?", "language": "hi"},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    txt = r.json().get("text", "")
    assert any("\u0900" <= ch <= "\u097F" for ch in txt), f"Not Hindi: {txt}"


def test_translate_en_passthrough(api_client, base_url):
    r = api_client.post(
        f"{base_url}/api/translate",
        json={"text": "Hello", "language": "en"},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    assert r.json().get("text") == "Hello"


# ---------- 7. weather (mocked) ----------
def test_weather_mocked(api_client, base_url):
    r = api_client.get(f"{base_url}/api/weather", timeout=TIMEOUT)
    assert r.status_code == 200
    j = r.json()
    assert j.get("_mocked") is True
    days = j.get("days", [])
    assert len(days) == 5
    for day in days:
        for k in ["date", "temp_max", "temp_min", "humidity", "rain_prob", "icon", "condition"]:
            assert k in day, f"day missing {k}"


# ---------- 8. schemes (mocked curated) ----------
def test_schemes_curated(api_client, base_url):
    r = api_client.get(f"{base_url}/api/schemes", timeout=TIMEOUT)
    assert r.status_code == 200
    j = r.json()
    schemes = j.get("schemes", [])
    assert len(schemes) == 6
    ids = {s["id"] for s in schemes}
    assert {"pmkisan", "pmfby", "kcc"}.issubset(ids)
    for s in schemes:
        for k in ["id", "title", "summary", "url", "tags"]:
            assert k in s


# ---------- 9. seedbanks (mocked) ----------
def test_seedbanks_mocked(api_client, base_url):
    r = api_client.get(f"{base_url}/api/seedbanks", timeout=TIMEOUT)
    assert r.status_code == 200
    j = r.json()
    assert j.get("_mocked") is True
    assert "maps_search_url" in j and j["maps_search_url"].startswith("https://www.google.com/maps")
    assert isinstance(j.get("results"), list) and len(j["results"]) >= 1
