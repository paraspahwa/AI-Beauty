import * as React from "react";
import { ActivityIndicator, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { useFonts, Fraunces_400Regular, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from "@expo-google-fonts/instrument-sans";
import { atelier } from "@/lib/theme";

type ThemeContextValue = {
  fontsLoaded: boolean;
};

const ThemeContext = React.createContext<ThemeContextValue>({ fontsLoaded: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={atelier.color.terracotta} />
      </View>
    );
  }

  return <ThemeContext.Provider value={{ fontsLoaded }}>{children}</ThemeContext.Provider>;
}

export function useThemeReady(): boolean {
  return React.useContext(ThemeContext).fontsLoaded;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: atelier.color.parchment,
  },
});

export function displayFont(style?: TextStyle): TextStyle {
  return { fontFamily: atelier.font.display, color: atelier.color.espresso, ...style };
}

export function bodyFont(style?: TextStyle): TextStyle {
  return { fontFamily: atelier.font.body, color: atelier.color.inkStone, ...style };
}

export function panelStyle(extra?: ViewStyle): ViewStyle {
  return {
    backgroundColor: atelier.color.surface,
    borderRadius: atelier.radius.xl,
    borderWidth: 1,
    borderColor: `${atelier.color.terracotta}22`,
    ...atelier.shadow.card,
    ...extra,
  };
}
