import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { listReports } from "@/lib/api";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { PageHeader } from "@/components/ui/PageHeader";
import { DossierCard } from "@/components/ui/DossierCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { FoilLabel } from "@/components/ui/FoilLabel";

export default function AccountTabScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [reportCount, setReportCount] = useState(0);

  const isFormValid = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const authed = Boolean(data.session?.user);
    setSignedIn(authed);
    if (authed) {
      const reports = await listReports(50).catch(() => []);
      setReportCount(reports.length);
    } else {
      setReportCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function signIn() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refresh();
      router.replace("/(tabs)/home");
    } catch (err) {
      Alert.alert("Sign in failed", String(err));
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      Alert.alert("Check your email", "Confirm your account, then sign in.");
    } catch (err) {
      Alert.alert("Sign up failed", String(err));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    await refresh();
  }

  async function openPrivacy() {
    const base = getValidatedMobileApiBaseUrl();
    await Linking.openURL(`${base}/privacy`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <PageHeader foil="Account" title={signedIn ? "Signed in" : "Welcome"} subtitle="Your Renovaara dossier travels with you." />

        {signedIn ? (
          <DossierCard style={styles.card}>
            <FoilLabel>Status</FoilLabel>
            <Text style={styles.body}>{reportCount} reports in your archive</Text>
            <PrimaryButton label="View reports" onPress={() => router.push("/(tabs)/reports")} />
            <PrimaryButton label="Open vault" onPress={() => router.push("/(tabs)/vault")} variant="outline" style={{ marginTop: 8 }} />
            <PrimaryButton label="Sign out" onPress={() => void signOut()} variant="outline" style={{ marginTop: 8 }} />
          </DossierCard>
        ) : (
          <DossierCard style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={atelier.color.inkMist}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={atelier.color.inkMist}
            />
            <PrimaryButton label="Sign in" onPress={() => void signIn()} loading={loading} disabled={!isFormValid} />
            <PrimaryButton label="Create account" onPress={() => void signUp()} variant="outline" style={{ marginTop: 8 }} disabled={!isFormValid} />
          </DossierCard>
        )}

        <PrimaryButton label="Privacy policy" onPress={() => void openPrivacy()} variant="outline" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.color.parchment },
  container: { padding: atelier.space.md },
  card: { gap: 10, marginBottom: 16 },
  label: { ...bodyFont(), fontFamily: atelier.font.bodySemibold, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: atelier.color.border,
    borderRadius: atelier.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: atelier.color.surface,
    fontFamily: atelier.font.body,
    color: atelier.color.espresso,
  },
  body: { ...bodyFont() },
});
