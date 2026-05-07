import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LANGUAGES, useLanguage, LangCode } from "../src/LanguageContext";
import { speak, stopSpeak } from "../src/tts";
import { useVoiceInput } from "../src/useVoiceInput";
import { useAuth } from "../src/AuthContext";

const COLORS = {
  bg: "#F9F6F0",
  text: "#1A2F1D",
  textSecondary: "#4A5D4E",
  mic: "#2E7D32",
  micPulse: "rgba(46, 125, 50, 0.25)",
  surface: "#FFFFFF",
};

const FEATURES: {
  key: string;
  label: string;
  hint: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route?: string;
  url?: string;
}[] = [
  { key: "disease", label: "Disease Detection", hint: "Photo → AI", color: "#D32F2F", icon: "leaf-off", route: "/disease" },
  { key: "schemes", label: "Govt Schemes", hint: "& Seed Bank", color: "#1976D2", icon: "bank", route: "/schemes" },
  { key: "fertilizer", label: "Fertilizer Guide", hint: "Voice chat", color: "#795548", icon: "sprout", route: "/fertilizer" },
  { key: "weather", label: "Weather", hint: "5-Day forecast", color: "#0288D1", icon: "weather-partly-cloudy", route: "/weather" },
  { key: "calculator", label: "Smart Calculator", hint: "Crop suggest", color: "#F57C00", icon: "calculator-variant", route: "/calculator" },
  { key: "market", label: "Market", hint: "Sell direct", color: "#388E3C", icon: "storefront", url: "https://farm-link-chat.lovable.app/" },
];

const GREETINGS: Record<LangCode, (name: string) => string> = {
  en: (n) => `Welcome ${n}. Tap the microphone and ask any farming question.`,
  hi: (n) => `${n} जी, स्वागत है। माइक दबाएँ और कोई भी खेती का सवाल पूछें।`,
  kn: (n) => `${n} ಅವರೇ, ಸುಸ್ವಾಗತ. ಮೈಕ್ ಒತ್ತಿ ಯಾವುದೇ ಕೃಷಿ ಪ್ರಶ್ನೆ ಕೇಳಿ.`,
  te: (n) => `${n} గారు, స్వాగతం. మైక్ నొక్కి ఏ వ్యవసాయ ప్రశ్న అయినా అడగండి.`,
  ta: (n) => `${n} அவர்களே, வரவேற்கிறோம். மைக்கை அழுத்தி எந்த விவசாய கேள்வியையும் கேளுங்கள்.`,
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang, setLang, ttsCode } = useLanguage();
  const { user, signOut } = useAuth();
  const [transcript, setTranscript] = useState<string>("");
  const greetedRef = useRef(false);

  const onTranscript = (text: string) => {
    setTranscript(text);
    router.push({ pathname: "/fertilizer", params: { q: text } } as any);
  };

  const { listening, transcribing, toggle } = useVoiceInput({ lang, onTranscript });

  // Greet on first load only
  useEffect(() => {
    if (user && !greetedRef.current) {
      greetedRef.current = true;
      const t = setTimeout(() => speak(GREETINGS[lang](user.name.split(" ")[0]), ttsCode), 600);
      return () => clearTimeout(t);
    }
  }, [user, lang, ttsCode]);

  // Pulse animation
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animate = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ).start();
    animate(pulse1, 0);
    animate(pulse2, 900);
  }, [pulse1, pulse2]);

  const ringStyle = (val: Animated.Value) => ({
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
  });

  const handleMicPress = async () => {
    stopSpeak();
    await toggle();
  };

  const handleFeature = (f: typeof FEATURES[number]) => {
    if (f.url) { Linking.openURL(f.url); return; }
    if (f.route) router.push(f.route as any);
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You'll need to enter your details again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}
      testID="home-scroll"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>AgriMind</Text>
          <Text style={styles.tagline}>
            {user ? `Namaste, ${user.name.split(" ")[0]} 🌾` : "Your voice-first farming companion"}
          </Text>
        </View>
        <TouchableOpacity onPress={confirmSignOut} style={styles.profileBtn} testID="profile-btn">
          <MaterialCommunityIcons name="account-circle" size={36} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      {/* Language selector */}
      <View testID="language-selector" style={styles.langWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}>
          {LANGUAGES.map((l) => {
            const active = lang === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLang(l.code as LangCode)}
                testID={`lang-${l.code}`}
                style={[styles.langPill, active && { backgroundColor: COLORS.mic, borderColor: COLORS.mic }]}
              >
                <Text style={[styles.langText, active && { color: "#fff", fontWeight: "800" }]}>{l.native}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Mic */}
      <View style={styles.micArea}>
        <Animated.View style={[styles.pulseRing, ringStyle(pulse1)]} />
        <Animated.View style={[styles.pulseRing, ringStyle(pulse2)]} />
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleMicPress}
          style={[styles.micBtn, listening && { backgroundColor: "#C62828" }]}
          testID="pulsating-mic-button"
        >
          <MaterialCommunityIcons
            name={listening ? "stop-circle" : transcribing ? "dots-horizontal" : "microphone"}
            size={64}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.micCaption}>
          {transcribing ? "Transcribing..." : listening ? "Listening... Tap to stop" : "Tap to speak"}
        </Text>
        {transcript ? (
          <Text style={styles.transcriptText} testID="transcript-text" numberOfLines={2}>
            "{transcript}"
          </Text>
        ) : null}
      </View>

      {/* Feature grid */}
      <View style={styles.grid}>
        {FEATURES.map((f) => (
          <TouchableOpacity
            key={f.key}
            testID={`feature-card-${f.key}`}
            activeOpacity={0.9}
            onPress={() => handleFeature(f)}
            style={[styles.card, { backgroundColor: f.color }]}
          >
            <MaterialCommunityIcons name={f.icon} size={48} color="#fff" />
            <Text style={styles.cardLabel}>{f.label}</Text>
            <Text style={styles.cardHint}>{f.hint}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.footer}>Powered by Gemini 2.5 Flash · Multilingual AI</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  brand: { fontSize: 30, fontWeight: "900", color: COLORS.text, letterSpacing: 0.3 },
  tagline: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  profileBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center" },
  langWrap: { marginTop: 10, marginBottom: 4 },
  langPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: "#D6CFC2", backgroundColor: "#FFFFFF" },
  langText: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  micArea: { alignItems: "center", justifyContent: "center", paddingVertical: 28 },
  pulseRing: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.micPulse },
  micBtn: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.mic,
    alignItems: "center", justifyContent: "center", elevation: 6,
    boxShadow: "0px 6px 16px rgba(27, 94, 32, 0.4)",
  } as any,
  micCaption: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary, fontWeight: "600" },
  transcriptText: { marginTop: 8, paddingHorizontal: 24, fontSize: 14, fontStyle: "italic", color: COLORS.mic, textAlign: "center", maxWidth: 360 },
  grid: { paddingHorizontal: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 14, marginTop: 8 },
  card: {
    width: "47%", minHeight: 150, borderRadius: 18, padding: 16,
    alignItems: "flex-start", justifyContent: "space-between", elevation: 3,
    boxShadow: "0px 3px 8px rgba(0,0,0,0.18)",
  } as any,
  cardLabel: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 8 },
  cardHint: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500" },
  footer: { textAlign: "center", marginTop: 24, color: COLORS.textSecondary, fontSize: 12 },
});
