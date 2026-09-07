import { requireOptionalNativeModule } from 'expo';

type ThemeMode = 'light' | 'dark';

type StoredThemeModule = {
  setMode: (mode: ThemeMode) => void;
};

const storedThemeModule = requireOptionalNativeModule<StoredThemeModule>('StudyStuffStoredTheme');

export function persistNativeThemeMode(mode: ThemeMode): void {
  storedThemeModule?.setMode(mode);
}
