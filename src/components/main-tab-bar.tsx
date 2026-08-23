import { Clock3, LibraryBig, Settings2, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';
import { useTimerStore } from '@/store/timer-store';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const tabTransition = LinearTransition.duration(180);

export type MainTabRoute = '(library)' | 'timer' | 'settings';

const tabs: readonly {
  icon: LucideIcon;
  label: string;
  route: MainTabRoute;
}[] = [
  { icon: LibraryBig, label: 'Library', route: '(library)' },
  { icon: Clock3, label: 'Timer', route: 'timer' },
  { icon: Settings2, label: 'Settings', route: 'settings' },
];

export function getMainTabBarHeight(bottomInset: number): number {
  return 64 + Math.max(bottomInset, 12);
}

export function MainTabBar({
  activeRoute,
  onPress,
}: {
  activeRoute: MainTabRoute;
  onPress: (route: MainTabRoute) => void;
}) {
  const insets = useSafeAreaInsets();
  const timerRunning = useTimerStore((state) => state.status === 'running');

  return (
    <View
      className="absolute bottom-0 left-0 right-0 z-10 items-center px-6 pt-2"
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <View className="flex-row items-center gap-2">
        {tabs.map(({ icon: Icon, label, route }) => {
          const selected = route === activeRoute;
          const icon =
            route === 'timer' ? (
              <View className="relative h-[22px] w-[22px]" testID="timer-tab-icon-container">
                <Icon
                  color={selected ? colors.purple : colors.ink}
                  size={22}
                  strokeWidth={2.4}
                />
                {timerRunning ? (
                  <View
                    className="absolute h-3 w-3 rounded-full border-2 border-ink bg-purple"
                    pointerEvents="none"
                    style={{ left: 5, top: -10.5 }}
                    testID="timer-tab-active-indicator"
                  />
                ) : null}
              </View>
            ) : (
              <Icon
                color={selected ? colors.purple : colors.ink}
                size={22}
                strokeWidth={2.4}
              />
            );

          return (
            <AnimatedPressable
              key={route}
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityValue={
                route === 'timer' && timerRunning ? { text: 'Timer running' } : undefined
              }
              className={`min-h-14 flex-row items-center justify-center overflow-hidden rounded-full border-2 border-ink px-[15px] active:opacity-90 ${
                selected ? 'bg-ink' : 'w-14 bg-paper-raised'
              }`}
              layout={tabTransition}
              onPress={() => onPress(route)}>
              <View
                className="absolute inset-0"
                pointerEvents="none"
                style={{ backgroundColor: selected ? colors.ink : colors.paperRaised }}
                testID={`${label.toLowerCase()}-tab-background`}
              />
              {icon}
              {selected ? (
                <Animated.View
                  className="px-2"
                  entering={FadeIn.duration(120)}
                  testID={`${label.toLowerCase()}-tab-label`}>
                  <AppText variant="label" className="text-paper">
                    {label}
                  </AppText>
                </Animated.View>
              ) : null}
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}
