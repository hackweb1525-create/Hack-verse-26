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

const STARTERS = [
  "How to make organic compost at home?",
  "Best non-pesticide spray for tomato pests?",
  "How to grow okra organically in summer?",
  "Natural fertilizer for paddy fields?",
];

export default function Fertilizer() {
  const { lang, ttsCode } = useLanguage();
  const params = useLocalSearchParams<{ q?: string }>();
  const sessionId = useRef(`s-${Date.now()}`).current;
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "🌱 Namaste! I'm AgriMind. Ask me anything about organic fertilizers, compost, or non-pesticide farming.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const autoSentRef = useRef(false);

  const { listening, transcribing, toggle } = useVoiceInput({
    lang,
    onTranscript: (text) => {
      setInput(text);
      // Auto-send transcribed voice
      send(text);
    },
  });

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
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: `e-${Date.now()}`, role: "assistant", content: "Sorry, I couldn't reach the server. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
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
        {messages.map((m) => (
          <View
            key={m.id}
            testID={`msg-${m.role}`}
            style={[
              styles.bubble,
              m.role === "user" ? styles.userBubble : styles.aiBubble,
            ]}
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
        ))}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <ActivityIndicator color="#795548" />
          </View>
        )}

        {messages.length <= 1 && (
          <View style={styles.starters}>
            <Text style={styles.startersTitle}>Try asking:</Text>
            {STARTERS.map((s) => (
              <TouchableOpacity key={s} testID={`starter-${s.slice(0, 10)}`} style={styles.starterBtn} onPress={() => send(s)}>
                <Text style={styles.starterText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          testID="chat-input"
          value={input}
          onChangeText={setInput}
          placeholder="Ask about organic farming..."
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
  starters: { marginTop: 8 },
  startersTitle: { fontSize: 13, color: "#888", marginBottom: 8 },
  starterBtn: { backgroundColor: "#FFF3E0", padding: 12, borderRadius: 10, marginBottom: 8 },
  starterText: { color: "#5D4037", fontSize: 14, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "center", padding: 10, gap: 8, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#EEE" },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#F5F5F5", borderRadius: 22, maxHeight: 100, color: "#1A2F1D" },
  stopBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFE0B2", alignItems: "center", justifyContent: "center" },
  micChatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2E7D32", alignItems: "center", justifyContent: "center" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#795548", alignItems: "center", justifyContent: "center" },
});
