import { Tabs } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';

import { MainTabBar, type MainTabRoute } from '@/components/main-tab-bar';

export default function TabsLayout() {
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
      }}>
      <Tabs.Screen name="(library)" options={{ title: 'Library' }} />
      <Tabs.Screen name="timer" options={{ title: 'Timer' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
