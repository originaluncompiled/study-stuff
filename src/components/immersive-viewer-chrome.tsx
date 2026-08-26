import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Clock3, Coffee, Pause } from 'lucide-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StatusBar as NativeStatusBar,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { TimerManagerSheet } from '@/components/timer-manager-sheet';
import { formatTimer } from '@/lib/timer';
import { useThemeColors, useThemeStore } from '@/store/theme-store';
import { useTimerStore } from '@/store/timer-store';

const HEADER_CONTENT_HEIGHT = 44;
const TIMER_PILL_GAP = 12;

type ViewerOrientation = 'landscape' | 'portrait';

export function useImmersiveViewerChrome(headerVisible: boolean) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const orientation: ViewerOrientation = width > height ? 'landscape' : 'portrait';
  const measuredHeaderTopInset =
    Platform.OS === 'android'
      ? Math.max(insets.top, NativeStatusBar.currentHeight ?? 0)
      : insets.top;
  const [headerTopInsets, setHeaderTopInsets] = useState<
    Partial<Record<ViewerOrientation, number>>
  >(() => ({ [orientation]: measuredHeaderTopInset }));
  const headerProgress = useSharedValue(1);
  const headerTopInset = Math.max(
    headerTopInsets[orientation] ?? measuredHeaderTopInset,
    measuredHeaderTopInset,
  );
  const headerHeight = headerTopInset + HEADER_CONTENT_HEIGHT;
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.get(),
    transform: [{ translateY: (headerProgress.get() - 1) * headerHeight }],
  }));

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHeaderTopInsets((currentInsets) => {
        if ((currentInsets[orientation] ?? 0) >= measuredHeaderTopInset) {
          return currentInsets;
        }
        return { ...currentInsets, [orientation]: measuredHeaderTopInset };
      });
    }, 0);
    return () => clearTimeout(timeout);
  }, [measuredHeaderTopInset, orientation]);

  useEffect(() => {
    headerProgress.set(
      withTiming(headerVisible ? 1 : 0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [headerProgress, headerVisible]);

  return { headerAnimatedStyle, headerHeight, headerTopInset, insets };
}

type ViewerChrome = ReturnType<typeof useImmersiveViewerChrome>;

export function ImmersiveViewerChrome({
  chrome,
  headerVisible,
  onBack,
  rightAction,
  testIDPrefix,
  timerPillGap = TIMER_PILL_GAP,
  title,
  tone = 'dark',
}: {
  chrome: ViewerChrome;
  headerVisible: boolean;
  onBack: () => void;
  rightAction?: ReactNode;
  testIDPrefix: string;
  timerPillGap?: number;
  title: string;
  tone?: 'dark' | 'paper';
}) {
  const colors = useThemeColors();
  const themeMode = useThemeStore((state) => state.mode);
  const [timerManagerSession, setTimerManagerSession] = useState<string | null>(null);
  const timerHydrated = useTimerStore((state) => state.hydrated);
  const timerStatus = useTimerStore((state) => state.status);
  const timerPhase = useTimerStore((state) => state.phase);
  const timerDeadlineAtMs = useTimerStore((state) => state.deadlineAtMs);
  const timerRemainingMs = useTimerStore((state) => state.remainingMs);
  const timerSecondsRemaining = useTimerStore((state) => state.secondsRemaining);
  const timerActive = timerHydrated && timerStatus !== 'idle';
  const TimerPillIcon = timerStatus === 'paused' ? Pause : timerPhase === 'rest' ? Coffee : Clock3;
  const timerSession =
    timerStatus === 'running'
      ? `${timerPhase}:running:${timerDeadlineAtMs}`
      : timerStatus === 'paused'
        ? `${timerPhase}:paused:${timerRemainingMs}`
        : null;
  const timerManagerVisible = timerSession !== null && timerManagerSession === timerSession;
  const dark = tone === 'dark';
  const foreground = dark ? colors.viewerForeground : colors.ink;

  return (
    <>
      <StatusBar
        animated
        hidden={!headerVisible}
        hideTransitionAnimation="fade"
        style={dark || themeMode === 'dark' ? 'light' : 'dark'}
      />
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.View
        accessibilityElementsHidden={!headerVisible}
        importantForAccessibility={headerVisible ? 'auto' : 'no-hide-descendants'}
        pointerEvents={headerVisible ? 'auto' : 'none'}
        testID={`${testIDPrefix}-header`}
        className={`absolute left-0 right-0 top-0 z-30 px-2 ${dark ? 'bg-viewer' : 'bg-paper'}`}
        style={[
          { height: chrome.headerHeight, paddingTop: chrome.headerTopInset },
          chrome.headerAnimatedStyle,
        ]}>
        <View className="h-11 flex-row items-center">
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            className={`h-11 w-12 items-center justify-center rounded-full ${dark ? 'active:bg-white/10' : 'active:bg-line/50'}`}
            onPress={onBack}>
            <ChevronLeft color={foreground} size={30} strokeWidth={2.2} />
          </Pressable>
          <AppText
            accessibilityRole="header"
            ellipsizeMode="middle"
            numberOfLines={1}
            variant="label"
            className={`flex-1 text-center ${dark ? 'text-viewer-foreground' : 'text-ink'}`}>
            {title}
          </AppText>
          <View className="h-11 w-12 items-center justify-center">{rightAction}</View>
        </View>
      </Animated.View>
      {timerActive ? (
        <Animated.View
          accessibilityElementsHidden={!headerVisible}
          importantForAccessibility={headerVisible ? 'auto' : 'no-hide-descendants'}
          pointerEvents={headerVisible ? 'box-none' : 'none'}
          testID={`${testIDPrefix}-timer-pill`}
          className="absolute left-0 right-0 z-40 items-center"
          style={[
            { top: chrome.headerHeight + timerPillGap },
            chrome.headerAnimatedStyle,
          ]}>
          <View className="relative h-11 min-w-28">
            <View className="absolute inset-0 translate-x-1 translate-y-1 rounded-full bg-offset-shadow" />
            <Pressable
              accessibilityLabel={`${timerPhase === 'study' ? 'Study' : 'Rest'} timer${timerStatus === 'paused' ? ' paused' : ''}, ${formatTimer(timerSecondsRemaining)} remaining. Open timer controls.`}
              accessibilityRole="button"
              accessibilityState={{ expanded: timerManagerVisible }}
              className="h-11 min-w-28 flex-row items-center justify-center gap-2 rounded-full border-2 border-offset-shadow bg-purple px-4 active:bg-purple-dark"
              onPress={() => setTimerManagerSession(timerSession)}>
              <TimerPillIcon
                color={colors.onPurple}
                size={16}
                strokeWidth={2.4}
                testID={
                  timerStatus === 'paused'
                    ? `${testIDPrefix}-timer-paused-icon`
                    : timerPhase === 'rest'
                      ? `${testIDPrefix}-timer-rest-icon`
                      : `${testIDPrefix}-timer-running-icon`
                }
              />
              <AppText className="text-on-purple" variant="label">
                {formatTimer(timerSecondsRemaining)}
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
      <TimerManagerSheet
        onDismiss={() => setTimerManagerSession(null)}
        visible={timerManagerVisible}
      />
    </>
  );
}
