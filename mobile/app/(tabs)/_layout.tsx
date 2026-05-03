import { Tabs } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";

const { width: W } = Dimensions.get("window");

// ── Icons ────────────────────────────────────────────────────────────────────
function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 21C12 21 3 14 3 8.5C3 5.4 5.4 3 8.5 3C10.2 3 11.7 3.8 12 5C12.3 3.8 13.8 3 15.5 3C18.6 3 21 5.4 21 8.5C21 14 12 21 12 21Z"
        fill={active ? "#E91E8C" : "#C4C4D4"}
      />
    </Svg>
  );
}
function ForYouIcon({ active }: { active: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke={active ? "#E91E8C" : "#C4C4D4"}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <Circle
        cx="9"
        cy="7"
        r="4"
        stroke={active ? "#E91E8C" : "#C4C4D4"}
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke={active ? "#E91E8C" : "#C4C4D4"}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
function LikesIcon({ active }: { active: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={active ? "#E91E8C" : "#C4C4D4"}
        strokeWidth="2"
        fill={active ? "#E91E8C" : "none"}
        strokeLinecap="round"
      />
    </Svg>
  );
}
function ChatsIcon({ active }: { active: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={active ? "#E91E8C" : "#C4C4D4"}
        strokeWidth="2"
        fill={active ? "rgba(233,30,140,0.15)" : "none"}
        strokeLinecap="round"
      />
    </Svg>
  );
}
function ProfileIcon({ active }: { active: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={active ? "#E91E8C" : "#C4C4D4"}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <Circle
        cx="12"
        cy="7"
        r="4"
        stroke={active ? "#E91E8C" : "#C4C4D4"}
        strokeWidth="2"
        fill={active ? "rgba(233,30,140,0.15)" : "none"}
      />
    </Svg>
  );
}

const TABS = [
  { name: "discover", label: "Discover", Icon: DiscoverIcon },
  { name: "for-you", label: "For You", Icon: ForYouIcon },
  { name: "likes", label: "Likes", Icon: LikesIcon },
  { name: "chats", label: "Chats", Icon: ChatsIcon },
  { name: "profile", label: "Profile", Icon: ProfileIcon },
];

function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab, i) => {
        const active = state.index === i;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            {active && <View style={styles.activeBar} />}
            <tab.Icon active={active} />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="for-you" />
      <Tabs.Screen name="likes" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingBottom: 28,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EBF8",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
    paddingTop: 4,
    position: "relative",
  },
  activeBar: {
    position: "absolute",
    top: -10,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#E91E8C",
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: "#C4C4D4",
  },
  labelActive: {
    color: "#E91E8C",
    fontWeight: "700",
  },
});
