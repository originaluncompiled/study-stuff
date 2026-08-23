import { TopTabs, type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { CommonActions } from 'expo-router/react-navigation';
import { useReducedMotion } from 'react-native-reanimated';

import { MainTabBar, type MainTabRoute } from '@/components/main-tab-bar';

export default function TabsLayout() {
  const reduceMotion = useReducedMotion();

  return (
    <TopTabs
      tabBar={({ navigation, state }: MaterialTopTabBarProps) => (
        <MainTabBar
          activeRoute={state.routes[state.index].name as MainTabRoute}
          onPress={(routeName) => {
            const route = state.routes.find(({ name }: { name: string }) => name === routeName);
            if (!route) {
              return;
            }
            const event = navigation.emit({
              canPreventDefault: true,
              target: route.key,
              type: 'tabPress',
            });
            if (!event.defaultPrevented) {
              navigation.dispatch({
                ...CommonActions.navigate(route),
                target: state.key,
              });
            }
          }}
        />
      )}
      screenOptions={{
        animationEnabled: !reduceMotion,
        swipeEnabled: true,
      }}>
      <TopTabs.Screen name="(library)" options={{ title: 'Library' }} />
      <TopTabs.Screen name="timer" options={{ title: 'Timer' }} />
      <TopTabs.Screen name="settings" options={{ title: 'Settings' }} />
    </TopTabs>
  );
}
