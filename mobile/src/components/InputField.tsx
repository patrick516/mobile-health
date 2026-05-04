import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Text,
} from "react-native";
import { useState } from "react";
import colors from "../theme/colors";

interface InputFieldProps extends TextInputProps {
  iconName?: "email" | "lock" | "person" | "calendar" | "phone";
}

// Simple icon map using unicode symbols (replace with react-native-vector-icons if available)
const iconMap: Record<string, string> = {
  email: "✉",
  lock: "🔒",
  person: "👤",
  calendar: "📅",
  phone: "📞",
};

export default function InputField({
  iconName,
  secureTextEntry,
  style,
  ...props
}: InputFieldProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.wrapper}>
      {/* Left icon */}
      {iconName && (
        <Text style={styles.leftIcon}>{iconMap[iconName] ?? "•"}</Text>
      )}

      <TextInput
        style={[styles.input, iconName && styles.inputWithIcon]}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={isSecure}
        autoComplete="off"
        importantForAutofill="no"
        autoCorrect={false}
        {...props}
      />

      {/* Eye toggle for password */}
      {secureTextEntry && (
        <TouchableOpacity
          onPress={() => setIsSecure(!isSecure)}
          style={styles.eyeBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.eyeIcon}>{isSecure ? "👁" : "🙈"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F5FF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E9D8FD",
    marginBottom: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  leftIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1F0A3C",
    paddingVertical: 14,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 6,
  },
  eyeIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
});
