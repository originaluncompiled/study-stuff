import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SettingsScreen from '@/app/(tabs)/settings';
import { themePreferenceStorageKey } from '@/services/theme-preference';
import { useThemeStore } from '@/store/theme-store';

function renderSettings() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 34, left: 0, right: 0, top: 47 },
      }}>
      <SettingsScreen />
    </SafeAreaProvider>,
  );
}

describe('SettingsScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useThemeStore.setState({ mode: 'light', hydrated: true, error: null, saving: false });
    jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('toggles and saves dark mode', async () => {
    const view = await renderSettings();
    const toggle = view.getByRole('switch', { name: 'Dark mode' });

    expect(toggle.props.value).toBe(false);
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    expect(view.getByRole('switch', { name: 'Dark mode' }).props.value).toBe(true);
    expect(await AsyncStorage.getItem(themePreferenceStorageKey)).toBe('dark');
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
  });
});
