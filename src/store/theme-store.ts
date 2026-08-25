import { Appearance, Platform } from 'react-native';
import { create } from 'zustand';

import { themeColors, type ThemeMode } from '@/constants/theme';
import { readThemeMode, writeThemeMode } from '@/services/theme-preference';

type ThemeStore = {
  mode: ThemeMode;
  hydrated: boolean;
  error: string | null;
  saving: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
};

let hydrationPromise: Promise<void> | null = null;
let persistenceQueue: Promise<void> = Promise.resolve();
let persistedMode: ThemeMode = 'light';
let persistenceRevision = 0;

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: 'light',
  hydrated: false,
  error: null,
  saving: false,

  hydrate: () => {
    if (get().hydrated) {
      return Promise.resolve();
    }
    if (hydrationPromise) {
      return hydrationPromise;
    }

    hydrationPromise = readThemeMode()
      .then((mode) => {
        persistedMode = mode;
        applyNativeColorScheme(mode);
        set({ mode, hydrated: true, error: null });
      })
      .catch(() => {
        persistedMode = 'light';
        applyNativeColorScheme('light');
        set({ hydrated: true, error: 'Could not load your saved appearance.' });
      })
      .finally(() => {
        hydrationPromise = null;
      });

    return hydrationPromise;
  },

  setMode: (mode) => {
    if (mode === get().mode) {
      return Promise.resolve();
    }

    const revision = ++persistenceRevision;
    applyNativeColorScheme(mode);
    set({ mode, error: null, saving: true });
    const write = persistenceQueue.then(
      () => writeThemeMode(mode),
      () => writeThemeMode(mode),
    );
    persistenceQueue = write.then(
      () => {
        persistedMode = mode;
        if (revision === persistenceRevision) {
          set({ error: null, saving: false });
        }
      },
      () => {
        if (revision === persistenceRevision) {
          applyNativeColorScheme(persistedMode);
          set({ mode: persistedMode, error: 'Could not save your appearance.', saving: false });
        }
      },
    );
    return persistenceQueue;
  },
}));

export function useThemeColors() {
  return useThemeStore((state) => themeColors[state.mode]);
}

function applyNativeColorScheme(mode: ThemeMode): void {
  if (Platform.OS !== 'web') {
    Appearance.setColorScheme(mode);
  }
}
