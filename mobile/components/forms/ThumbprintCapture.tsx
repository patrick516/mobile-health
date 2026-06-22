import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import { COLORS, SIZES } from "../../constants/theme";

interface ThumbprintCaptureProps {
  onCapture: (captured: boolean) => void;
}

// Captures a thumbprint press. We can't read actual fingerprint biometrics
// without specialised hardware/SDKs, so this captures the PRESENCE and
// PRESSURE-DURATION of a real physical thumb press as a verification
// gesture — harder to fake remotely than a drawn signature, and matches
// the familiar "thumbprint on paper" practice already used in Malawi for
// people who cannot write.
export default function ThumbprintCapture({
  onCapture,
}: ThumbprintCaptureProps) {
  const [pressing, setPressing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [pressStartTime, setPressStartTime] = useState<number | null>(null);

  const MIN_PRESS_MS = 1200; // require a deliberate, sustained press

  const handlePressIn = () => {
    setPressing(true);
    setPressStartTime(Date.now());
  };

  const handlePressOut = () => {
    setPressing(false);
    if (pressStartTime && Date.now() - pressStartTime >= MIN_PRESS_MS) {
      setCaptured(true);
      onCapture(true);
    } else {
      // Released too early — not a deliberate press
      setCaptured(false);
      onCapture(false);
    }
    setPressStartTime(null);
  };

  const reset = () => {
    setCaptured(false);
    onCapture(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.pad,
          pressing && styles.padPressing,
          captured && styles.padCaptured,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {captured ? (
          <View style={styles.capturedContent}>
            <Svg width={72} height={72} viewBox="0 0 100 100">
              {/* Simple fingerprint-style concentric arcs as a visual confirmation icon */}
              {[42, 34, 26, 18, 10].map((r, i) => (
                <Circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={r}
                  stroke={COLORS.success}
                  strokeWidth={3}
                  fill="none"
                  strokeDasharray={`${r * 4} ${r * 1.2}`}
                />
              ))}
            </Svg>
            <Text style={styles.capturedLabel}>Thumbprint Captured ✓</Text>
          </View>
        ) : (
          <View style={styles.placeholderContent}>
            <Ionicons
              name="finger-print-outline"
              size={56}
              color={pressing ? COLORS.primary : COLORS.placeholder}
            />
            <Text style={styles.placeholderLabel}>
              {pressing ? "Hold still..." : "Press and hold thumb here"}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {captured && (
        <TouchableOpacity style={styles.retakeBtn} onPress={reset}>
          <Ionicons name="refresh-outline" size={14} color={COLORS.primary} />
          <Text style={styles.retakeBtnText}>Retake Thumbprint</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.helpText}>
        Ask the head of household to firmly press and hold their thumb on the
        screen for about 1 second to confirm their identity.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    height: 160,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  padPressing: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  padCaptured: {
    borderColor: COLORS.success,
    borderStyle: "solid",
    backgroundColor: "#F0FDF4",
  },
  placeholderContent: { alignItems: "center", gap: 8 },
  placeholderLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.placeholder,
  },
  capturedContent: { alignItems: "center", gap: 8 },
  capturedLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.success,
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  retakeBtnText: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    fontWeight: "600",
  },
  helpText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
});
