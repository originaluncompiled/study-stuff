import { Tabs } from 'expo-router';

import { LibraryTabBar } from '@/components/library-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={({ navigation, state }) => (
        <LibraryTabBar
          onPress={() => {
            const route = state.routes[0];
            const event = navigation.emit({
              canPreventDefault: true,
              target: route.key,
              type: 'tabPress',
            });
            if (!event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          }}
        />
      )}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="(library)" options={{ title: 'Library' }} />
    </Tabs>
  );
}
