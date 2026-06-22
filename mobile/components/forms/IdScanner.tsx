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
import { parseMrz, ParsedMrz } from "../../src/utils/mrzParser";

interface IdScannerProps {
  value: string;
  onChange: (idNumber: string) => void;
  label?: string;
  required?: boolean;
  onParsedData?: (data: ParsedMrz) => void; // optional — used to auto-fill name/DOB/sex
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
  onParsedData,
}: IdScannerProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastParsed, setLastParsed] = useState<ParsedMrz | null>(null);

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
    setScannerOpen(false);

    const parsed = parseMrz(data.trim());

    if (parsed && parsed.idNumber) {
      // Successfully parsed structured MRZ data
      onChange(parsed.idNumber);
      setLastParsed(parsed);
      if (onParsedData) onParsedData(parsed);
      Alert.alert(
        "ID Scanned",
        `National ID: ${parsed.idNumber}\nName: ${parsed.fullName || "—"}\nDOB: ${parsed.dateOfBirth || "—"}`,
      );
    } else {
      // Couldn't parse — fall back to storing the raw value
      onChange(data.trim());
      setLastParsed(null);
      Alert.alert(
        "ID Scanned",
        "Could not fully read the ID format. Raw value captured — please verify and edit if needed.",
      );
    }
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

      {lastParsed && (
        <View style={styles.parsedBox}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.parsedText}>
              {lastParsed.fullName || "Name not detected"}
            </Text>
            <Text style={styles.parsedSubText}>
              {lastParsed.dateOfBirth ? `DOB: ${lastParsed.dateOfBirth}` : ""}
              {lastParsed.dateOfBirth && lastParsed.sex !== "UNKNOWN"
                ? " · "
                : ""}
              {lastParsed.sex !== "UNKNOWN" ? lastParsed.sex : ""}
            </Text>
          </View>
        </View>
      )}

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
  parsedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: SIZES.radiusMd,
    padding: SIZES.sm,
    marginTop: SIZES.sm,
  },
  parsedText: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: "#166534",
  },
  parsedSubText: {
    fontSize: SIZES.fontXs,
    color: "#166534",
    marginTop: 1,
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
