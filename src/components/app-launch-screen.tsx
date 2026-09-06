import { StatusBar } from 'expo-status-bar';
import { Image, View } from 'react-native';

import { useThemeColors, useThemeStore } from '@/store/theme-store';

export function AppLaunchScreen() {
  const mode = useThemeStore((state) => state.mode);
  const colors = useThemeColors();

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: colors.paper }}
      testID="app-launch-screen">
      <StatusBar hidden={false} style={mode === 'dark' ? 'light' : 'dark'} />
      <View
        className="h-[260px] w-[260px] items-center justify-center rounded-[48px]"
        style={{ backgroundColor: colors.offWhite }}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={require('../../assets/images/splash-icon.png')}
          style={{ height: 240, width: 240 }}
        />
      </View>
    </View>
  );
}
