import { useMemo, useRef, useState } from "react";
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { mobileTheme as t } from "@/lib/theme";

type BeforeAfterCompareProps = {
  beforeUri: string;
  afterUri: string;
  height?: number;
};

export function BeforeAfterCompare({ beforeUri, afterUri, height = 420 }: BeforeAfterCompareProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [ratio, setRatio] = useState(0.5);

  const ratioRef = useRef(ratio);
  ratioRef.current = ratio;
  const startRatioRef = useRef(ratio);

  const clamp = (value: number) => Math.max(0.1, Math.min(0.9, value));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          return Math.abs(gestureState.dx) > 3;
        },
        onPanResponderGrant: () => {
          startRatioRef.current = ratioRef.current;
        },
        onPanResponderMove: (_event, gestureState) => {
          if (containerWidth <= 0) return;
          const next = clamp(startRatioRef.current + gestureState.dx / containerWidth);
          setRatio(next);
        },
      }),
    [containerWidth],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setContainerWidth(width);
  };

  const overlayWidth = Math.max(0, containerWidth * ratio);
  const handleX = overlayWidth - 13;

  return (
    <View>
      <View style={[styles.container, { height }]} onLayout={handleLayout}>
        <Image source={{ uri: beforeUri }} style={styles.image} />

        {containerWidth > 0 ? (
          <View style={[styles.afterClip, { width: overlayWidth }]}> 
            <Image source={{ uri: afterUri }} style={styles.image} />
          </View>
        ) : null}

        {containerWidth > 0 ? (
          <View style={[styles.divider, { left: handleX }]} {...panResponder.panHandlers}>
            <View style={styles.dividerPill}>
              <Text style={styles.dividerPillText}>↔</Text>
            </View>
          </View>
        ) : null}

        <Pressable style={styles.labelBefore} onPress={() => setRatio(0.1)}>
          <Text style={styles.labelText}>Before</Text>
        </Pressable>
        <Pressable style={styles.labelAfter} onPress={() => setRatio(0.9)}>
          <Text style={styles.labelText}>After</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Drag the center handle to compare.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: t.color.surfaceSubtle,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  afterClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  divider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  dividerPill: {
    borderRadius: 999,
    backgroundColor: t.color.overlayDark78,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  dividerPillText: {
    color: t.color.textOnDark,
    fontSize: 12,
    fontWeight: "800",
  },
  labelBefore: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 999,
    backgroundColor: t.color.overlayDark78,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  labelAfter: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 999,
    backgroundColor: t.color.overlayDark78,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  labelText: {
    color: t.color.textOnDark,
    fontSize: 11,
    fontWeight: "700",
  },
  hint: {
    marginTop: 8,
    color: t.color.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
});
