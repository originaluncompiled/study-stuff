import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function LibraryStackLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.paper },
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'DMSans_600SemiBold' },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="folder/[folderId]" />
    </Stack>
  );
}
