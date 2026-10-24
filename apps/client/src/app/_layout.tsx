import "../../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StoreProvider } from "../components/provider";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "../components/keyboard";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <StatusBar style="dark" />
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }} edges={["top", "bottom"]}>
          <StoreProvider>
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "white" } }}
            >
              <Stack.Screen name="backlog" options={{ animation: "none" }} />
              <Stack.Screen name="current" options={{ animation: "none" }} />
              <Stack.Screen name="upcoming" options={{ animation: "none" }} />
              <Stack.Screen name="history" options={{ animation: "none" }} />
              <Stack.Screen name="day/[date]/[slotId]" options={{ animation: "none" }} />
            </Stack>
          </StoreProvider>
        </SafeAreaView>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
