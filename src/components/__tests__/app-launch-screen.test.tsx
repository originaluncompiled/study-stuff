import { act, render } from '@testing-library/react-native';

import appConfig from '../../../app.json';

import { AppLaunchScreen } from '@/components/app-launch-screen';
import { useThemeStore } from '@/store/theme-store';

describe('app launch screen', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'light' });
  });

  test('does not let the system theme select the native splash appearance', () => {
    const splashPlugin = appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
    );

    expect(splashPlugin).toBeDefined();
    expect(splashPlugin?.[1]).not.toHaveProperty('dark');
  });

  test('renders from the in-app theme preference', async () => {
    const view = await render(<AppLaunchScreen />);
    expect(view.getByTestId('app-launch-screen').props.style).toMatchObject({
      backgroundColor: '#F7F1E3',
    });

    await act(async () => useThemeStore.setState({ mode: 'dark' }));

    expect(view.getByTestId('app-launch-screen').props.style).toMatchObject({
      backgroundColor: '#19161D',
    });
  });
});
