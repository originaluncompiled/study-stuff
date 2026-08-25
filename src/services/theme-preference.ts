import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemeMode } from '@/constants/theme';

export const themePreferenceStorageKey = 'studystuff:theme-mode:v1';

export async function readThemeMode(): Promise<ThemeMode> {
  return (await AsyncStorage.getItem(themePreferenceStorageKey)) === 'dark' ? 'dark' : 'light';
}

export async function writeThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(themePreferenceStorageKey, mode);
}
