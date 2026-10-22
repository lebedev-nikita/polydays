import "../../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StoreProvider } from "../components/provider";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }} edges={["top", "bottom"]}>
        <StoreProvider>
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "white" } }}
          />
        </StoreProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
