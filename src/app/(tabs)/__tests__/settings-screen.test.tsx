import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SettingsScreen from '@/app/(tabs)/settings';
import {
  hideTimerWhileStudyingStorageKey,
  notifyWhenTimerEndsStorageKey,
} from '@/services/timer-preference';
import { themePreferenceStorageKey } from '@/services/theme-preference';
import { useThemeStore } from '@/store/theme-store';
import { useTimerStore } from '@/store/timer-store';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
}));

const selectionAsyncMock = Haptics.selectionAsync as jest.MockedFunction<
  typeof Haptics.selectionAsync
>;

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
    useTimerStore.setState({
      hideTimerWhileStudying: false,
      notificationError: null,
      notificationSaving: false,
      notifyWhenTimerEnds: false,
      preferenceError: null,
      preferenceSaving: false,
    });
    selectionAsyncMock.mockClear();
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
    expect(selectionAsyncMock).toHaveBeenCalledTimes(1);
  });

  test('toggles and saves hiding the study countdown in viewer pills', async () => {
    const view = await renderSettings();
    const toggle = view.getByRole('switch', { name: 'Hide timer while studying' });

    expect(toggle.props.value).toBe(false);
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    expect(
      view.getByRole('switch', { name: 'Hide timer while studying' }).props.value,
    ).toBe(true);
    expect(await AsyncStorage.getItem(hideTimerWhileStudyingStorageKey)).toBe('true');
    expect(selectionAsyncMock).toHaveBeenCalledTimes(1);
  });

  test('requests permission and saves timer completion notifications', async () => {
    const getPermissionsMock = Notifications.getPermissionsAsync as jest.MockedFunction<
      typeof Notifications.getPermissionsAsync
    >;
    getPermissionsMock.mockResolvedValueOnce({
      canAskAgain: true,
      expires: 'never',
      granted: false,
      status: Notifications.PermissionStatus.UNDETERMINED,
    });
    const view = await renderSettings();
    const toggle = view.getByRole('switch', { name: 'Notify when timer reaches 0' });

    expect(view.getByText('Notifications')).toBeTruthy();
    expect(toggle.props.value).toBe(false);
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    expect(
      view.getByRole('switch', { name: 'Notify when timer reaches 0' }).props.value,
    ).toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(notifyWhenTimerEndsStorageKey)).toBe('true');
    expect(selectionAsyncMock).toHaveBeenCalledTimes(1);
  });
});
