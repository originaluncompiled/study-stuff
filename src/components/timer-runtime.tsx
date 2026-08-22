import * as Haptics from 'expo-haptics';
import { BookOpen, Coffee, Pause, Play, SkipForward, Square, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  AppState,
  Modal,
  Pressable,
  View,
  findNodeHandle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';
import { formatTimer } from '@/lib/timer';
import { useTimerStore } from '@/store/timer-store';

type TimerRuntimeProps = {
  showDialogs?: boolean;
};

export function TimerRuntime({ showDialogs = true }: TimerRuntimeProps) {
  const hydrated = useTimerStore((state) => state.hydrated);
  const status = useTimerStore((state) => state.status);
  const phase = useTimerStore((state) => state.phase);
  const reconcile = useTimerStore((state) => state.reconcile);
  const hapticsReady = useRef(hydrated);
  const previousTimer = useRef({ phase, status });

  useEffect(() => {
    const currentTimer = { phase, status };
    if (!hydrated || !hapticsReady.current) {
      hapticsReady.current = hydrated;
      previousTimer.current = currentTimer;
      return;
    }

    const previous = previousTimer.current;
    previousTimer.current = currentTimer;
    if (previous.phase !== phase || previous.status !== status) {
      void Haptics.selectionAsync();
    }
  }, [hydrated, phase, status]);

  useEffect(() => {
    if (!hydrated || status !== 'running') {
      return;
    }

    void reconcile();
    const interval = setInterval(() => void reconcile(), 250);
    return () => clearInterval(interval);
  }, [hydrated, reconcile, status]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void reconcile();
      }
    });
    return () => subscription.remove();
  }, [hydrated, reconcile]);

  if (!showDialogs || !hydrated) {
    return null;
  }

  if (status === 'awaitingContinuation') {
    return <SessionCompleteDialog />;
  }

  if ((status === 'running' || status === 'paused') && phase === 'rest') {
    return <RestTimerDialog />;
  }

  return null;
}

function RestTimerDialog() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const status = useTimerStore((state) => state.status);
  const secondsRemaining = useTimerStore((state) => state.secondsRemaining);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const skipRest = useTimerStore((state) => state.skipRest);
  const persistenceError = useTimerStore((state) => state.persistenceError);
  const [dismissed, setDismissed] = useState(false);
  const isLandscape = width > height;
  const paused = status === 'paused';
  const PrimaryIcon = paused ? Play : Pause;

  async function pauseOrResume() {
    await (paused ? resume() : pause());
    showTimerPersistenceWarning();
  }

  async function skip() {
    await skipRest();
    showTimerPersistenceWarning();
  }

  if (dismissed) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={() => setDismissed(true)}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape-left',
        'landscape-right',
      ]}
      transparent
      visible>
      <View
        className="flex-1 items-center justify-center bg-black/50 px-5"
        testID="rest-timer-dialog"
        style={{
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: Math.max(insets.top, 12),
        }}>
        <Pressable
          accessible={false}
          className="absolute inset-0"
          onPress={() => setDismissed(true)}
          testID="rest-timer-dismiss-overlay"
        />
        <View
          accessibilityViewIsModal
          className={`w-full max-w-lg border-2 border-ink bg-paper-raised ${
            isLandscape
              ? 'flex-row items-center gap-5 rounded-[24px] p-4'
              : 'rounded-[30px] p-5'
          }`}
          importantForAccessibility="yes"
          testID="rest-timer-panel">
          <Pressable
            accessibilityLabel="Close Rest Timer"
            accessibilityRole="button"
            className="absolute right-2 top-2 z-10 h-11 w-11 items-center justify-center rounded-full active:bg-line/40"
            hitSlop={4}
            onPress={() => setDismissed(true)}>
            <X color={colors.ink} size={22} strokeWidth={2.2} />
          </Pressable>
          <View className={isLandscape ? 'flex-1 flex-row items-center gap-4' : 'items-center'}>
            <View
              className={`items-center justify-center rounded-[20px] bg-purple ${
                isLandscape ? 'h-16 w-16' : 'h-20 w-20'
              }`}>
              <Coffee color={colors.paperRaised} size={isLandscape ? 30 : 38} strokeWidth={2.2} />
            </View>
            <View className={isLandscape ? 'flex-1' : 'mt-4 items-center'}>
              <AppText accessibilityRole="header" className="text-2xl" variant="title">
                Time to rest
              </AppText>
              <AppText className="mt-1 text-center" variant="caption">
                Take a breather before your next study session.
              </AppText>
              <AppText
                accessibilityLabel={`Rest time remaining, ${formatTimer(secondsRemaining)}`}
                className={isLandscape ? 'mt-2 text-[36px] leading-10' : 'mt-4 text-[52px] leading-[58px]'}
                variant="display">
                {formatTimer(secondsRemaining)}
              </AppText>
            </View>
          </View>

          <View className={`${isLandscape ? 'w-44 pt-10' : 'mt-5'} gap-3`}>
            <Pressable
              accessibilityLabel={paused ? 'Resume Rest Timer' : 'Pause Rest Timer'}
              accessibilityRole="button"
              className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-purple px-4 active:bg-purple-dark"
              onPress={() => void pauseOrResume()}>
              <PrimaryIcon
                color={colors.paperRaised}
                fill={paused ? colors.paperRaised : 'none'}
                size={20}
                strokeWidth={2.2}
              />
              <AppText className="text-paper-raised" variant="label">
                {paused ? 'Resume' : 'Pause'}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityLabel="Skip Rest"
              accessibilityRole="button"
              className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-paper px-4 active:bg-line/40"
              onPress={() => void skip()}>
              <SkipForward color={colors.ink} size={20} strokeWidth={2.2} />
              <AppText variant="label">Skip rest</AppText>
            </Pressable>
            {persistenceError ? (
              <AppText accessibilityLiveRegion="polite" className="text-danger" variant="caption">
                {persistenceError}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SessionCompleteDialog() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const titleRef = useRef<View>(null);
  const studyMinutes = useTimerStore((state) => state.studyMinutes);
  const restMinutes = useTimerStore((state) => state.restMinutes);
  const persistenceError = useTimerStore((state) => state.persistenceError);
  const start = useTimerStore((state) => state.start);
  const stop = useTimerStore((state) => state.stop);
  const isLandscape = width > height;

  function focusTitle() {
    const node = findNodeHandle(titleRef.current);
    if (node) {
      setTimeout(() => AccessibilityInfo.setAccessibilityFocus(node), 100);
    }
  }

  async function continueSession() {
    await start();
    showTimerPersistenceWarning();
  }

  async function stopSession() {
    await stop();
    showTimerPersistenceWarning();
  }

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={() => undefined}
      onShow={focusTitle}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape-left',
        'landscape-right',
      ]}
      transparent
      visible>
      <View
        className="flex-1 items-center justify-center bg-black/50 px-5"
        testID="session-complete-dialog"
        style={{
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: Math.max(insets.top, 12),
        }}>
        <View
          accessibilityViewIsModal
          className={`w-full max-w-lg border-2 border-ink bg-paper-raised ${
            isLandscape
              ? 'flex-row items-center gap-5 rounded-[24px] p-4'
              : 'rounded-[30px] p-5'
          }`}
          importantForAccessibility="yes"
          testID="session-complete-panel">
          <View className={isLandscape ? 'flex-1 flex-row items-center gap-4' : 'items-center'}>
            <View
              className={`items-center justify-center rounded-[20px] bg-purple ${
                isLandscape ? 'h-16 w-16' : 'h-20 w-20'
              }`}>
              <BookOpen
                color={colors.paperRaised}
                size={isLandscape ? 30 : 38}
                strokeWidth={2.2}
              />
            </View>
            <View className={isLandscape ? 'flex-1' : 'mt-4 items-center'}>
              <View ref={titleRef} accessible accessibilityRole="header">
                <AppText className="text-2xl" variant="title">
                  Rest complete
                </AppText>
              </View>
              <AppText className="mt-1 text-center" variant="caption">
                Continue with {studyMinutes} minutes of study and {restMinutes} minutes of rest, or
                stop this session.
              </AppText>
            </View>
          </View>

          <View className={`${isLandscape ? 'w-48' : 'mt-5'} gap-3`}>
            <Pressable
              accessibilityLabel="Continue Studying"
              accessibilityRole="button"
              className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-purple px-4 active:bg-purple-dark"
              onPress={() => void continueSession()}>
              <Play color={colors.paperRaised} fill={colors.paperRaised} size={20} strokeWidth={2.2} />
              <AppText className="text-paper-raised" variant="label">
                Continue
              </AppText>
            </Pressable>
            <Pressable
              accessibilityLabel="Stop Session"
              accessibilityRole="button"
              className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-paper px-4 active:bg-line/40"
              onPress={() => void stopSession()}>
              <Square color={colors.ink} size={19} strokeWidth={2.2} />
              <AppText variant="label">Stop session</AppText>
            </Pressable>
            {persistenceError ? (
              <AppText accessibilityLiveRegion="polite" className="text-danger" variant="caption">
                {persistenceError}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function showTimerPersistenceWarning() {
  if (useTimerStore.getState().persistenceError) {
    Alert.alert(
      'Timer not saved',
      'Your timer changed on this device, but the update may not survive an app restart.',
    );
  }
}
