import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import { Linking } from "react-native";
import { createPaymentOrder, verifyTestPayment } from "@/lib/api";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { PRODUCT_COPY } from "@web/lib/product-copy";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { DossierCard } from "@/components/ui/DossierCard";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Props = {
  reportId: string;
  visible: boolean;
  onClose: () => void;
  onUnlocked: () => void;
};

export function PaywallSheet({ reportId, visible, onClose, onUnlocked }: Props) {
  async function handleUnlock() {
    const order = await createPaymentOrder(reportId, "report_unlock");
    if (order.mode === "test" || !order.requiresRealCheckout) {
      await verifyTestPayment(reportId, order.orderId);
      onUnlocked();
      onClose();
      return;
    }

    const base = getValidatedMobileApiBaseUrl();
    const returnUrl = ExpoLinking.createURL(`/report/${reportId}`, { queryParams: { checkout: "report_return" } });
    const payUrl = `${base}/report/${reportId}?paywall=open&return_to=${encodeURIComponent(returnUrl)}`;
    await Linking.openURL(payUrl);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.content}>
            <FoilLabel>{PRODUCT_COPY.report.name}</FoilLabel>
            <Text style={styles.title}>Unlock your full beauty dossier</Text>
            <Text style={styles.price}>
              ₹{PRODUCT_COPY.report.priceInr}
              <Text style={styles.strike}> ₹{PRODUCT_COPY.report.strikeInr}</Text>
            </Text>
            <DossierCard style={styles.perks}>
              {PRODUCT_COPY.report.items.map((item) => (
                <Text key={item} style={styles.perk}>
                  ✓ {item}
                </Text>
              ))}
            </DossierCard>
            <PrimaryButton label="Unlock now →" onPress={handleUnlock} />
            <PrimaryButton label="Not now" onPress={onClose} variant="outline" style={{ marginTop: 8 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: atelier.color.overlayDark,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: atelier.color.parchment,
    borderTopLeftRadius: atelier.radius.xl,
    borderTopRightRadius: atelier.radius.xl,
    maxHeight: "85%",
  },
  content: { padding: atelier.space.lg, gap: atelier.space.md },
  title: { ...displayFont(), ...atelier.type.h2 },
  price: { ...displayFont(), fontSize: 28, color: atelier.color.terracotta },
  strike: { ...bodyFont(), fontSize: 16, textDecorationLine: "line-through", color: atelier.color.inkMist },
  perks: { gap: 8 },
  perk: { ...bodyFont(), ...atelier.type.body },
});
