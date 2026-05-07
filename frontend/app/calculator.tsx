import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../src/api";
import { useLanguage } from "../src/LanguageContext";
import { speak } from "../src/tts";

type Suggested = { crop: string; reason: string; yield_estimate: string; water_need: string };
type Rejected = { crop: string; reason: string };
type Result = { suggested: Suggested[]; rejected: Rejected[]; general_tip: string };

const SOILS = ["Black soil", "Red soil", "Alluvial", "Sandy", "Loamy", "Clay"];
const SEASONS = ["Kharif (Jun-Oct)", "Rabi (Nov-Mar)", "Zaid (Apr-Jun)"];

export default function Calculator() {
  const { lang, ttsCode } = useLanguage();
  const [location, setLocation] = useState("");
  const [land, setLand] = useState("");
  const [unit, setUnit] = useState<"acres" | "guntas">("acres");
  const [soil, setSoil] = useState<string | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async () => {
    if (!location.trim() || !land.trim()) {
      Alert.alert("Please fill location and land size");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/calculator/recommend", {
        location: location.trim(),
        land_size: parseFloat(land),
        land_unit: unit,
        season,
        soil_type: soil,
        language: lang,
      });
      setResult(data);
      if (data.general_tip) speak(data.general_tip, ttsCode);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Could not generate recommendations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#FFF8E1" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={styles.title}>Smart Crop Calculator</Text>
        <Text style={styles.subtitle}>Get AI-powered crop suggestions based on your land, season & soil.</Text>

        <Text style={styles.label}>📍 Location (district/state)</Text>
        <TextInput
          testID="input-location"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Belgaum, Karnataka"
          placeholderTextColor="#999"
          style={styles.input}
        />

        <Text style={styles.label}>📏 Land size</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            testID="input-land"
            value={land}
            onChangeText={setLand}
            keyboardType="numeric"
            placeholder="e.g. 5"
            placeholderTextColor="#999"
            style={[styles.input, { flex: 1 }]}
          />
          <View style={styles.unitWrap}>
            {(["acres", "guntas"] as const).map((u) => (
              <TouchableOpacity
                key={u}
                testID={`unit-${u}`}
                onPress={() => setUnit(u)}
                style={[styles.unitBtn, unit === u && { backgroundColor: "#F57C00" }]}
              >
                <Text style={[styles.unitText, unit === u && { color: "#fff" }]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.label}>🌍 Soil type</Text>
        <View style={styles.chipRow}>
          {SOILS.map((s) => (
            <TouchableOpacity
              key={s}
              testID={`soil-${s}`}
              onPress={() => setSoil(soil === s ? null : s)}
              style={[styles.chip, soil === s && { backgroundColor: "#F57C00", borderColor: "#F57C00" }]}
            >
              <Text style={[styles.chipText, soil === s && { color: "#fff" }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>🗓️ Season</Text>
        <View style={styles.chipRow}>
          {SEASONS.map((s) => (
            <TouchableOpacity
              key={s}
              testID={`season-${s}`}
              onPress={() => setSeason(season === s ? null : s)}
              style={[styles.chip, season === s && { backgroundColor: "#F57C00", borderColor: "#F57C00" }]}
            >
              <Text style={[styles.chipText, season === s && { color: "#fff" }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="btn-submit" onPress={submit} disabled={loading} style={[styles.submit, loading && { opacity: 0.6 }]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="calculator-variant" size={22} color="#fff" />
              <Text style={styles.submitText}>Get Crop Recommendations</Text>
            </>
          )}
        </TouchableOpacity>

        {result && (
          <View style={{ marginTop: 24 }} testID="calculator-result">
            <Text style={styles.tipBox}>💡 {result.general_tip}</Text>

            <Text style={styles.sectionGreen}>✅ Recommended Crops</Text>
            {result.suggested?.map((s, i) => (
              <View key={i} style={styles.cropCardOk}>
                <Text style={styles.cropName}>🌾 {s.crop}</Text>
                <Text style={styles.cropReason}>{s.reason}</Text>
                <View style={styles.cropMeta}>
                  <Text style={styles.metaPill}>Yield: {s.yield_estimate}</Text>
                  <Text style={styles.metaPill}>Water: {s.water_need}</Text>
                </View>
              </View>
            ))}

            <Text style={styles.sectionRed}>❌ Crops to Avoid</Text>
            {result.rejected?.map((r, i) => (
              <View key={i} style={styles.cropCardNo}>
                <Text style={styles.cropName}>🚫 {r.crop}</Text>
                <Text style={styles.cropReason}>{r.reason}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", color: "#1A2F1D" },
  subtitle: { fontSize: 14, color: "#4A5D4E", marginTop: 4, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "700", color: "#4A5D4E", marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 14, fontSize: 15, color: "#1A2F1D", borderWidth: 1, borderColor: "#EEE" },
  unitWrap: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#EEE" },
  unitBtn: { paddingHorizontal: 14, justifyContent: "center" },
  unitText: { fontSize: 14, fontWeight: "700", color: "#4A5D4E" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderColor: "#FFB74D", backgroundColor: "#fff" },
  chipText: { fontSize: 13, color: "#5D4037", fontWeight: "600" },
  submit: { marginTop: 20, backgroundColor: "#F57C00", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  tipBox: { backgroundColor: "#FFF3E0", padding: 12, borderRadius: 10, color: "#5D4037", fontSize: 14, marginBottom: 12 },
  sectionGreen: { fontSize: 18, fontWeight: "800", color: "#2E7D32", marginTop: 14, marginBottom: 8 },
  sectionRed: { fontSize: 18, fontWeight: "800", color: "#D32F2F", marginTop: 14, marginBottom: 8 },
  cropCardOk: { backgroundColor: "#fff", borderLeftWidth: 5, borderLeftColor: "#2E7D32", padding: 14, borderRadius: 10, marginBottom: 10 },
  cropCardNo: { backgroundColor: "#fff", borderLeftWidth: 5, borderLeftColor: "#D32F2F", padding: 14, borderRadius: 10, marginBottom: 10 },
  cropName: { fontSize: 17, fontWeight: "800", color: "#1A2F1D" },
  cropReason: { fontSize: 14, color: "#4A5D4E", marginTop: 4, lineHeight: 20 },
  cropMeta: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  metaPill: { backgroundColor: "#E8F5E9", color: "#2E7D32", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: "700" },
});
