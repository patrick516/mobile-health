import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../constants/theme";

interface IdScannerProps {
  value: string;
  onChange: (idNumber: string) => void;
  label?: string;
  required?: boolean;
}

// Captures a National ID number either by typing manually or scanning the
// QR code printed on the back of the Malawi National ID card.
// NOTE: This only reads the raw QR string encoded on the card — it does NOT
// verify against the NRB database (that would require NRB/MoH partnership).
export default function IdScanner({
  value,
  onChange,
  label = "National ID Number",
  required = false,
}: IdScannerProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          "Camera Permission Needed",
          "Please allow camera access to scan the National ID QR code.",
        );
        return;
      }
    }
    setScanned(false);
    setScannerOpen(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    // Raw QR string captured — may contain just the ID number or a longer
    // encoded string depending on the card. We store it as-is.
    onChange(data.trim());
    setScannerOpen(false);
    Alert.alert(
      "ID Scanned",
      "National ID captured from QR code. You can edit it below if needed.",
    );
  };

  return (
    <View>
      <Text style={styles.label}>
        {label} {required ? "*" : "(optional)"}
      </Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={value}
          onChangeText={onChange}
          placeholder="e.g. MW12345678"
          placeholderTextColor={COLORS.placeholder}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
          <Ionicons name="qr-code-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Type the ID number manually, or tap the scan icon to scan the QR code on
        the back of the National ID card.
      </Text>

      <Modal visible={scannerOpen} animationType="slide">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setScannerOpen(false)}>
              <Ionicons name="close" size={26} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan National ID QR Code</Text>
            <View style={{ width: 26 }} />
          </View>

          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />

          <View style={styles.scannerFooter}>
            <View style={styles.scanFrame} />
            <Text style={styles.scannerHint}>
              Point the camera at the QR code on the back of the National ID
              card
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: SIZES.md,
  },
  row: { flexDirection: "row", gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  scanBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  scannerContainer: { flex: 1, backgroundColor: "#000" },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: SIZES.md,
    paddingHorizontal: SIZES.lg,
    backgroundColor: COLORS.primary,
  },
  scannerTitle: {
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
  },
  camera: { flex: 1 },
  scannerFooter: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 16,
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "transparent",
  },
  scannerHint: {
    color: COLORS.white,
    fontSize: SIZES.fontSm,
    textAlign: "center",
    paddingHorizontal: SIZES.xl,
  },
});
