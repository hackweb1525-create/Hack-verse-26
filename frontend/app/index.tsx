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
import { Icon } from "../src/Icon";
import { LANGUAGES, useLanguage } from "../src/LanguageContext";
import { speak, stopSpeak } from "../src/tts";
import { useVoiceInput } from "../src/useVoiceInput";
import { useAuth } from "../src/AuthContext";
import { api } from "../src/api";

const COLORS = {
  bg: "#F9F6F0",
  text: "#1A2F1D",
  textSecondary: "#4A5D4E",
  mic: "#2E7D32",
  micPulse: "rgba(46, 125, 50, 0.25)",
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang, ttsCode, t } = useLanguage();
  const { user, signOut } = useAuth();
  const [transcript, setTranscript] = useState<string>("");
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const greetedRef = useRef<string>("");

  const FEATURES = [
    { key: "disease", label: t("feat_disease"), hint: t("feat_disease_hint"), color: "#D32F2F", icon: "leaf-off", route: "/disease" },
    { key: "schemes", label: t("feat_schemes"), hint: t("feat_schemes_hint"), color: "#1976D2", icon: "bank", route: "/schemes" },
    { key: "fertilizer", label: t("feat_fertilizer"), hint: t("feat_fertilizer_hint"), color: "#795548", icon: "sprout", route: "/fertilizer" },
    { key: "weather", label: t("feat_weather"), hint: t("feat_weather_hint"), color: "#0288D1", icon: "weather-partly-cloudy", route: "/weather" },
    { key: "calculator", label: t("feat_calculator"), hint: t("feat_calculator_hint"), color: "#F57C00", icon: "calculator-variant", route: "/calculator" },
    { key: "market", label: t("feat_market"), hint: t("feat_market_hint"), color: "#388E3C", icon: "storefront", url: process.env.EXPO_PUBLIC_MARKET_URL },
  ];

  const onTranscript = async (text: string) => {
    setTranscript(text);
    setAiAnswer("");
    setAiLoading(true);
    try {
      const { data } = await api.post("/fertilizer/chat", {
        session_id: `home-${Date.now()}`,
        message: text,
        language: lang,
      });
      const reply = data?.reply || "";
      setAiAnswer(reply);
      if (reply) speak(reply, ttsCode);
    } catch (e: any) {
      setAiAnswer(t("err_transcribe"));
    } finally {
      setAiLoading(false);
    }
  };

  const { listening, transcribing, toggle } = useVoiceInput({ lang, onTranscript });

  // Greet on first load (and when language changes the first time)
  useEffect(() => {
    if (user && greetedRef.current !== lang) {
      greetedRef.current = lang;
      const firstName = user.name.split(" ")[0];
      const greeting = `${t("namaste")}, ${firstName}. ${t("tap_to_speak")}`;
      const tm = setTimeout(() => speak(greeting, ttsCode), 600);
      return () => clearTimeout(tm);
    }
  }, [user, lang, ttsCode, t]);

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

  const handleFeature = (f: any) => {
    if (f.url) { Linking.openURL(f.url); return; }
    if (f.route) router.push(f.route);
  };

  const confirmSignOut = () => {
    Alert.alert(t("sign_out_q"), t("sign_out_msg"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("sign_out"), style: "destructive", onPress: () => signOut() },
    ]);
  };

  const currentLang = LANGUAGES.find((l) => l.code === lang);

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
            {user ? `${t("namaste")}, ${user.name.split(" ")[0]} 🌾` : t("tagline")}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>{currentLang?.native}</Text>
          </View>
          <TouchableOpacity onPress={confirmSignOut} style={styles.profileBtn} testID="profile-btn">
            <Icon name="account-circle" size={36} color="#2E7D32" />
          </TouchableOpacity>
        </View>
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
          <Icon
            name={listening ? "stop-circle" : transcribing ? "dots-horizontal" : "microphone"}
            size={64}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.micCaption}>
          {transcribing ? t("transcribing") : listening ? t("listening") : t("tap_to_speak")}
        </Text>
        {transcript ? (
          <Text style={styles.transcriptText} testID="transcript-text" numberOfLines={3}>
            "{transcript}"
          </Text>
        ) : null}

        {(aiLoading || aiAnswer) && (
          <View style={styles.answerBox} testID="ai-answer">
            <View style={styles.answerHeader}>
              <Text style={styles.answerLabel}>🤖 {t("ai_answer")}</Text>
              {aiAnswer ? (
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity onPress={() => speak(aiAnswer, ttsCode)} style={styles.answerBtn}>
                    <Icon name="volume-high" size={18} color="#2E7D32" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={stopSpeak} style={styles.answerBtn}>
                    <Icon name="volume-off" size={18} color="#C62828" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            {aiLoading ? (
              <Text style={styles.answerText}>{t("transcribing")}...</Text>
            ) : (
              <Text style={styles.answerText}>{aiAnswer}</Text>
            )}
          </View>
        )}
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
            <Icon name={f.icon} size={48} color="#fff" />
            <Text style={styles.cardLabel}>{f.label}</Text>
            <Text style={styles.cardHint}>{f.hint}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.footer}>{t("powered_by")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  brand: { fontSize: 30, fontWeight: "900", color: COLORS.text, letterSpacing: 0.3 },
  tagline: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  langBadge: { backgroundColor: "#E8F5E9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  langBadgeText: { color: "#2E7D32", fontWeight: "700", fontSize: 13 },
  profileBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center" },
  micArea: { alignItems: "center", justifyContent: "center", paddingVertical: 36 },
  pulseRing: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.micPulse },
  micBtn: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.mic,
    alignItems: "center", justifyContent: "center", elevation: 6,
    boxShadow: "0px 6px 16px rgba(27, 94, 32, 0.4)",
  } as any,
  micCaption: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary, fontWeight: "600" },
  transcriptText: { marginTop: 8, paddingHorizontal: 24, fontSize: 14, fontStyle: "italic", color: COLORS.mic, textAlign: "center", maxWidth: 360 },
  answerBox: {
    marginTop: 16, marginHorizontal: 20, backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderLeftWidth: 4, borderLeftColor: "#2E7D32", elevation: 2, alignSelf: "stretch",
  },
  answerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  answerLabel: { fontSize: 13, fontWeight: "800", color: "#2E7D32" },
  answerBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F8E9", alignItems: "center", justifyContent: "center" },
  answerText: { fontSize: 15, color: "#1A2F1D", lineHeight: 22 },
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
