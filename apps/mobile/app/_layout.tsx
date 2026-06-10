import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GuestProgressMerge } from "@/components/GuestProgressMerge";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <GuestProgressMerge />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
