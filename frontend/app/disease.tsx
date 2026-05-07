import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Icon } from "../src/Icon";
import { api } from "../src/api";
import { useLanguage } from "../src/LanguageContext";
import { speak, stopSpeak } from "../src/tts";

type Result = {
  disease: string;
  plant: string;
  confidence: string;
  summary: string;
  steps: string[];
  organic_remedies: string[];
  youtube_query: string;
  video?: { url: string; thumbnail: string; title: string };
};

export default function Disease() {
  const { lang, ttsCode } = useLanguage();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const pick = async (camera: boolean) => {
    setResult(null);
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
      allowsEditing: true,
    };
    let res;
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Camera access is required.");
        return;
      }
      res = await ImagePicker.launchCameraAsync(opts);
    } else {
      res = await ImagePicker.launchImageLibraryAsync(opts);
    }
    if (!res.canceled && res.assets?.[0]) {
      setImageUri(res.assets[0].uri);
      setImageB64(res.assets[0].base64 || null);
    }
  };

  const analyze = async () => {
    if (!imageB64) {
      Alert.alert("Please select an image first.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/disease/detect", {
        image_base64: imageB64,
        language: lang,
      });
      setResult(data);
      if (data?.summary) speak(data.summary, ttsCode);
    } catch (e: any) {
      Alert.alert("AI error", e?.response?.data?.detail || "Could not analyze image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.title}>Detect plant disease from a photo</Text>
      <Text style={styles.subtitle}>
        Take a clear close-up of the affected leaf or part. AI identifies disease and gives steps + a video.
      </Text>

      <View style={styles.row}>
        <TouchableOpacity testID="btn-camera" style={[styles.actionBtn, { backgroundColor: "#D32F2F" }]} onPress={() => pick(true)}>
          <Icon name="camera" size={24} color="#fff" />
          <Text style={styles.actionText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="btn-gallery" style={[styles.actionBtn, { backgroundColor: "#455A64" }]} onPress={() => pick(false)}>
          <Icon name="image-multiple" size={24} color="#fff" />
          <Text style={styles.actionText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      )}

      <TouchableOpacity
        testID="btn-analyze"
        disabled={!imageB64 || loading}
        onPress={analyze}
        style={[styles.analyzeBtn, (!imageB64 || loading) && { opacity: 0.5 }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="magnify-scan" size={24} color="#fff" />
            <Text style={styles.actionText}>Analyze with AI</Text>
          </>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultCard} testID="disease-result">
          <Text style={styles.diseaseName}>{result.disease}</Text>
          <Text style={styles.plant}>
            🌱 {result.plant} · Confidence: {result.confidence}
          </Text>
          <Text style={styles.summary}>{result.summary}</Text>

          <TouchableOpacity onPress={() => speak(result.summary, ttsCode)} style={styles.ttsBtn}>
            <Icon name="volume-high" size={20} color="#2E7D32" />
            <Text style={styles.ttsText}>Listen</Text>
          </TouchableOpacity>

          {result.video && (
            <TouchableOpacity
              testID="video-link"
              onPress={() => Linking.openURL(result.video!.url)}
              style={styles.videoCard}
            >
              <Image source={{ uri: result.video.thumbnail }} style={styles.videoThumb} />
              <View style={styles.playOverlay}>
                <Icon name="play-circle" size={56} color="#fff" />
              </View>
              <Text style={styles.videoTitle} numberOfLines={2}>{result.video.title}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionH}>Step-by-Step Solution</Text>
          {result.steps?.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}

          <Text style={styles.sectionH}>Organic Remedies</Text>
          {result.organic_remedies?.map((r, i) => (
            <Text key={i} style={styles.remedy}>• {r}</Text>
          ))}

          <TouchableOpacity onPress={stopSpeak} style={styles.stopBtn}>
            <Text style={{ color: "#D32F2F", fontWeight: "700" }}>■ Stop Voice</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F6F0" },
  title: { fontSize: 22, fontWeight: "800", color: "#1A2F1D" },
  subtitle: { fontSize: 14, color: "#4A5D4E", marginTop: 6, marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, borderRadius: 12, gap: 8,
  },
  actionText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  preview: { width: "100%", height: 240, borderRadius: 12, marginTop: 16, backgroundColor: "#eee" },
  analyzeBtn: {
    marginTop: 16, backgroundColor: "#2E7D32",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 18, borderRadius: 12, gap: 10,
  },
  resultCard: { backgroundColor: "#fff", borderRadius: 14, padding: 18, marginTop: 20, elevation: 2 },
  diseaseName: { fontSize: 22, fontWeight: "800", color: "#D32F2F" },
  plant: { fontSize: 14, color: "#4A5D4E", marginTop: 4 },
  summary: { fontSize: 16, color: "#1A2F1D", marginTop: 10, lineHeight: 22 },
  ttsBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", padding: 6 },
  ttsText: { color: "#2E7D32", fontWeight: "700" },
  videoCard: { marginTop: 14, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  videoThumb: { width: "100%", height: 180 },
  playOverlay: { position: "absolute", top: 60, left: 0, right: 0, alignItems: "center" },
  videoTitle: { color: "#fff", padding: 10, fontWeight: "600" },
  sectionH: { fontSize: 17, fontWeight: "800", color: "#1A2F1D", marginTop: 18, marginBottom: 8 },
  stepRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#2E7D32", alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#fff", fontWeight: "800" },
  stepText: { flex: 1, fontSize: 15, lineHeight: 22, color: "#1A2F1D" },
  remedy: { fontSize: 15, color: "#1A2F1D", marginBottom: 6 },
  stopBtn: { marginTop: 14, alignSelf: "flex-start" },
});
