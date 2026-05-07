import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Icon } from "../src/Icon";
import { useLocalSearchParams } from "expo-router";
import { api } from "../src/api";
import { useLanguage } from "../src/LanguageContext";
import { speak, stopSpeak } from "../src/tts";
import { useVoiceInput } from "../src/useVoiceInput";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const ORGANIC_METHODS = [
  { key: "compost", emoji: "🌿", titleKey: "om_compost_t", descKey: "om_compost_d", color: "#558B2F" },
  { key: "vermicompost", emoji: "🪱", titleKey: "om_vermi_t", descKey: "om_vermi_d", color: "#6D4C41" },
  { key: "jeevamrutha", emoji: "🐄", titleKey: "om_jeev_t", descKey: "om_jeev_d", color: "#8D6E63" },
  { key: "panchagavya", emoji: "🥛", titleKey: "om_panch_t", descKey: "om_panch_d", color: "#9CCC65" },
  { key: "neem", emoji: "🍃", titleKey: "om_neem_t", descKey: "om_neem_d", color: "#388E3C" },
  { key: "greenmanure", emoji: "🌱", titleKey: "om_green_t", descKey: "om_green_d", color: "#43A047" },
];

export default function Fertilizer() {
  const { lang, ttsCode, t } = useLanguage();
  const params = useLocalSearchParams<{ q?: string }>();
  const sessionId = useRef(`s-${Date.now()}`).current;
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", content: "" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const autoSentRef = useRef(false);

  const { listening, transcribing, toggle } = useVoiceInput({
    lang,
    onTranscript: (text) => {
      setInput(text);
      send(text);
    },
  });

  // Translated welcome message
  useEffect(() => {
    setMessages((m) =>
      m.map((msg) => (msg.id === "welcome" ? { ...msg, content: t("ferti_welcome") } : msg)),
    );
  }, [lang, t]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: msg };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const { data } = await api.post("/fertilizer/chat", {
        session_id: sessionId,
        message: msg,
        language: lang,
      });
      const aiMsg: Msg = { id: `a-${Date.now()}`, role: "assistant", content: data.reply };
      setMessages((m) => [...m, aiMsg]);
      speak(data.reply, ttsCode);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `e-${Date.now()}`, role: "assistant", content: t("err_transcribe") },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const askMethod = (titleKey: string) => {
    const q = `${t("how_to_make")} ${t(titleKey)}? ${t("tell_steps")}`;
    send(q);
  };

  // Auto-send if voice transcript was passed via ?q=
  useEffect(() => {
    const q = (params?.q || "").toString().trim();
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.q]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F9F6F0" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        testID="chat-scroll"
      >
        {/* Welcome bubble */}
        {messages.map((m, i) =>
          m.id === "welcome" || i > 0 ? (
            <View
              key={m.id}
              testID={`msg-${m.role}`}
              style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.aiBubble]}
            >
              <Text style={[styles.bubbleText, m.role === "user" && { color: "#fff" }]}>
                {m.content}
              </Text>
              {m.role === "assistant" && m.id !== "welcome" && (
                <TouchableOpacity onPress={() => speak(m.content, ttsCode)} style={styles.speakIcon}>
                  <Icon name="volume-high" size={18} color="#795548" />
                </TouchableOpacity>
              )}
            </View>
          ) : null,
        )}

        {/* 6 Organic fertilizer methods (only shown before chat starts) */}
        {messages.length <= 1 && (
          <>
            <Text style={styles.sectionTitle}>{t("top_organic")}</Text>
            <Text style={styles.sectionSub}>{t("tap_to_learn")}</Text>
            <View style={styles.methodsGrid}>
              {ORGANIC_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  testID={`method-${m.key}`}
                  onPress={() => askMethod(m.titleKey)}
                  style={[styles.methodCard, { borderColor: m.color }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.methodEmoji}>{m.emoji}</Text>
                  <Text style={[styles.methodTitle, { color: m.color }]}>{t(m.titleKey)}</Text>
                  <Text style={styles.methodDesc} numberOfLines={3}>
                    {t(m.descKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.orAsk}>{t("or_ask_below")}</Text>
          </>
        )}

        {loading && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <ActivityIndicator color="#795548" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          testID="chat-input"
          value={input}
          onChangeText={setInput}
          placeholder={t("ask_organic")}
          placeholderTextColor="#888"
          style={styles.input}
          multiline
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity
          testID="btn-mic"
          onPress={toggle}
          style={[styles.micChatBtn, listening && { backgroundColor: "#C62828" }]}
        >
          <Icon
            name={listening ? "stop" : transcribing ? "dots-horizontal" : "microphone"}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity testID="btn-stop-tts" onPress={stopSpeak} style={styles.stopBtn}>
          <Icon name="volume-off" size={22} color="#795548" />
        </TouchableOpacity>
        <TouchableOpacity testID="btn-send" onPress={() => send()} style={styles.sendBtn} disabled={loading}>
          <Icon name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { padding: 12, borderRadius: 14, marginBottom: 10, maxWidth: "88%" },
  userBubble: { backgroundColor: "#795548", alignSelf: "flex-end" },
  aiBubble: { backgroundColor: "#fff", alignSelf: "flex-start", elevation: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22, color: "#1A2F1D" },
  speakIcon: { marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1A2F1D", marginTop: 14, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: "#666", marginBottom: 10 },
  methodsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  methodCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    marginBottom: 10,
    minHeight: 130,
  },
  methodEmoji: { fontSize: 28 },
  methodTitle: { fontSize: 15, fontWeight: "800", marginTop: 6 },
  methodDesc: { fontSize: 12, color: "#4A5D4E", marginTop: 4, lineHeight: 16 },
  orAsk: { fontSize: 13, color: "#666", marginTop: 14, marginBottom: 4, fontStyle: "italic", textAlign: "center" },
  inputRow: {
    flexDirection: "row", alignItems: "center", padding: 10, gap: 8,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#EEE",
  },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#F5F5F5", borderRadius: 22, maxHeight: 100, color: "#1A2F1D" },
  stopBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFE0B2", alignItems: "center", justifyContent: "center" },
  micChatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2E7D32", alignItems: "center", justifyContent: "center" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#795548", alignItems: "center", justifyContent: "center" },
});
