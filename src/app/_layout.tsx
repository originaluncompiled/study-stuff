import '../global.css';

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { vars } from 'nativewind';
import { featureFlags } from 'react-native-screens';

import { TimerRuntime } from '@/components/timer-runtime';
import { getThemeVariables } from '@/constants/theme';
import { useLibraryStore } from '@/store/library-store';
import { useThemeColors, useThemeStore } from '@/store/theme-store';
import { useTimerStore } from '@/store/timer-store';

// Work around stale Android Fabric hit targets after orientation changes.
// https://github.com/software-mansion/react-native-screens/issues/4289
featureFlags.experiment.androidResetScreenShadowStateOnOrientationChangeEnabled = false;

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const themeMode = useThemeStore((state) => state.mode);
  const themeHydrated = useThemeStore((state) => state.hydrated);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const colors = useThemeColors();
  const libraryHydrated = useLibraryStore((state) => state.hydrated);
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const timerHydrated = useTimerStore((state) => state.hydrated);
  const hydrateTimer = useTimerStore((state) => state.hydrate);
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular: require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
    DMSans_500Medium: require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
    DMSans_600SemiBold: require('@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf'),
    DMSans_700Bold: require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
    Fraunces_700Bold: require('@expo-google-fonts/fraunces/700Bold/Fraunces_700Bold.ttf'),
  });

  useEffect(() => {
    void hydrateTheme();
    void hydrateLibrary();
    void hydrateTimer();
  }, [hydrateLibrary, hydrateTheme, hydrateTimer]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && libraryHydrated && themeHydrated && timerHydrated) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontError, fontsLoaded, libraryHydrated, themeHydrated, timerHydrated]);

  if ((!fontsLoaded && !fontError) || !libraryHydrated || !themeHydrated || !timerHydrated) {
    return null;
  }

  const baseNavigationTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      background: colors.paper,
      card: colors.paper,
      text: colors.ink,
      border: colors.line,
      primary: colors.purple,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View className="flex-1" style={vars(getThemeVariables(themeMode))}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar hidden={false} style={themeMode === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.paper },
              headerStyle: { backgroundColor: colors.paper },
              headerTintColor: colors.ink,
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: 'DMSans_600SemiBold' },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="pdf/[folderId]"
              options={{
                headerShown: false,
                headerStyle: { backgroundColor: colors.viewer },
                headerTintColor: colors.viewerForeground,
                contentStyle: { backgroundColor: colors.viewer },
                headerTitleStyle: { fontFamily: 'DMSans_600SemiBold' },
              }}
            />
            <Stack.Screen
              name="image/[folderId]"
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.viewer },
              }}
            />
            <Stack.Screen name="text/[folderId]" options={{ headerShown: false }} />
          </Stack>
          <TimerRuntime />
        </ThemeProvider>
      </View>
    </GestureHandlerRootView>
  );
}
