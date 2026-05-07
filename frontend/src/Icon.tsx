import React from "react";
import { Text, TextStyle } from "react-native";

// Emoji-based icons — bulletproof, no font loading required.
// Maps Material Community / Ionicons names → emoji glyphs.
const MAP: Record<string, string> = {
  // Mic / voice
  "microphone": "🎤",
  "microphone-outline": "🎙️",
  "stop": "⏹",
  "stop-circle": "⏹",
  "dots-horizontal": "•••",
  "volume-high": "🔊",
  "volume-off": "🔇",

  // Plant / nature
  "leaf": "🌿",
  "leaf-off": "🥀",
  "sprout": "🌱",

  // Buildings / commerce
  "bank": "🏛️",
  "warehouse": "🏭",
  "storefront": "🛒",

  // Weather
  "weather-sunny": "☀️",
  "weather-cloudy": "☁️",
  "weather-pouring": "🌧️",
  "weather-rainy": "🌦️",
  "weather-partly-cloudy": "⛅",

  // Tools
  "calculator-variant": "🧮",
  "magnify-scan": "🔍",
  "play-circle": "▶️",

  // Camera / images
  "camera": "📷",
  "image-multiple": "🖼️",

  // People / profile
  "account": "👤",
  "account-circle": "👤",

  // Comm
  "phone": "📞",
  "send": "➤",
  "arrow-right-circle": "➡️",

  // Map
  "map-marker": "📍",
  "map-marker-radius": "📍",
  "water-percent": "💧",
};

export type IconName = keyof typeof MAP | string;

export const Icon = ({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: TextStyle;
}) => {
  const glyph = MAP[name as string] || "•";
  return (
    <Text
      style={[
        {
          fontSize: size,
          lineHeight: size * 1.15,
          textAlign: "center",
          width: size * 1.2,
          color: color || "#000",
        },
        style,
      ]}
      // emoji rendered as plain text — uses system emoji font
    >
      {glyph}
    </Text>
  );
};

export default Icon;
