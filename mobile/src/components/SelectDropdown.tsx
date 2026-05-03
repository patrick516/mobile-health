import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useState } from "react";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SelectOption {
  label: string;
  value: string;
  prefix?: string; // e.g. flag emoji
}

interface SelectDropdownProps {
  placeholder: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  iconName?: string;
  disabled?: boolean;
}

export default function SelectDropdown({
  placeholder,
  options,
  value,
  onChange,
  iconName = "📍",
  disabled = false,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          open && styles.triggerOpen,
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={disabled ? 1 : 0.8}
      >
        {/* Left icon */}
        <Text style={styles.leftIcon}>{iconName}</Text>

        {/* Selected value or placeholder */}
        <View style={styles.triggerContent}>
          {selected ? (
            <Text style={styles.selectedText}>
              {selected.prefix ? `${selected.prefix}  ` : ""}
              {selected.label}
            </Text>
          ) : (
            <Text style={styles.placeholderText}>{placeholder}</Text>
          )}
        </View>

        {/* Chevron */}
        <Text style={[styles.chevron, open && styles.chevronUp]}>›</Text>
      </TouchableOpacity>

      {/* Modal dropdown */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Title */}
            <Text style={styles.sheetTitle}>{placeholder}</Text>

            {/* Options list */}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    {item.prefix && (
                      <Text style={styles.optionPrefix}>{item.prefix}</Text>
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger button
  trigger: {
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
  triggerOpen: {
    borderColor: "#7C3AED",
    backgroundColor: "#FFFFFF",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  triggerDisabled: {
    opacity: 0.45,
    backgroundColor: "#F3F4F6",
  },
  leftIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.6,
  },
  triggerContent: {
    flex: 1,
  },
  selectedText: {
    fontSize: 15,
    color: "#1F0A3C",
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  chevron: {
    fontSize: 22,
    color: "#9CA3AF",
    transform: [{ rotate: "90deg" }],
    marginLeft: 6,
    lineHeight: 24,
  },
  chevronUp: {
    transform: [{ rotate: "-90deg" }],
    color: "#7C3AED",
  },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,2,40,0.55)",
    justifyContent: "flex-end",
  },

  // Bottom sheet
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.62,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E9D8FD",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F0A3C",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  list: {
    paddingHorizontal: 16,
  },

  // Options
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
  },
  optionSelected: {
    backgroundColor: "#F3EEFF",
  },
  optionPrefix: {
    fontSize: 20,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    fontWeight: "400",
  },
  optionTextSelected: {
    color: "#7C3AED",
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 16,
    color: "#7C3AED",
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "#F3EEFF",
    marginHorizontal: 4,
  },
});
