import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import InputField from "../src/components/InputField";
import PrimaryButton from "../src/components/PrimaryButton";
import { loginUser } from "../src/services/auth.service";
import { useAuthStore } from "../src/store/authStore";

// ─── Google Icon ───────────────────────────────────────────────
function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

// ─── Main Screen ───────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const response = await loginUser(email, password);
      if (response?.token && response?.user) {
        setAuth(response.token, response.user);
        router.replace("/discover");
      }
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error.message ?? "Invalid email or password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome Back 💜</Text>
          <Text style={styles.headerSub}>Log in to continue your journey</Text>
        </View>
        <View style={styles.card}>
          <InputField
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            iconName="email"
          />
          <InputField
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            iconName="lock"
          />
          <PrimaryButton
            title="Log In"
            onPress={handleLogin}
            loading={loading}
          />
        </View>
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7FF" },
  scroll: { padding: 24, paddingTop: 64 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#1F0A3C" },
  headerSub: { marginTop: 6, color: "#6B7280" },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  signupText: { color: "#6B7280" },
  signupLink: { color: "#7C3AED", fontWeight: "700" },
});
