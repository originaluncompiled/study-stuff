import appConfig from '../../../app.json';
import packageConfig from '../../../package.json';

describe('theme launch configuration', () => {
  test('uses only the stored in-app theme for native launch', () => {
    const splashPlugin = appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
    );

    expect(appConfig.expo.userInterfaceStyle).toBe('light');
    expect(appConfig.expo.plugins).toContain('./plugins/with-stored-theme');
    expect(packageConfig.expo.autolinking.android.exclude).toContain('expo-system-ui');
    expect(splashPlugin?.[1]).toMatchObject({
      backgroundColor: '#F7F1E3',
      dark: {
        backgroundColor: '#19161D',
        image: './assets/images/splash-icon-dark.png',
      },
    });
  });
});
