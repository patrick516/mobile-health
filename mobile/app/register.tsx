import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { useState, useMemo } from "react";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import InputField from "../src/components/InputField";
import PrimaryButton from "../src/components/PrimaryButton";
import { registerUser } from "../src/services/auth.service";
import { useAuthStore } from "../src/store/authStore";
import SelectDropdown from "../src/components/SelectDropdown";
import { COUNTRIES, getDistricts, getTowns } from "../src/data/locationData";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleCountryChange = (val: string) => {
    setCountry(val);
    setDistrict("");
    setTown("");
  };
  const handleDistrictChange = (val: string) => {
    setDistrict(val);
    setTown("");
  };

  const districts = useMemo(
    () => (country ? getDistricts(country) : []),
    [country],
  );
  const towns = useMemo(() => (district ? getTowns(district) : []), [district]);

  const countryOptions = useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.code,
        label: c.name,
        prefix: c.flag,
      })),
    [],
  );
  const districtOptions = useMemo(
    () => districts.map((d) => ({ value: d.id, label: d.name })),
    [districts],
  );
  const townOptions = useMemo(
    () => towns.map((t) => ({ value: t.id, label: t.name })),
    [towns],
  );
  const genderOptions = useMemo(
    () => [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
    [],
  );

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDobDate(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      setDob(`${day}/${month}/${year}`);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in your name, email and password.");
      return;
    }
    setLoading(true);
    try {
      const response = await registerUser({
        name,
        email,
        password,
        date_of_birth: dob || undefined,
        gender: gender || undefined,
        country: country || undefined,
        district: district || undefined,
        town: town || undefined,
      });
      if (response?.token && response?.user) {
        setAuth(response.token, response.user);
        router.replace("/upload-photos");
      }
    } catch (error: any) {
      Alert.alert(
        "Registration Failed",
        error.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Create Account <Text style={styles.heartEmoji}>💜</Text>
          </Text>
          <Text style={styles.headerSub}>Join AnzathuConnect today</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Personal Info</Text>

          <InputField
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            iconName="person"
          />
          <InputField
            placeholder="Email"
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

          {/* ── Date of Birth Picker ── */}
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateText, !dob && styles.datePlaceholder]}>
              {dob || "Date of Birth (DD/MM/YYYY)"}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dobDate ?? new Date(2000, 0, 1)}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          <SelectDropdown
            placeholder="Select Gender"
            options={genderOptions}
            value={gender}
            onChange={setGender}
            iconName="👤"
          />

          {/* ── Divider ── */}
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionLabel}>Location</Text>

          <SelectDropdown
            placeholder="Select Country"
            options={countryOptions}
            value={country}
            onChange={handleCountryChange}
            iconName="🌍"
          />
          <SelectDropdown
            placeholder={
              country ? "Select District / Province" : "Select country first"
            }
            options={districtOptions}
            value={district}
            onChange={handleDistrictChange}
            iconName="🏙️"
            disabled={!country}
          />
          <SelectDropdown
            placeholder={
              district ? "Select Town / Area" : "Select district first"
            }
            options={townOptions}
            value={town}
            onChange={setTown}
            iconName="📌"
            disabled={!district}
          />

          {/* Terms */}
          <View style={styles.sectionDivider} />
          <Text style={styles.termsText}>
            By signing up, you agree to our{" "}
            <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          <PrimaryButton
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
          />
        </View>

        {/* ── Login link ── */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push("/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7FF" },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },
  header: { marginBottom: 28 },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1F0A3C",
    letterSpacing: 0.2,
  },
  heartEmoji: { fontSize: 26 },
  headerSub: { marginTop: 6, fontSize: 14, color: "#6B7280" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#F3EEFF",
    marginVertical: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  dateText: {
    fontSize: 14,
    color: "#1F0A3C",
  },
  datePlaceholder: {
    color: "#9CA3AF",
  },
  termsText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 16,
  },
  termsLink: { color: "#7C3AED", fontWeight: "600" },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  loginText: { fontSize: 14, color: "#6B7280" },
  loginLink: { fontSize: 14, fontWeight: "700", color: "#7C3AED" },
});
