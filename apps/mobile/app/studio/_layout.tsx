import { ActivityIndicator, SafeAreaView, View } from "react-native";
import { Stack } from "expo-router";
import { useRequireMobileSession } from "@/lib/use-mobile-session";
import { mobileTheme as t } from "@/lib/theme";

export default function StudioLayout() {
  const isAuthed = useRequireMobileSession();

  if (!isAuthed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={t.color.text} />
        </View>
      </SafeAreaView>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
