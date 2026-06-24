import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "../../constants/theme";

interface IdScannerProps {
  value: string;
  onChange: (idNumber: string) => void;
  label?: string;
  required?: boolean;
  onParsedData?: (data: {
    fullName?: string;
    dateOfBirth?: string;
    sex?: string;
  }) => void;
}

// Extracts a likely National ID number from a raw QR string, regardless of
// which encoding format the specific ID card batch uses (different formats
// have been observed in the field — TD1 MRZ with newlines, and a simpler
// `~`-delimited format). Rather than committing to one fragile format, we
// look for the most ID-number-shaped token in the string.
function extractIdNumber(raw: string): string {
  const cleaned = raw.trim();

  // Try `~`-delimited format first: token before the first `~` that looks
  // like an alphanumeric ID (letters+digits, 5-15 chars)
  const tildeParts = cleaned
    .split("~")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of tildeParts) {
    if (
      /^[A-Z0-9]{5,15}$/i.test(part) &&
      /[0-9]/.test(part) &&
      /[A-Z]/i.test(part)
    ) {
      return part.toUpperCase();
    }
  }

  // Try newline-delimited TD1 MRZ format: look for a 9-char alphanumeric
  // block typically found in the document number field of line 1
  const lines = cleaned.split(/\r?\n/).filter(Boolean);
  if (lines.length >= 1) {
    const docMatch = lines[0].match(/[A-Z0-9<]{9}/);
    if (docMatch) {
      const idCandidate = docMatch[0].replace(/</g, "");
      if (idCandidate.length >= 5) return idCandidate.toUpperCase();
    }
  }

  // Fallback — strip separators and angle brackets, take the longest
  // alphanumeric run as a best guess
  const tokens = cleaned
    .split(/[~<\r\n]+/)
    .filter((t) => /[A-Z0-9]{5,}/i.test(t));
  if (tokens.length > 0) {
    return tokens.sort((a, b) => b.length - a.length)[0].toUpperCase();
  }

  // Last resort — return the raw cleaned string so nothing is silently lost
  return cleaned;
}

// Tries to pull a name/DOB/sex out of either known format, for optional
// auto-fill convenience. Returns whatever it can confidently find — never
// guesses if uncertain.
function extractMeta(raw: string): {
  fullName?: string;
  dateOfBirth?: string;
  sex?: string;
} {
  const cleaned = raw.trim();
  const meta: { fullName?: string; dateOfBirth?: string; sex?: string } = {};

  // `~`-delimited format: ID~SURNAME~~GIVEN~SEX~DOB~EXPIRY~
  const tildeParts = cleaned.split("~").map((p) => p.trim());
  if (tildeParts.length >= 5) {
    const sexToken = tildeParts.find((p) => /^(MALE|FEMALE|M|F)$/i.test(p));
    if (sexToken) meta.sex = /^M/i.test(sexToken) ? "MALE" : "FEMALE";

    const dateToken = tildeParts.find((p) =>
      /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(p),
    );
    if (dateToken) meta.dateOfBirth = dateToken;

    const nameParts = tildeParts.filter(
      (p) =>
        p &&
        p !== sexToken &&
        p !== dateToken &&
        !/^[A-Z0-9]{5,15}$/i.test(p) &&
        !/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(p),
    );
    if (nameParts.length > 0) meta.fullName = nameParts.join(" ").trim();
  }

  return meta;
}

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

    const idNumber = extractIdNumber(data);
    const meta = extractMeta(data);

    onChange(idNumber);
    if (onParsedData && (meta.fullName || meta.dateOfBirth || meta.sex)) {
      onParsedData(meta);
    }

    Alert.alert(
      "ID Scanned",
      `National ID: ${idNumber}${meta.fullName ? `\nName: ${meta.fullName}` : ""}`,
    );
  };

  return (
    <View>
      <Text style={styles.label}>
        {label} {required ? "*" : "(optional)"}
      </Text>

      {value ? (
        <View style={styles.scannedBox}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.scannedValue}>{value}</Text>
          <TouchableOpacity onPress={() => onChange("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
          <Ionicons name="qr-code-outline" size={20} color={COLORS.white} />
          <Text style={styles.scanBtnText}>Scan National ID QR Code</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.hint}>
        Scan the QR code on the back of the National ID card. Manual entry is
        disabled to ensure ID numbers are captured accurately.
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

          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.scanFrame} />
              <Text style={styles.scannerHint}>
                Point the camera at the QR code on the back of the National ID
                card
              </Text>
            </View>
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
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md,
  },
  scanBtnText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: SIZES.fontSm,
  },
  scannedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
  },
  scannedValue: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontWeight: "700",
    color: "#166534",
    fontFamily: "monospace",
  },
  hint: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 6,
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
  cameraWrapper: { flex: 1, position: "relative" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "transparent",
  },
  scannerHint: {
    color: COLORS.white,
    fontSize: SIZES.fontSm,
    textAlign: "center",
    paddingHorizontal: SIZES.xl,
    position: "absolute",
    bottom: 80,
  },
});
