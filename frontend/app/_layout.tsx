import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider } from "../src/LanguageContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#2E7D32" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "800" },
            contentStyle: { backgroundColor: "#F9F6F0" },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="disease" options={{ title: "Disease Detection" }} />
          <Stack.Screen name="schemes" options={{ title: "Govt Schemes & Seed Bank" }} />
          <Stack.Screen name="fertilizer" options={{ title: "Organic Fertilizer Guide" }} />
          <Stack.Screen name="weather" options={{ title: "5-Day Weather" }} />
          <Stack.Screen name="calculator" options={{ title: "Smart Crop Calculator" }} />
        </Stack>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
