import {
  BookOpen,
  Coffee,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { getMainTabBarHeight } from '@/components/main-tab-bar';
import {
  formatTimer,
  MAX_REST_MINUTES,
  MAX_STUDY_MINUTES,
  TIMER_DURATION_STEP,
} from '@/lib/timer';
import { useThemeColors } from '@/store/theme-store';
import { useTimerStore } from '@/store/timer-store';

const resetButtonSize = 56;
const timerControlGap = 12;

function DurationCard({
  disabled,
  icon: Icon,
  label,
  maxMinutes,
  minutes,
  onChange,
  purple,
}: {
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  maxMinutes: number;
  minutes: number;
  onChange: (minutes: number) => void;
  purple?: boolean;
}) {
  const colors = useThemeColors();
  const decreaseDisabled = disabled || minutes === 0;
  const increaseDisabled = disabled || minutes === maxMinutes;

  return (
    <View className="flex-1 rounded-[22px] border-2 border-strong-line bg-paper-raised p-3">
      <View className="flex-row items-center gap-2">
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${purple ? 'bg-purple' : 'bg-ink'}`}>
          <Icon color={purple ? colors.onPurple : colors.paper} size={20} strokeWidth={2.3} />
        </View>
        <AppText className="flex-1" numberOfLines={1} variant="label">
          {label}
        </AppText>
      </View>

      <View className="mt-3 flex-row items-center justify-between rounded-xl border border-line bg-paper p-1">
        <Pressable
          accessibilityLabel={`Decrease ${label}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: decreaseDisabled }}
          className={`h-11 w-11 items-center justify-center rounded-lg active:bg-line/40 ${
            decreaseDisabled ? 'opacity-30' : ''
          }`}
          disabled={decreaseDisabled}
          onPress={() => onChange(minutes - TIMER_DURATION_STEP)}>
          <Minus color={colors.ink} size={20} strokeWidth={2.4} />
        </Pressable>
        <View
          accessible
          accessibilityLabel={`${label}, ${minutes} minutes`}
          accessibilityLiveRegion="polite"
          className="items-center">
          <AppText className="text-2xl leading-7" variant="title">
            {minutes}
          </AppText>
          <AppText className="text-[11px] uppercase tracking-wider" variant="caption">
            min
          </AppText>
        </View>
        <Pressable
          accessibilityLabel={`Increase ${label}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: increaseDisabled }}
          className={`h-11 w-11 items-center justify-center rounded-lg active:bg-line/40 ${
            increaseDisabled ? 'opacity-30' : ''
          }`}
          disabled={increaseDisabled}
          onPress={() => onChange(minutes + TIMER_DURATION_STEP)}>
          <Plus color={colors.ink} size={20} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const hydrated = useTimerStore((state) => state.hydrated);
  const studyMinutes = useTimerStore((state) => state.studyMinutes);
  const restMinutes = useTimerStore((state) => state.restMinutes);
  const phase = useTimerStore((state) => state.phase);
  const status = useTimerStore((state) => state.status);
  const secondsRemaining = useTimerStore((state) => state.secondsRemaining);
  const hydrationError = useTimerStore((state) => state.hydrationError);
  const persistenceError = useTimerStore((state) => state.persistenceError);
  const setStudyMinutes = useTimerStore((state) => state.setStudyMinutes);
  const setRestMinutes = useTimerStore((state) => state.setRestMinutes);
  const start = useTimerStore((state) => state.start);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const reset = useTimerStore((state) => state.reset);
  const [timerControlsWidth, setTimerControlsWidth] = useState(0);
  const [resetContentVisible, setResetContentVisible] = useState(false);
  const resetProgress = useSharedValue(0);
  const dialSize = Math.min(Math.max(width - 96, 196), 248);
  const stackDurationCards = width < 360;
  const controlsDisabled = !hydrated || status !== 'idle';
  const startDisabled = !hydrated || (studyMinutes === 0 && restMinutes === 0);
  const buttonLabel =
    status === 'running'
      ? 'Pause Timer'
      : status === 'paused'
        ? 'Resume Timer'
        : status === 'awaitingContinuation'
          ? 'Continue Timer'
          : 'Start Timer';
  const TimerButtonIcon = status === 'running' ? Pause : Play;
  const timerError = persistenceError ?? hydrationError;
  const resetButtonAnimatedStyle = useAnimatedStyle(() => ({
    marginRight: resetProgress.get() * timerControlGap,
    opacity: resetProgress.get(),
    width: resetProgress.get() * resetButtonSize,
  }));
  const timerButtonAnimatedStyle = useAnimatedStyle(() => {
    if (timerControlsWidth === 0) {
      return { flexGrow: 1 };
    }
    return {
      width: timerControlsWidth - resetProgress.get() * (resetButtonSize + timerControlGap),
    };
  }, [timerControlsWidth]);

  useEffect(() => {
    if (status !== 'idle') {
      resetProgress.set(
        withTiming(1, { duration: 180, reduceMotion: ReduceMotion.System }),
      );
      return;
    }

    resetProgress.set(
      withTiming(
        0,
        { duration: 180, reduceMotion: ReduceMotion.System },
        (finished) => {
          if (finished) {
            runOnJS(setResetContentVisible)(false);
          }
        },
      ),
    );
  }, [resetProgress, status]);

  function changeStudyMinutes(minutes: number) {
    void setStudyMinutes(minutes);
  }

  function changeRestMinutes(minutes: number) {
    void setRestMinutes(minutes);
  }

  function handleTimerPress() {
    if (status === 'running') {
      void pause();
      return;
    }

    if (status === 'paused') {
      void resume();
      return;
    }

    setResetContentVisible(true);
    void start();
  }

  function resetTimer() {
    void reset();
  }

  function measureTimerControls(event: LayoutChangeEvent) {
    setTimerControlsWidth(event.nativeEvent.layout.width);
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: getMainTabBarHeight(insets.bottom) + 16,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-xl self-center pb-2 pt-5">
          <View className="mb-3 h-2 w-16 rounded-full bg-purple" />
          <AppText variant="display">Timer</AppText>
          <AppText className="mt-2 max-w-md" variant="body">
            Set a timer to stay focused while studying.
          </AppText>

          <View className="mt-12 items-center">
            <View style={{ height: dialSize, width: dialSize }}>
              <View
                className="absolute rounded-full bg-offset-shadow"
                style={{
                  height: dialSize,
                  transform: [{ translateX: 6 }, { translateY: 7 }],
                  width: dialSize,
                }}
              />
              <View
                className="flex-1 rounded-full border-2 border-contrast-line bg-purple p-3"
                testID="study-clock-ring">
                <View
                  className="flex-1 items-center justify-center rounded-full border-2 border-contrast-line bg-paper-raised px-4"
                  testID="study-clock-face">
                  {status === 'running' || status === 'paused' ? (
                    <AppText
                      accessibilityLabel={`Current phase, ${phase === 'study' ? 'Studying' : 'Resting'}`}
                      className="absolute top-4 text-[16px] leading-5 text-purple"
                      variant="label">
                      {phase === 'study' ? 'Studying' : 'Resting'}
                    </AppText>
                  ) : null}
                  <AppText
                    accessibilityLabel={`${phase === 'study' ? 'Study' : 'Rest'} time remaining, ${formatTimer(secondsRemaining)}`}
                    adjustsFontSizeToFit
                    className="text-[58px] leading-[64px]"
                    minimumFontScale={0.8}
                    numberOfLines={1}
                    variant="display">
                    {formatTimer(secondsRemaining)}
                  </AppText>
                  {status === 'idle' ? (
                    <View
                      accessibilityLabel={`Rest time, ${restMinutes} minutes`}
                      className="absolute bottom-4 h-5 flex-row items-center gap-1.5">
                      <Coffee color={colors.purple} size={20} strokeWidth={2.3} />
                      <AppText
                        className="font-sans-medium text-[18px] leading-5 text-purple"
                        variant="caption">
                        {restMinutes}m
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          <View className="mb-3 mt-12">
            <AppText variant="title">Set Timer</AppText>
          </View>

          <View className={stackDurationCards ? 'gap-3' : 'flex-row gap-3'}>
            <DurationCard
              disabled={controlsDisabled}
              icon={BookOpen}
              label="Study Time"
              maxMinutes={MAX_STUDY_MINUTES}
              minutes={studyMinutes}
              purple
              onChange={changeStudyMinutes}
            />
            <DurationCard
              disabled={controlsDisabled}
              icon={Coffee}
              label="Rest Time"
              maxMinutes={MAX_REST_MINUTES}
              minutes={restMinutes}
              onChange={changeRestMinutes}
            />
          </View>

          <View className="mt-5 flex-row items-center" onLayout={measureTimerControls}>
            <Animated.View
              accessibilityElementsHidden={status === 'idle'}
              className="relative h-16"
              importantForAccessibility={status === 'idle' ? 'no-hide-descendants' : 'auto'}
              pointerEvents={status === 'idle' ? 'none' : 'auto'}
              style={resetButtonAnimatedStyle}>
              {status !== 'idle' || resetContentVisible ? (
                <>
                  <View className="absolute inset-0 translate-x-1 translate-y-1 rounded-2xl bg-offset-shadow" />
                  <Pressable
                    accessibilityLabel="Reset Timer"
                    accessibilityRole="button"
                    className="h-full w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-strong-line bg-paper-raised active:bg-paper"
                    onPress={resetTimer}>
                    <RotateCcw color={colors.ink} size={20} strokeWidth={2.3} />
                  </Pressable>
                </>
              ) : null}
            </Animated.View>
            <Animated.View className="relative h-16" style={timerButtonAnimatedStyle}>
              <View className="absolute inset-0 translate-x-1 translate-y-1 rounded-2xl bg-offset-shadow" />
              <Pressable
                disabled={startDisabled}
                accessibilityLabel={buttonLabel}
                accessibilityRole="button"
                accessibilityState={{ disabled: startDisabled }}
                className={`h-16 flex-row items-center justify-center gap-3 rounded-2xl border-2 border-offset-shadow bg-timer-action px-5 active:bg-timer-action-pressed ${
                  startDisabled ? 'opacity-50' : ''
                }`}
                onPress={handleTimerPress}>
                <TimerButtonIcon
                  color={colors.offWhite}
                  fill={status === 'running' ? 'none' : colors.offWhite}
                  size={21}
                  strokeWidth={2.2}
                />
                <AppText className="text-off-white" variant="label">
                  {buttonLabel}
                </AppText>
              </Pressable>
            </Animated.View>
          </View>

          {timerError ? (
            <AppText
              accessibilityLiveRegion="polite"
              className="mt-3 text-center text-danger"
              variant="caption">
              {timerError}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
