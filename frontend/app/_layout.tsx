import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider } from "../src/LanguageContext";
import { AuthProvider, useAuth } from "../src/AuthContext";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[0] === "login";
    if (!user && !onLogin) {
      router.replace("/login" as any);
    } else if (user && onLogin) {
      router.replace("/" as any);
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9F6F0" }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <AuthGate>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: "#2E7D32" },
                headerTintColor: "#fff",
                headerTitleStyle: { fontWeight: "800" },
                contentStyle: { backgroundColor: "#F9F6F0" },
              }}
            >
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="disease" options={{ title: "Disease Detection" }} />
              <Stack.Screen name="schemes" options={{ title: "Govt Schemes & Seed Bank" }} />
              <Stack.Screen name="fertilizer" options={{ title: "Organic Fertilizer Guide" }} />
              <Stack.Screen name="weather" options={{ title: "5-Day Weather" }} />
              <Stack.Screen name="calculator" options={{ title: "Smart Crop Calculator" }} />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
