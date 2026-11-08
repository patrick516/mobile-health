import { router } from "expo-router";

// Browser-like back: return to the previous screen when there is history;
// otherwise fall back to the home main section (bottom icons already jump
// to main sections directly).
export const goBack = (fallback: string = "/(app)/home") => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
};
