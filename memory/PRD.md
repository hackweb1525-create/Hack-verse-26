# AgriMind AI — PRD

## Overview
AgriMind AI is a voice-first multilingual mobile assistant (Expo React Native) for Indian farmers with low digital literacy. Powered by Gemini 2.5 Flash via the Emergent Universal LLM key.

## Languages
English, Hindi, Kannada, Telugu, Tamil. Default English. Selectable via top-of-screen pill bar; persists in app context.

## Tech Stack
- Frontend: Expo SDK 54, expo-router (file-based routing), React Native, expo-speech (TTS), expo-image-picker, expo-location, axios
- Backend: FastAPI + Motor (MongoDB) + emergentintegrations (Gemini 2.5 Flash)

## Screens / Features
| # | Screen | Color | Backend endpoint |
|---|--------|-------|------------------|
| Home | `/` (mic + 6-grid + language) | Green primary | n/a |
| 1 | Disease Detection (`/disease`) | Red | `POST /api/disease/detect` (Gemini Vision) |
| 2 | Govt Schemes & Seed Bank (`/schemes`) | Blue | `GET /api/schemes`, `GET /api/seedbanks` (MOCKED) |
| 3 | Organic Fertilizer chat (`/fertilizer`) | Brown | `POST /api/fertilizer/chat` (Gemini, persisted in MongoDB) |
| 4 | 5-day Weather (`/weather`) | Sky Blue | `GET /api/weather` (MOCKED) |
| 5 | Smart Crop Calculator (`/calculator`) | Orange | `POST /api/calculator/recommend` (Gemini reasoning) |
| 6 | Market | Green | External `Linking.openURL("https://farm-link-chat.lovable.app/")` |

## TTS / Voice
Every AI text reply is auto-spoken via `expo-speech` using language code (`en-IN`, `hi-IN`, `kn-IN`, `te-IN`, `ta-IN`). Manual replay & Stop buttons provided.

STT (microphone-in) requires a development build (`@react-native-voice/voice` not available in Expo Go). The pulsating mic button currently provides voice-out greeting + a graceful prompt to use feature buttons; full STT can be enabled in a dev build.

## MOCKED integrations (replace with real keys later)
- `/api/weather` — replace with OpenWeatherMap API key
- `/api/youtube/search` — replace with YouTube Data API v3 key
- `/api/seedbanks` — replace with Google Maps Places API
- `/api/schemes` — currently a curated verified list; can be made live via Google Custom Search

## Smart Calculator Logic
Sends `location, land_size, unit, season, soil_type, language` to Gemini. JSON response: 3 suggested crops with success reason / yield / water need + 2 rejected crops with failure reasons.

## Data
MongoDB stores `chat_messages` for fertilizer guide history.
