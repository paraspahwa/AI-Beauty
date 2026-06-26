import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { mobileTheme as t } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

export default function TabsLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then((response) => {
      if (!mounted) return;
      setIsAuthed(Boolean(response.data.session?.user));
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      setIsAuthed(Boolean(session?.user));
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthed) {
      router.replace("/account");
    }
  }, [isAuthed, ready, router]);

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={t.color.text} />
        </View>
      </SafeAreaView>
    );
  }

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
      <Tabs.Screen name="account" options={{ title: "Account" }} />
      <Tabs.Screen name="studio" options={{ href: null }} />
    </Tabs>
  );
}
