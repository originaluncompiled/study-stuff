import { Tabs } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import { Easing, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { MainTabBar, type MainTabRoute } from '@/components/main-tab-bar';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  return (
    <Tabs
      tabBar={({ navigation, state }) => (
        <MainTabBar
          activeRoute={state.routes[state.index].name as MainTabRoute}
          onPress={(routeName) => {
            const route = state.routes.find(({ name }) => name === routeName);
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
        headerShown: false,
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-width, 0, width],
                }),
              },
            ],
          },
        }),
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: reduceMotion ? 0 : 220,
            easing: Easing.out(Easing.cubic),
          },
        },
      }}>
      <Tabs.Screen name="(library)" options={{ title: 'Library' }} />
      <Tabs.Screen name="timer" options={{ title: 'Timer' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
