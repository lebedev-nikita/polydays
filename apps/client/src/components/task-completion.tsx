import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import type { Task } from "@polydays/core";
import { colors } from "./primitives";

export function TaskCompletion({
  task,
  onPress,
  disabled = false,
  large = false,
}: {
  task: Task;
  onPress: () => void;
  disabled?: boolean;
  large?: boolean;
}) {
  const color = colors.priorities[task.priority];
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.completed, disabled }}
      aria-checked={task.completed}
      accessibilityLabel={`${task.completed ? "Вернуть в работу" : "Завершить"}: ${task.title}`}
      onPress={onPress}
      disabled={disabled}
      className="h-12 w-12 shrink-0 items-center justify-center"
    >
      <View
        style={{
          width: large ? 23 : 19,
          height: large ? 23 : 19,
          borderRadius: 16,
          borderWidth: large ? 2 : 1.7,
          borderColor: color,
          backgroundColor: task.completed
            ? color
            : task.priority === 4
              ? "transparent"
              : `${color}14`,
        }}
        className="items-center justify-center"
      >
        {task.completed && <Check size={large ? 15 : 12} color="white" strokeWidth={3} />}
      </View>
    </Pressable>
  );
}
