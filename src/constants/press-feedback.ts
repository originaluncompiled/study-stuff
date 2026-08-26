import { Platform, type PressableAndroidRippleConfig } from 'react-native';

export const iconButtonRipple: PressableAndroidRippleConfig = {
  borderless: true,
  foreground: Platform.OS === 'android' && Platform.Version >= 23,
  radius: 20,
};
