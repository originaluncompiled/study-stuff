import { Clock3, LibraryBig, Settings2, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';

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

  return (
    <View
      className="absolute bottom-0 left-0 right-0 items-center px-6 pt-2"
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <View className="flex-row items-center gap-2">
        {tabs.map(({ icon: Icon, label, route }) => {
          const selected = route === activeRoute;

          return (
            <AnimatedPressable
              key={route}
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              className="min-h-14 flex-row items-center justify-center overflow-hidden rounded-full border-2 border-ink active:opacity-90"
              layout={tabTransition}
              onPress={() => onPress(route)}
              style={{ minWidth: 56 }}>
              <View
                className="absolute inset-0"
                pointerEvents="none"
                style={{ backgroundColor: selected ? colors.ink : colors.paperRaised }}
                testID={`${label.toLowerCase()}-tab-background`}
              />
              {selected ? (
                <View className="flex-row items-center gap-2 px-6">
                  <Icon color={colors.purple} size={22} strokeWidth={2.4} />
                  <Animated.View entering={FadeIn.duration(120)}>
                    <AppText variant="label" className="text-paper">
                      {label}
                    </AppText>
                  </Animated.View>
                </View>
              ) : (
                <Icon color={colors.ink} size={22} strokeWidth={2.4} />
              )}
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}
