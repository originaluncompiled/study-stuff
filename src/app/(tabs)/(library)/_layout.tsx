import { Stack } from 'expo-router';

import { useThemeColors } from '@/store/theme-store';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function LibraryStackLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.paper },
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Fraunces_700Bold' },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="folder/[folderId]" />
      <Stack.Screen name="pdf-composer" options={{ title: 'Create PDF' }} />
    </Stack>
  );
}
