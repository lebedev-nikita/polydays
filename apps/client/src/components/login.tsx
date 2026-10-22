import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CheckCheck } from "lucide-react-native";
import { useApp } from "./provider";
import { Button, ErrorMessage, colors } from "./primitives";
import { message } from "../data/store";

export function LoginScreen() {
  const { store, google, devAvailable } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = async (dev: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await store.login(dev);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View className="flex-1 items-center justify-center bg-sidebar px-6">
      <View className="w-full max-w-[410px] gap-6 rounded-xl border border-line bg-white p-8">
        <View className="flex-row items-center gap-3">
          <CheckCheck size={30} color={colors.accent} />
          <Text className="text-2xl font-bold text-ink">Polydays</Text>
        </View>
        <View className="gap-2">
          <Text className="text-xl font-semibold text-ink">Задачи в ритме ваших дней</Text>
          <Text className="text-[15px] leading-6 text-muted">
            Планируйте каждый полидень, возвращайтесь к сделанному и продолжайте с любого
            устройства.
          </Text>
        </View>
        <ErrorMessage>{error}</ErrorMessage>
        <Button
          disabled={busy || !google}
          onPress={() => {
            void login(false);
          }}
        >
          Продолжить с Google
        </Button>
        {!google && (
          <Text className="text-xs leading-5 text-muted">
            Вход через Google пока не настроен на этом сервере.
          </Text>
        )}
        {devAvailable && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void login(true);
            }}
            className="min-h-12 items-center justify-center"
          >
            <Text className="text-sm text-muted">Открыть пространство разработки</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
