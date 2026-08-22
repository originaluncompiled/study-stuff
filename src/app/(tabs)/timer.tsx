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
import { useEffect, useRef, useState } from 'react';
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
import { colors } from '@/constants/theme';

const durationStep = 5;
const maxStudyMinutes = 120;
const maxRestMinutes = 30;
const resetButtonSize = 56;
const timerControlGap = 12;

type TimerPhase = 'study' | 'rest';
type TimerStatus = 'idle' | 'running' | 'paused';

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
  const decreaseDisabled = disabled || minutes === 0;
  const increaseDisabled = disabled || minutes === maxMinutes;

  return (
    <View className="flex-1 rounded-[22px] border-2 border-ink bg-paper-raised p-3">
      <View className="flex-row items-center gap-2">
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${purple ? 'bg-purple' : 'bg-ink'}`}>
          <Icon color={colors.paperRaised} size={20} strokeWidth={2.3} />
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
          onPress={() => onChange(minutes - durationStep)}>
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
          onPress={() => onChange(minutes + durationStep)}>
          <Plus color={colors.ink} size={20} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const deadlineRef = useRef<number | null>(null);
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [restMinutes, setRestMinutes] = useState(5);
  const [phase, setPhase] = useState<TimerPhase>('study');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState(studyMinutes * 60);
  const [timerControlsWidth, setTimerControlsWidth] = useState(0);
  const [resetContentVisible, setResetContentVisible] = useState(false);
  const resetProgress = useSharedValue(0);
  const dialSize = Math.min(Math.max(width - 96, 196), 248);
  const stackDurationCards = width < 360;
  const controlsDisabled = status === 'running';
  const startDisabled = studyMinutes === 0 && restMinutes === 0;
  const buttonLabel = status === 'running' ? 'Pause Timer' : status === 'paused' ? 'Resume Timer' : 'Start Timer';
  const TimerButtonIcon = status === 'running' ? Pause : Play;
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

  useEffect(() => {
    if (status !== 'running') {
      return;
    }

    const updateTimer = () => {
      if (deadlineRef.current === null) {
        return;
      }

      const nextSeconds = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      if (nextSeconds > 0) {
        setSecondsRemaining(nextSeconds);
        return;
      }

      if (phase === 'study' && restMinutes > 0) {
        const restSeconds = restMinutes * 60;
        setPhase('rest');
        setSecondsRemaining(restSeconds);
        deadlineRef.current = Date.now() + restSeconds * 1000;
        return;
      }

      deadlineRef.current = null;
      setStatus('idle');
      setPhase('study');
      setSecondsRemaining(studyMinutes * 60);
    };

    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [phase, restMinutes, status, studyMinutes]);

  function changeStudyMinutes(minutes: number) {
    if (controlsDisabled) {
      return;
    }
    setStudyMinutes(minutes);
    deadlineRef.current = null;
    setStatus('idle');
    setPhase('study');
    setSecondsRemaining(minutes * 60);
  }

  function changeRestMinutes(minutes: number) {
    if (controlsDisabled) {
      return;
    }
    setRestMinutes(minutes);
    if (status === 'paused') {
      deadlineRef.current = null;
      setStatus('idle');
      setPhase('study');
      setSecondsRemaining(studyMinutes * 60);
    }
  }

  function handleTimerPress() {
    if (status === 'running') {
      const pausedSeconds = Math.max(
        0,
        Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000),
      );
      deadlineRef.current = null;
      setSecondsRemaining(pausedSeconds);
      setStatus('paused');
      return;
    }

    if (status === 'paused' && secondsRemaining > 0) {
      deadlineRef.current = Date.now() + secondsRemaining * 1000;
      setStatus('running');
      return;
    }

    const startingPhase: TimerPhase = studyMinutes > 0 ? 'study' : 'rest';
    const startingSeconds = (startingPhase === 'study' ? studyMinutes : restMinutes) * 60;
    if (startingSeconds === 0) {
      return;
    }

    setResetContentVisible(true);
    setPhase(startingPhase);
    setSecondsRemaining(startingSeconds);
    deadlineRef.current = Date.now() + startingSeconds * 1000;
    setStatus('running');
  }

  function resetTimer() {
    deadlineRef.current = null;
    setStatus('idle');
    setPhase('study');
    setSecondsRemaining(studyMinutes * 60);
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
                className="absolute rounded-full bg-ink"
                style={{
                  height: dialSize,
                  transform: [{ translateX: 6 }, { translateY: 7 }],
                  width: dialSize,
                }}
              />
              <View className="flex-1 rounded-full border-2 border-ink bg-purple p-3">
                <View className="flex-1 items-center justify-center rounded-full border-2 border-ink bg-paper-raised px-4">
                  <AppText
                    accessibilityLabel={`${phase === 'study' ? 'Study' : 'Rest'} time remaining, ${formatTimer(secondsRemaining)}`}
                    accessibilityLiveRegion="polite"
                    adjustsFontSizeToFit
                    className="text-[58px] leading-[64px]"
                    minimumFontScale={0.8}
                    numberOfLines={1}
                    variant="display">
                    {formatTimer(secondsRemaining)}
                  </AppText>
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
              maxMinutes={maxStudyMinutes}
              minutes={studyMinutes}
              purple
              onChange={changeStudyMinutes}
            />
            <DurationCard
              disabled={controlsDisabled}
              icon={Coffee}
              label="Rest Time"
              maxMinutes={maxRestMinutes}
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
                  <View className="absolute inset-0 translate-x-1 translate-y-1 rounded-2xl bg-ink" />
                  <Pressable
                    accessibilityLabel="Reset Timer"
                    accessibilityRole="button"
                    className="h-full w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-ink bg-paper-raised active:bg-paper"
                    onPress={resetTimer}>
                    <RotateCcw color={colors.ink} size={20} strokeWidth={2.3} />
                  </Pressable>
                </>
              ) : null}
            </Animated.View>
            <Animated.View className="relative h-16" style={timerButtonAnimatedStyle}>
              <View className="absolute inset-0 translate-x-1 translate-y-1 rounded-2xl bg-ink" />
              <Pressable
                disabled={startDisabled}
                accessibilityLabel={buttonLabel}
                accessibilityRole="button"
                accessibilityState={{ disabled: startDisabled }}
                className={`h-16 flex-row items-center justify-center gap-3 rounded-2xl border-2 border-ink bg-purple px-5 active:bg-purple-dark ${
                  startDisabled ? 'opacity-50' : ''
                }`}
                onPress={handleTimerPress}>
                <TimerButtonIcon
                  color={colors.paperRaised}
                  fill={status === 'running' ? 'none' : colors.paperRaised}
                  size={21}
                  strokeWidth={2.2}
                />
                <AppText className="text-paper-raised" variant="label">
                  {buttonLabel}
                </AppText>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
