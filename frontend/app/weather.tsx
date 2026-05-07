import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../src/api";

type Day = {
  date: string;
  temp_max: number;
  temp_min: number;
  humidity: number;
  rain_prob: number;
  wind_kmh: number;
  icon: string;
  condition: string;
};

const ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  sun: "weather-sunny",
  cloud: "weather-cloudy",
  "cloud-rain": "weather-pouring",
  "cloud-sun": "weather-partly-cloudy",
  cloudy: "weather-cloudy",
};

export default function Weather() {
  const [days, setDays] = useState<Day[]>([]);
  const [location, setLocation] = useState("Loading...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let lat = 20.5937, lon = 78.9629, locName = "India";
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
          try {
            const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (rev?.[0]) {
              locName = `${rev[0].city || rev[0].region || ""}, ${rev[0].country || "India"}`.trim();
            }
          } catch {}
        }
      } catch {}
      try {
        const { data } = await api.get("/weather", { params: { lat, lon, location: locName } });
        setDays(data.days || []);
        setLocation(data.location || locName);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0288D1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.locRow}>
        <MaterialCommunityIcons name="map-marker" size={22} color="#0288D1" />
        <Text style={styles.locText}>{location}</Text>
      </View>
      <Text style={styles.heading}>5-Day Forecast</Text>

      {days.map((d, i) => {
        const iconName = ICON_MAP[d.icon] || "weather-partly-cloudy";
        return (
          <View key={i} style={styles.dayCard} testID={`day-${i}`}>
            <View style={styles.dayLeft}>
              <Text style={styles.dayDate}>{i === 0 ? "Today" : d.date}</Text>
              <Text style={styles.dayCond}>{d.condition}</Text>
            </View>
            <MaterialCommunityIcons name={iconName} size={48} color="#0288D1" />
            <View style={styles.dayRight}>
              <Text style={styles.tempMax}>{d.temp_max}°</Text>
              <Text style={styles.tempMin}>/{d.temp_min}°C</Text>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="water-percent" size={14} color="#4A5D4E" />
                <Text style={styles.metaText}>{d.humidity}%</Text>
                <MaterialCommunityIcons name="weather-rainy" size={14} color="#4A5D4E" />
                <Text style={styles.metaText}>{d.rain_prob}%</Text>
              </View>
            </View>
          </View>
        );
      })}

      <Text style={styles.disclaimer}>
        * Demo data. Add OpenWeatherMap API key to backend for live forecasts.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E1F5FE" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E1F5FE" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  locText: { fontSize: 16, fontWeight: "700", color: "#01579B" },
  heading: { fontSize: 24, fontWeight: "800", color: "#01579B", marginBottom: 16 },
  dayCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, padding: 16, marginBottom: 10, elevation: 2, gap: 14,
  },
  dayLeft: { flex: 1 },
  dayDate: { fontSize: 16, fontWeight: "800", color: "#01579B" },
  dayCond: { fontSize: 13, color: "#4A5D4E", marginTop: 2 },
  dayRight: { alignItems: "flex-end", minWidth: 90 },
  tempMax: { fontSize: 22, fontWeight: "800", color: "#1A2F1D" },
  tempMin: { fontSize: 13, color: "#4A5D4E" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: "#4A5D4E", marginRight: 6 },
  disclaimer: { marginTop: 16, fontSize: 12, color: "#777", fontStyle: "italic", textAlign: "center" },
});
