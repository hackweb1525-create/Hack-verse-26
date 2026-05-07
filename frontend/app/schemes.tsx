import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { Icon } from "../src/Icon";
import { api } from "../src/api";

type Scheme = { id: string; title: string; summary: string; url: string; tags: string[] };
type Bank = { name: string; type: string; distance_km: number; address: string; phone: string };

export default function Schemes() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [mapsUrl, setMapsUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get("/schemes");
        setSchemes(s.data.schemes || []);

        let lat = 12.9716, lon = 77.5946;
        try {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (perm.granted) {
            const loc = await Location.getCurrentPositionAsync({});
            lat = loc.coords.latitude;
            lon = loc.coords.longitude;
          }
        } catch {}
        const b = await api.get("/seedbanks", { params: { lat, lon } });
        setBanks(b.data.results || []);
        setMapsUrl(b.data.maps_search_url || "");
      } catch (e: any) {
        Alert.alert("Error", "Could not load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.section}>📜 Latest Government Schemes</Text>
      {schemes.map((s) => (
        <TouchableOpacity
          key={s.id}
          testID={`scheme-${s.id}`}
          style={styles.schemeCard}
          onPress={() => Linking.openURL(s.url)}
        >
          <View style={styles.schemeHeader}>
            <Icon name="bank" size={26} color="#1976D2" />
            <Text style={styles.schemeTitle}>{s.title}</Text>
          </View>
          <Text style={styles.schemeSummary}>{s.summary}</Text>
          <View style={styles.tagsRow}>
            {s.tags.map((t) => (
              <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>
          <Text style={styles.linkHint}>Open official site →</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.section}>🏛️ Nearest Seed Banks & KVKs</Text>
      {mapsUrl ? (
        <TouchableOpacity testID="open-maps" onPress={() => Linking.openURL(mapsUrl)} style={styles.mapBtn}>
          <Icon name="map-marker-radius" size={22} color="#fff" />
          <Text style={styles.mapBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>
      ) : null}

      {banks.map((b, i) => (
        <View key={i} style={styles.bankCard} testID={`seedbank-${i}`}>
          <Icon name="warehouse" size={28} color="#2E7D32" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bankName}>{b.name}</Text>
            <Text style={styles.bankMeta}>{b.type} · {b.distance_km} km</Text>
            <Text style={styles.bankAddress}>{b.address}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${b.phone}`)}>
              <Text style={styles.bankPhone}>📞 {b.phone}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text style={styles.disclaimer}>* Live data integration ready. Currently using verified scheme list + nearby placeholder data.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F6F0" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9F6F0" },
  section: { fontSize: 20, fontWeight: "800", color: "#1A2F1D", marginTop: 8, marginBottom: 12 },
  schemeCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2 },
  schemeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  schemeTitle: { fontSize: 17, fontWeight: "800", color: "#1A2F1D", flex: 1 },
  schemeSummary: { fontSize: 14, color: "#4A5D4E", marginTop: 6, lineHeight: 20 },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  tag: { backgroundColor: "#E3F2FD", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 12, color: "#1976D2", fontWeight: "700" },
  linkHint: { color: "#1976D2", marginTop: 8, fontWeight: "700" },
  mapBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1976D2", padding: 14, borderRadius: 10, marginBottom: 14 },
  mapBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  bankCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  bankName: { fontSize: 16, fontWeight: "800", color: "#1A2F1D" },
  bankMeta: { fontSize: 13, color: "#4A5D4E", marginTop: 2 },
  bankAddress: { fontSize: 13, color: "#4A5D4E", marginTop: 2 },
  bankPhone: { fontSize: 14, color: "#2E7D32", fontWeight: "700", marginTop: 4 },
  disclaimer: { marginTop: 16, fontSize: 12, color: "#888", fontStyle: "italic" },
});
