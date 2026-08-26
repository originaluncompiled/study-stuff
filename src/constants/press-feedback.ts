import { Platform, type PressableAndroidRippleConfig } from 'react-native';

import { colors } from '@/constants/theme';

export const iconButtonRipple: PressableAndroidRippleConfig = {
  borderless: true,
  color: `${colors.muted}40`,
  foreground: Platform.OS === 'android' && Platform.Version >= 23,
  radius: 20,
};
