import { useEffect, useRef, useState } from "react";
import { Platform, Alert } from "react-native";
import { api } from "./api";
import { LangCode } from "./LanguageContext";

const langToBCP47: Record<LangCode, string> = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  te: "te-IN",
  ta: "ta-IN",
};

// Lazy-load expo-audio only on native to avoid web/Expo Go init crashes
let _audioMod: any = null;
const loadAudio = async () => {
  if (_audioMod) return _audioMod;
  if (Platform.OS === "web") return null;
  try {
    _audioMod = await import("expo-audio");
    return _audioMod;
  } catch (e) {
    console.warn("expo-audio not available", e);
    return null;
  }
};

export function useVoiceInput(opts: {
  lang: LangCode;
  onTranscript: (text: string) => void;
}) {
  const { lang, onTranscript } = opts;
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<any>(null);
  const webRecRef = useRef<any>(null);

  // Pre-load audio module on native
  useEffect(() => {
    if (Platform.OS !== "web") {
      loadAudio().then((mod) => {
        if (mod?.setAudioModeAsync) {
          mod.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {});
        }
      });
    }
  }, []);

  // ---- Web Speech API path ----
  const startWeb = () => {
    const SR =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      Alert.alert(
        "Voice not supported",
        "Your browser doesn't support speech recognition. Please use Chrome/Edge, or open the app on your phone via the QR code.",
      );
      return;
    }
    const rec = new SR();
    rec.lang = langToBCP47[lang];
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      setListening(false);
      if (text.trim()) onTranscript(text.trim());
    };
    rec.onerror = (e: any) => {
      setListening(false);
      const err = e?.error || "unknown";
      if (err !== "no-speech" && err !== "aborted") {
        Alert.alert("Voice error", `Could not capture voice (${err}). Please try again.`);
      }
    };
    rec.onend = () => setListening(false);
    webRecRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stopWeb = () => {
    try {
      webRecRef.current?.stop();
    } catch {}
    setListening(false);
  };

  // ---- Native (Whisper) path ----
  const startNative = async () => {
    try {
      const mod = await loadAudio();
      if (!mod) {
        Alert.alert("Audio unavailable", "Voice input requires Expo Go or a development build.");
        return;
      }
      const perm = await mod.AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Microphone access is required.");
        return;
      }
      const rec = new mod.AudioRecorder(mod.RecordingPresets.HIGH_QUALITY);
      await rec.prepareToRecordAsync();
      rec.record();
      recorderRef.current = rec;
      setListening(true);
    } catch (e: any) {
      console.warn("startNative failed", e);
      Alert.alert("Mic error", e?.message || "Could not start recording");
    }
  };

  const stopNative = async () => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    setListening(false);
    if (!rec) return;
    try {
      await rec.stop();
      const uri = rec.uri;
      if (!uri) return;
      setTranscribing(true);
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const b64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const s = (reader.result as string) || "";
          const idx = s.indexOf(",");
          resolve(idx >= 0 ? s.slice(idx + 1) : s);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const mime = blob.type || "audio/m4a";
      const { data } = await api.post("/stt", { audio_base64: b64, language: lang, mime });
      const text = (data?.text || "").trim();
      if (text) onTranscript(text);
      else Alert.alert("No speech detected", "Please try again and speak clearly.");
    } catch (e: any) {
      Alert.alert("Transcription failed", e?.response?.data?.detail || e?.message || "Try again");
    } finally {
      setTranscribing(false);
    }
  };

  const toggle = async () => {
    if (listening) {
      if (Platform.OS === "web") stopWeb();
      else await stopNative();
      return;
    }
    if (Platform.OS === "web") startWeb();
    else await startNative();
  };

  return { listening, transcribing, toggle };
}
