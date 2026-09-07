const { withAppDelegate, withMainActivity } = require('@expo/config-plugins');

const androidApply = 'expo.modules.studystuffstoredtheme.StudyStuffStoredTheme.apply(this)';
const iosMarker = 'studystuff.theme.mode';

function withStoredThemeAndroid(config) {
  return withMainActivity(config, (androidConfig) => {
    const mainActivity = androidConfig.modResults;
    if (mainActivity.contents.includes(androidApply)) {
      return androidConfig;
    }

    const onCreate = 'override fun onCreate(savedInstanceState: Bundle?) {';
    if (!mainActivity.contents.includes(onCreate)) {
      throw new Error('Could not configure the stored theme in MainActivity.');
    }

    mainActivity.contents = mainActivity.contents.replace(
      onCreate,
      `${onCreate}\n    ${androidApply}`,
    );
    return androidConfig;
  });
}

function withStoredThemeIos(config) {
  return withAppDelegate(config, (iosConfig) => {
    const appDelegate = iosConfig.modResults;
    if (appDelegate.contents.includes(iosMarker)) {
      return iosConfig;
    }
    if (appDelegate.language !== 'swift') {
      throw new Error('Stored splash theming requires a Swift AppDelegate.');
    }

    const windowCreation = 'window = UIWindow(frame: UIScreen.main.bounds)';
    if (!appDelegate.contents.includes(windowCreation)) {
      throw new Error('Could not configure the stored theme in AppDelegate.');
    }

    appDelegate.contents = appDelegate.contents.replace(
      windowCreation,
      `${windowCreation}\n    let storedThemeMode = UserDefaults.standard.string(forKey: "${iosMarker}")\n    window?.overrideUserInterfaceStyle = storedThemeMode == "dark" ? .dark : .light`,
    );
    return iosConfig;
  });
}

module.exports = function withStoredTheme(config) {
  return withStoredThemeIos(withStoredThemeAndroid(config));
};
