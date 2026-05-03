import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";

const { width, height } = Dimensions.get("window");

// ─── Small floating heart ────────────────────────────────────────────────────
function Heart({
  size = 14,
  color = "rgba(220,80,180,0.45)",
  top,
  left,
  right,
  bottom,
}: {
  size?: number;
  color?: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}) {
  return (
    <View style={{ position: "absolute", top, left, right, bottom }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 21C12 21 2 14 2 7.5C2 4.4 4.4 2 7.5 2C9.2 2 10.8 2.9 12 4.2C13.2 2.9 14.8 2 16.5 2C19.6 2 22 4.4 22 7.5C22 14 12 21 12 21Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0120" />

      {/* Background */}
      <LinearGradient
        colors={["#0E0120", "#1A0535", "#280848", "#1A0535", "#0E0120"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={["rgba(110,30,200,0.35)", "transparent"]}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.glowOverlay}
      />

      {/* Hearts */}
      <Heart size={11} top={60} left={30} />
      <Heart size={8} top={90} left={70} />
      <Heart size={12} top={120} right={40} />

      {/* MAIN AREA */}
      <View style={styles.main}>
        {/* CENTER CONTENT */}
        <View style={styles.centerContent}>
          <Image
            source={require("../assets/SplashLogo.png")}
            style={{ width: 220, height: 220 }}
          />

          <Text style={styles.brandName}>
            Anzathu
            <Text style={styles.connectText}>Connect</Text>
          </Text>

          <Text style={styles.tagline}>
            Find someone who{"\n"}understands your vibe
          </Text>
        </View>

        {/* BUTTONS (now OUTSIDE center alignment effect) */}
        <View style={styles.btnArea}>
          <TouchableOpacity
            onPress={() => router.push("/register")}
            style={styles.btnShadow}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#EE2090", "#C2175A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.getStartedGrad}
            >
              <Text style={styles.getStartedTxt}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/login")}
            style={styles.loginBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.loginTxt}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// STYLES
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0E0120",
  },
  main: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  glowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    marginBottom: 10,
    shadowColor: "#EE2090",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },

  brandName: {
    fontSize: 30,
    fontWeight: "700",
    color: "#fff",
    marginTop: 10,
  },
  connectText: {
    color: "#EE2090",
  },
  tagline: {
    fontSize: 20,
    color: "rgba(195,160,225,0.85)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  btnArea: {
    width: "100%",
    paddingHorizontal: 40,
    paddingBottom: 60,
    gap: 12,
  },
  btnShadow: {
    borderRadius: 50,
    overflow: "hidden",
  },

  getStartedGrad: {
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 50,
  },

  getStartedTxt: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  loginBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loginTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
