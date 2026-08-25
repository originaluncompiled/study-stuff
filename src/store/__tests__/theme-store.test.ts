import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

import { themePreferenceStorageKey } from '@/services/theme-preference';
import { useThemeStore } from '@/store/theme-store';

describe('theme store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
    useThemeStore.setState({ mode: 'light', hydrated: false, error: null, saving: false });
    await useThemeStore.getState().hydrate();
    useThemeStore.setState({ mode: 'light', hydrated: false, error: null, saving: false });
    jest.mocked(Appearance.setColorScheme).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('hydrates a saved dark preference', async () => {
    await AsyncStorage.setItem(themePreferenceStorageKey, 'dark');

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState()).toMatchObject({ mode: 'dark', hydrated: true, error: null });
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
  });

  test('persists a mode change across hydration', async () => {
    await useThemeStore.getState().setMode('dark');
    expect(await AsyncStorage.getItem(themePreferenceStorageKey)).toBe('dark');

    useThemeStore.setState({ mode: 'light', hydrated: false, error: null });
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe('dark');
  });

  test('falls back to light when the stored value is unsupported', async () => {
    await AsyncStorage.setItem(themePreferenceStorageKey, 'sepia');

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState()).toMatchObject({ mode: 'light', hydrated: true, error: null });
  });

  test('rolls back when a mode change cannot be saved', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage unavailable'));

    await useThemeStore.getState().setMode('dark');

    expect(useThemeStore.getState()).toMatchObject({
      mode: 'light',
      error: 'Could not save your appearance.',
      saving: false,
    });
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('light');
  });
});
