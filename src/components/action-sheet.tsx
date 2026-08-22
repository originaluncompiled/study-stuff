import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  View,
  findNodeHandle,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';
import {
  ACTION_SHEET_MAX_UPWARD_OFFSET,
  getActionSheetDragOffset,
  shouldDismissActionSheet,
} from '@/lib/action-sheet-motion';

type ActionSheetProps = {
  children: ReactNode;
  description?: string;
  onDismiss: () => void;
  title: string;
  visible: boolean;
};

const snapSpring = {
  damping: 24,
  mass: 0.8,
  overshootClamping: true,
  stiffness: 280,
} as const;

export function ActionSheet({ children, description, onDismiss, title, visible }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const titleRef = useRef<View>(null);
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(windowHeight);
  const dragStartY = useSharedValue(0);
  const dismissing = useSharedValue(false);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.get() }));
  const panelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.get() }],
  }));

  useEffect(() => {
    if (!visible) {
      cancelAnimation(backdropOpacity);
      cancelAnimation(sheetTranslateY);
      backdropOpacity.set(0);
      sheetTranslateY.set(windowHeight);
      dismissing.set(false);
    }
  }, [backdropOpacity, dismissing, sheetTranslateY, visible, windowHeight]);

  function focusTitle() {
    const node = findNodeHandle(titleRef.current);
    if (node) {
      setTimeout(() => AccessibilityInfo.setAccessibilityFocus(node), 100);
    }
  }

  function openSheet() {
    dismissing.set(false);
    backdropOpacity.set(0);
    sheetTranslateY.set(windowHeight);
    backdropOpacity.set(withTiming(0.4, { duration: 180 }));
    sheetTranslateY.set(
      withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      }),
    );
    focusTitle();
  }

  function dismissSheet() {
    if (dismissing.get()) {
      return;
    }
    dismissing.set(true);
    backdropOpacity.set(withTiming(0, { duration: 160 }));
    sheetTranslateY.set(
      withTiming(
        windowHeight,
        { duration: 200, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            dismissing.set(false);
            runOnJS(onDismiss)();
          }
        },
      ),
    );
  }

  const panGesture = Gesture.Pan()
    .withTestId('action-sheet-pan')
    .activeOffsetY([-4, 4])
    .onStart(() => {
      cancelAnimation(sheetTranslateY);
      dragStartY.set(sheetTranslateY.get());
    })
    .onUpdate((event) => {
      sheetTranslateY.set(getActionSheetDragOffset(dragStartY.get() + event.translationY));
    })
    .onEnd((event) => {
      if (shouldDismissActionSheet(event.translationY, event.velocityY / 1000)) {
        if (dismissing.get()) {
          return;
        }
        dismissing.set(true);
        backdropOpacity.set(withTiming(0, { duration: 160 }));
        sheetTranslateY.set(
          withTiming(
            windowHeight,
            { duration: 200, easing: Easing.in(Easing.cubic) },
            (finished) => {
              if (finished) {
                dismissing.set(false);
                runOnJS(onDismiss)();
              }
            },
          ),
        );
      } else {
        sheetTranslateY.set(withSpring(0, snapSpring));
      }
    })
    .onFinalize((_event, success) => {
      if (!success && !dismissing.get()) {
        sheetTranslateY.set(withSpring(0, snapSpring));
      }
    });

  return (
    <Modal
      animationType="none"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={dismissSheet}
      onShow={openSheet}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      testID="action-sheet-modal"
      transparent
      visible={visible}>
      <GestureHandlerRootView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        testID="action-sheet-gesture-root">
        <Animated.View
          className="absolute inset-0 bg-black"
          pointerEvents="none"
          style={backdropAnimatedStyle}
          testID="action-sheet-backdrop"
        />
        <Pressable
          accessible={false}
          className="absolute inset-0"
          onPress={dismissSheet}
          testID="action-sheet-dismiss-overlay"
        />
        <Animated.View
          accessibilityViewIsModal
          className="rounded-t-[32px] border-2 border-b-0 border-ink bg-paper-raised px-5 pt-1"
          importantForAccessibility="yes"
          style={[
            {
              marginBottom: -ACTION_SHEET_MAX_UPWARD_OFFSET,
              paddingBottom:
                Math.max(insets.bottom, 24) + ACTION_SHEET_MAX_UPWARD_OFFSET,
            },
            panelAnimatedStyle,
          ]}
          testID="action-sheet-panel">
          <GestureDetector gesture={panGesture}>
            <View
              accessible
              accessibilityHint="Drag up or down. Swipe down to dismiss."
              accessibilityLabel="Adjust sheet"
              accessibilityRole="adjustable"
              className="h-9 items-center justify-center"
              testID="action-sheet-drag-handle">
              <View className="h-1.5 w-11 rounded-full bg-ink" />
            </View>
          </GestureDetector>
          <View ref={titleRef} accessible accessibilityRole="header">
            <AppText variant="title" className="text-2xl">
              {title}
            </AppText>
          </View>
          {description ? (
            <AppText variant="caption" className="mb-4 mt-1">
              {description}
            </AppText>
          ) : (
            <View className="h-4" />
          )}
          <View className="gap-3">{children}</View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

type ActionRowProps = {
  destructive?: boolean;
  description?: string;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

export function ActionRow({ destructive, description, icon: Icon, label, onPress }: ActionRowProps) {
  const color = destructive ? colors.danger : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center rounded-2xl border border-line bg-paper px-4 py-4 active:bg-[#EEE4CF]"
      onPress={onPress}>
      <View className="mr-4 h-11 w-11 items-center justify-center rounded-xl bg-paper-raised">
        <Icon color={color} size={23} strokeWidth={2.1} />
      </View>
      <View className="flex-1">
        <AppText variant="label" style={{ color }}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" className="mt-0.5">
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
