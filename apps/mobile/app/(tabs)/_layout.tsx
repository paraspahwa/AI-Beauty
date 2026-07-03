import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { atelier } from "@/lib/theme";
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
      <SafeAreaView style={{ flex: 1, backgroundColor: atelier.color.parchment }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={atelier.color.terracotta} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: atelier.color.espresso,
        tabBarInactiveTintColor: atelier.color.inkMist,
        tabBarStyle: { backgroundColor: atelier.color.surface, borderTopColor: atelier.color.border },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
      <Tabs.Screen name="vault" options={{ title: "Vault" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
