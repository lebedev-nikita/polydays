import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useApp } from "../components/provider";
import { LoginScreen } from "../components/login";
import { Button, ErrorMessage, Field } from "../components/primitives";
import { apiURL } from "../data/auth";
import { deviceAuthorizationMutation } from "../data/requests";
import { useMutation } from "@tanstack/react-query";
import { message } from "../data/store";

export default function DeviceAuthorization() {
  const { account, loaded } = useApp();
  const params = useLocalSearchParams<{ user_code?: string }>();
  const [code, setCode] = useState(params.user_code ?? "");
  const { mutateAsync, isPending: busy } = useMutation(
    deviceAuthorizationMutation(apiURL, account?.id ?? null),
  );
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async (approve: boolean) => {
    setError(null);
    try {
      await mutateAsync({ code, approve });
      setResult(
        approve
          ? "Вход разрешён. Вернитесь в Polydays на Mac."
          : "Вход отклонён. Эту вкладку можно закрыть.",
      );
    } catch (cause) {
      setError(message(cause));
    }
  };
  if (!loaded) return null;
  if (!account) return <LoginScreen />;
  return (
    <ScrollView
      className="flex-1 bg-sidebar"
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <View className="w-full max-w-[410px] gap-6 rounded-xl border border-line bg-white p-8">
        <View className="gap-2">
          <Text accessibilityRole="header" className="text-xl font-semibold text-ink">
            Вход в Polydays на Mac
          </Text>
          <Text accessibilityLiveRegion="polite" className="text-[15px] leading-6 text-ink">
            {result}
          </Text>
        </View>
        {!result && (
          <>
            <Text className="text-[15px] leading-6 text-muted">
              Разрешите доступ, только если вы начали вход в приложении Polydays на своём Mac.
            </Text>
            <Field
              label="Код входа"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              editable={!busy}
            />
            <Text className="text-sm text-muted">Аккаунт: {account.email}</Text>
            <ErrorMessage>{error}</ErrorMessage>
            <Button
              disabled={busy || !code}
              onPress={() => {
                void submit(true);
              }}
            >
              Разрешить вход
            </Button>
            <Button
              secondary
              disabled={busy || !code}
              onPress={() => {
                void submit(false);
              }}
            >
              Отклонить
            </Button>
          </>
        )}
      </View>
    </ScrollView>
  );
}
