import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "../../constants/theme";

interface SignaturePadProps {
  onSignatureChange: (svgPath: string, isEmpty: boolean) => void;
  width?: number;
  height?: number;
}

// Lightweight finger-drawn signature pad using react-native-svg (already installed)
export default function SignaturePad({
  onSignatureChange,
  width = 320,
  height = 160,
}: SignaturePadProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPath = useRef<string>("");
  const [, forceRender] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        forceRender((n) => n + 1);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        forceRender((n) => n + 1);
      },
      onPanResponderRelease: () => {
        if (currentPath.current) {
          const updated = [...paths, currentPath.current];
          setPaths(updated);
          currentPath.current = "";
          const combined = updated.join(" ");
          onSignatureChange(combined, updated.length === 0);
        }
      },
    }),
  ).current;

  const clear = () => {
    setPaths([]);
    currentPath.current = "";
    onSignatureChange("", true);
  };

  const isEmpty = paths.length === 0 && !currentPath.current;

  return (
    <View>
      <View
        style={[styles.canvas, { width, height }]}
        {...panResponder.panHandlers}
      >
        <Svg width={width} height={height}>
          {paths.map((p, i) => (
            <Path
              key={i}
              d={p}
              stroke={COLORS.text}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath.current ? (
            <Path
              d={currentPath.current}
              stroke={COLORS.text}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
        {isEmpty && (
          <View style={styles.placeholder} pointerEvents="none">
            <Ionicons
              name="create-outline"
              size={22}
              color={COLORS.placeholder}
            />
            <Text style={styles.placeholderText}>
              Sign here with your finger
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.clearBtn} onPress={clear}>
        <Ionicons name="refresh-outline" size={14} color={COLORS.primary} />
        <Text style={styles.clearBtnText}>Clear Signature</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    position: "absolute",
    alignItems: "center",
    gap: 4,
  },
  placeholderText: {
    fontSize: SIZES.fontXs,
    color: COLORS.placeholder,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
