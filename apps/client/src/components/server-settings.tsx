import { useState } from "react";
import { View } from "react-native";
import { useApp } from "./provider";
import { Button, Field } from "./primitives";
import { message } from "../data/store";

export function ServerSettings({
  disabled = false,
  onDirtyChange,
}: {
  disabled?: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { store, serverURL } = useApp();
  const [url, setURL] = useState(serverURL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const save = async () => {
    if (busy || disabled) return;
    setBusy(true);
    setError(undefined);
    try {
      await store.changeServer(url);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View className="gap-3 pt-2">
      <Field
        label="Сервер"
        value={url}
        onChangeText={(value) => {
          setURL(value);
          onDirtyChange(value.trim() !== serverURL);
        }}
        placeholder="https://polydays.example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        editable={!busy && !disabled}
        error={error}
        onSubmitEditing={() => {
          void save();
        }}
        returnKeyType="done"
      />
      <Button
        secondary
        disabled={busy || disabled}
        onPress={() => {
          void save();
        }}
      >
        {busy ? "Подключение…" : url.trim() === serverURL ? "Проверить соединение" : "Подключиться"}
      </Button>
    </View>
  );
}
