import * as Location from "expo-location";

export type Coordinates = { latitude: number; longitude: number };

/**
 * Offline-friendly GPS capture.
 *
 * GPS satellites need NO internet — only optional A-GPS assist data, which
 * merely speeds up the first fix. To keep registration working with no
 * signal at all:
 *  1. try a live fix, but bound the wait (expo-location has no timeout
 *     option, so an unbounded High-accuracy request can hang forever)
 *  2. fall back to the device's last known position (stored locally)
 *  3. return null if nothing is available — callers must never block
 *     saving on a GPS fix
 */
export async function captureCoordinates(
  accuracy: Location.Accuracy = Location.Accuracy.Balanced,
  timeoutMs = 15000,
): Promise<Coordinates | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const fix = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy,
        mayShowUserSettingsDialog: false,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("gps-timeout")), timeoutMs);
      }),
    ]);

    return {
      latitude: fix.coords.latitude,
      longitude: fix.coords.longitude,
    };
  } catch {
    try {
      const last = await Location.getLastKnownPositionAsync({
        maxAge: 15 * 60 * 1000,
      });
      if (last?.coords) {
        return {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        };
      }
    } catch {
      // no last-known position either
    }
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
