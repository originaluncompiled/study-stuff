import { useIsFocused } from 'expo-router';
import { type PropsWithChildren, useEffect } from 'react';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export function AnimatedTabPage({ children }: PropsWithChildren) {
  const isFocused = useIsFocused();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withTiming(isFocused ? 1 : 0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [isFocused, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [10, 0]) }],
  }));

  return (
    <Animated.View className="flex-1 bg-paper" style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
