import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "outline";
}

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  variant = "primary",
}: PrimaryButtonProps) {
  if (variant === "outline") {
    return (
      <TouchableOpacity
        style={[styles.outlineBtn, style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#7C3AED" size="small" />
        ) : (
          <Text style={styles.outlineText}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.touchable, style]}
    >
      <LinearGradient
        colors={disabled ? ["#C4B5FD", "#C4B5FD"] : ["#7C3AED", "#6D28D9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  gradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    minHeight: 52,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Outline variant
  outlineBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#7C3AED",
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    marginTop: 4,
  },
  outlineText: {
    color: "#7C3AED",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
