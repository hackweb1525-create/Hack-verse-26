import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../src/AuthContext";
import { LANGUAGES, useLanguage, LangCode } from "../src/LanguageContext";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { lang, setLang } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert("Please enter your name");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone.trim())) {
      Alert.alert("Please enter a valid 10-digit phone number");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(name, phone);
      router.replace("/" as any);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <MaterialCommunityIcons name="leaf" size={56} color="#fff" />
            </View>
            <Text style={styles.brand}>AgriMind AI</Text>
            <Text style={styles.tag}>Your voice-first farming companion</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome, Kisan! 🌾</Text>
            <Text style={styles.cardSubtitle}>
              Enter your details to get started. We'll personalise your experience.
            </Text>

            <Text style={styles.label}>Your Name</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="account" size={22} color="#4A5D4E" />
              <TextInput
                testID="login-name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#999"
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="phone" size={22} color="#4A5D4E" />
              <Text style={styles.cc}>+91</Text>
              <TextInput
                testID="login-phone"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))}
                placeholder="10-digit number"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>

            <Text style={styles.label}>Preferred Language</Text>
            <View style={styles.langGrid}>
              {LANGUAGES.map((l) => {
                const active = lang === l.code;
                return (
                  <TouchableOpacity
                    key={l.code}
                    testID={`login-lang-${l.code}`}
                    onPress={() => setLang(l.code as LangCode)}
                    style={[styles.langChip, active && styles.langChipActive]}
                  >
                    <Text style={[styles.langChipText, active && { color: "#fff" }]}>
                      {l.native}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              testID="login-continue"
              disabled={submitting}
              onPress={handleContinue}
              style={[styles.cta, submitting && { opacity: 0.6 }]}
            >
              <Text style={styles.ctaText}>Continue</Text>
              <MaterialCommunityIcons name="arrow-right-circle" size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.privacy}>
              🔒 Your details stay on your device. No password needed.
            </Text>
          </View>

          {/* Feature hints */}
          <View style={styles.hints}>
            <Hint icon="microphone" text="Speak in your language" />
            <Hint icon="leaf-off" text="Detect plant disease" />
            <Hint icon="weather-partly-cloudy" text="5-day weather" />
            <Hint icon="calculator-variant" text="Smart crop advice" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Hint({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.hint}>
      <MaterialCommunityIcons name={icon} size={20} color="#2E7D32" />
      <Text style={styles.hintText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#2E7D32" },
  container: { flexGrow: 1, paddingBottom: 24 },
  hero: { alignItems: "center", paddingTop: 18, paddingBottom: 28, paddingHorizontal: 24 },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brand: { color: "#fff", fontSize: 30, fontWeight: "900", letterSpacing: 0.5 },
  tag: { color: "#E8F5E9", fontSize: 14, marginTop: 4 },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: "#1A2F1D" },
  cardSubtitle: { fontSize: 14, color: "#4A5D4E", marginTop: 4, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "700", color: "#4A5D4E", marginTop: 14, marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cc: { color: "#1A2F1D", fontSize: 16, fontWeight: "700", marginHorizontal: 6 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14, paddingLeft: 8, color: "#1A2F1D" },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
    backgroundColor: "#fff",
  },
  langChipActive: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  langChipText: { fontSize: 14, fontWeight: "700", color: "#1A2F1D" },
  cta: {
    marginTop: 22,
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  privacy: { fontSize: 12, textAlign: "center", color: "#777", marginTop: 12 },
  hints: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 22, paddingHorizontal: 16 },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  hintText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
