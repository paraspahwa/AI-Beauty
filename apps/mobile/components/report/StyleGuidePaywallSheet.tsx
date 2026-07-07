import { Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";
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

export function StyleGuidePaywallSheet({ reportId, visible, onClose, onUnlocked }: Props) {
  async function handleUnlock() {
    const order = await createPaymentOrder(reportId, "style_guide_addon");
    if (order.mode === "test" || !order.requiresRealCheckout) {
      await verifyTestPayment(reportId, order.orderId);
      onUnlocked();
      onClose();
      return;
    }

    const base = getValidatedMobileApiBaseUrl();
    const returnUrl = ExpoLinking.createURL(`/report/${reportId}`, {
      queryParams: { checkout: "style_guide_return" },
    });
    const payUrl = `${base}/report/${reportId}?paywall=style-guide&return_to=${encodeURIComponent(returnUrl)}`;
    await Linking.openURL(payUrl);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.content}>
            <FoilLabel>{PRODUCT_COPY.styleGuide.name}</FoilLabel>
            <Text style={styles.title}>Unlock your Personal Style Board</Text>
            <Text style={styles.price}>₹{PRODUCT_COPY.styleGuide.priceInr}</Text>
            <DossierCard style={styles.perks}>
              {PRODUCT_COPY.styleGuide.items.map((item) => (
                <Text key={item} style={styles.perk}>
                  ✓ {item}
                </Text>
              ))}
            </DossierCard>
            <PrimaryButton label="Unlock Style Guide →" onPress={handleUnlock} />
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
  perks: { gap: 8 },
  perk: { ...bodyFont(), ...atelier.type.body },
});
