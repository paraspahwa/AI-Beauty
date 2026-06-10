import { useEffect, useMemo, useRef, useState } from "react";
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
  autoSweep?: boolean;
};

export function BeforeAfterCompare({ beforeUri, afterUri, height = 420, autoSweep = true }: BeforeAfterCompareProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [ratio, setRatio] = useState(0.5);
  const [hintVisible, setHintVisible] = useState(autoSweep);
  const swept = useRef(false);

  const ratioRef = useRef(ratio);
  ratioRef.current = ratio;
  const startRatioRef = useRef(ratio);

  const clamp = (value: number) => Math.max(0.1, Math.min(0.9, value));

  useEffect(() => {
    if (!autoSweep || swept.current) return;
    swept.current = true;
    let frame: number;
    let start: number | null = null;
    const delay = setTimeout(() => {
      const animate = (ts: number) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / 1400, 1);
        const pos = progress < 0.6 ? (progress / 0.6) * 0.7 : 0.7 - ((progress - 0.6) / 0.4) * 0.2;
        setRatio(clamp(pos));
        if (progress < 1) frame = requestAnimationFrame(animate);
        else setTimeout(() => setHintVisible(false), 2000);
      };
      frame = requestAnimationFrame(animate);
    }, 400);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(frame);
    };
  }, [autoSweep]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dx) > 3,
        onPanResponderGrant: () => {
          startRatioRef.current = ratioRef.current;
          setHintVisible(false);
        },
        onPanResponderMove: (_event, gestureState) => {
          if (containerWidth <= 0) return;
          setRatio(clamp(startRatioRef.current + gestureState.dx / containerWidth));
        },
      }),
    [containerWidth],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const overlayWidth = Math.max(0, containerWidth * ratio);
  const handleX = overlayWidth - 13;

  return (
    <View accessibilityRole="adjustable" accessibilityLabel="Before and after comparison">
      <View style={[styles.container, { height }]} onLayout={handleLayout}>
        <Image source={{ uri: beforeUri }} style={styles.image} accessibilityLabel="Before" />

        {containerWidth > 0 ? (
          <View style={[styles.afterClip, { width: overlayWidth }]}>
            <Image source={{ uri: afterUri }} style={styles.image} accessibilityLabel="After" />
          </View>
        ) : null}

        {containerWidth > 0 ? (
          <View style={[styles.divider, { left: handleX }]} {...panResponder.panHandlers}>
            <View style={styles.dividerPill}>
              <Text style={styles.dividerPillText}>↔</Text>
            </View>
          </View>
        ) : null}

        <Pressable style={styles.labelBefore} onPress={() => setRatio(0.1)} accessibilityLabel="Show before">
          <Text style={styles.labelText}>Before</Text>
        </Pressable>
        <Pressable style={styles.labelAfter} onPress={() => setRatio(0.9)} accessibilityLabel="Show after">
          <Text style={styles.labelText}>After</Text>
        </Pressable>
      </View>
      {hintVisible ? <Text style={styles.hint}>Drag to compare</Text> : null}
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
