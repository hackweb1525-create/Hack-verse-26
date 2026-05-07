# AgriMind AI — PRD

## Overview
AgriMind AI is a voice-first multilingual mobile assistant (Expo React Native) for Indian farmers with low digital literacy. Powered by Gemini 2.5 Flash + OpenAI Whisper-1 via the Emergent Universal LLM key.

## Languages
English, Hindi, Kannada, Telugu, Tamil. Default English. Selectable on the login page (persisted) and via top-of-screen pill bar on the home page.

## Authentication / Onboarding
- Simple farmer-friendly **login page** (no password): Name + 10-digit Mobile + Preferred Language.
- Stored locally via `AsyncStorage` (no backend auth, no JWT).
- Auth gate in `_layout.tsx` redirects unauthenticated users to `/login`.
- Sign-out via tap on profile icon on home.

## Tech Stack
- **Frontend**: Expo SDK 54, expo-router, React Native, expo-speech (TTS), **expo-audio** (recording), expo-image-picker, expo-location, axios, AsyncStorage
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (Gemini 2.5 Flash + OpenAI Whisper-1)

## Voice (full pipeline)
**Speech-to-Text:**
- **Web preview** → browser's free Web Speech API with BCP-47 language code (`en-IN`, `hi-IN`, `kn-IN`, `te-IN`, `ta-IN`).
- **Native (Expo Go on phone)** → records via `expo-audio`, base64 → backend `POST /api/stt` → OpenAI Whisper-1 → transcript.

**Text-to-Speech:**
- Every AI reply is auto-spoken via `expo-speech` in the user's selected language code.

**Voice mic locations:**
- Home: large pulsating mic → transcript routes to fertilizer chat with question pre-filled and auto-sent.
- Fertilizer chat: dedicated mic next to the text input (auto-sends transcript).
- Calculator: voice button on the location field.

## Backend Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/` | Health |
| GET | `/api/languages` | Supported languages |
| POST | `/api/disease/detect` | Gemini Vision disease detection |
| POST | `/api/fertilizer/chat` | Multilingual organic-farming chat |
| GET | `/api/fertilizer/history/{session_id}` | Chat history |
| POST | `/api/calculator/recommend` | Crop suggestions with reasoning |
| POST | `/api/translate` | Translate text → target language |
| POST | `/api/stt` | OpenAI Whisper-1 transcription |
| GET | `/api/weather` | 5-day forecast (MOCKED) |
| GET | `/api/schemes` | Govt schemes list (MOCKED — curated) |
| GET | `/api/seedbanks` | Nearby seed banks (MOCKED) |
| GET | `/api/youtube/search` | Disease video lookup (MOCKED) |

## Screens
| Route | Color theme | Notes |
|-------|-------------|-------|
| `/login` | Green hero | Onboarding form |
| `/` (home) | Light bg | Mic + 6-card grid + profile |
| `/disease` | Red | Image upload → Gemini Vision result + steps |
| `/schemes` | Blue | Schemes + seed-bank list + Google Maps link |
| `/fertilizer` | Brown | Voice + text chat with history |
| `/weather` | Sky Blue | 5-day forecast cards |
| `/calculator` | Orange | Form with voice for location |
| External | Green | `https://farm-link-chat.lovable.app/` |

## MOCKED integrations (replace with keys)
- OpenWeatherMap (`/api/weather`)
- YouTube Data API v3 (`/api/youtube/search`)
- Google Maps Places (`/api/seedbanks`)
- Google Custom Search (`/api/schemes` — currently curated verified list)
