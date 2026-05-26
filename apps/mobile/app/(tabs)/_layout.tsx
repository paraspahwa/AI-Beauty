import { Tabs } from "expo-router";
import { mobileTheme as t } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.color.text,
        tabBarInactiveTintColor: t.color.textFaint,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
      <Tabs.Screen name="studio" options={{ title: "Studio" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}