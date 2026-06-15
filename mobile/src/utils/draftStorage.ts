import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "draft:";

// Save form state as a draft (call this debounced, on every field change)
export const saveDraft = async (
  key: string,
  data: Record<string, unknown>,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    // Non-critical — silently ignore
  }
};

// Load a saved draft (call this once on screen mount)
export const loadDraft = async <T = Record<string, unknown>>(
  key: string,
): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

// Clear a draft (call this after successful submit)
export const clearDraft = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // Non-critical
  }
};
