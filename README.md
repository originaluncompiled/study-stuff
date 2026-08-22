# StudyStuff

StudyStuff is an Android-first Expo app for organizing local PDF study material. It provides a two-column folder library, nested folder imports, and a native PDF reader with continuous vertical scrolling in both portrait and landscape.

## Features

- Two-column folder library with the add tile fixed in the first position
- Empty folder creation and recursive Android folder import
- Nested folder browsing with multi-PDF addition
- Rename and delete actions for folders and PDFs
- App-private local copies, so source permissions are not required after import
- Native PDF rendering, pinch zoom, and unlocked device rotation
- Crash-safe staging and recoverable per-folder metadata

## Requirements

- Node.js 22.13 or newer
- Android Studio with an Android SDK 36 emulator or connected Android device
- JDK version supported by the current Expo Android toolchain

The native PDF renderer is not available in Expo Go. Use a local native build or an EAS development build.

## Development

```bash
npm install
npm run android
```

After the development client is installed, start Metro with:

```bash
npm start
```

## Checks

```bash
npm run lint
npm run typecheck
npm test
npx expo-doctor
```

## Storage

Imported files are copied under Expo's persistent document directory in `StudyStuff/folders/<folder-id>`. AsyncStorage keeps the display order, while a hidden metadata file in each folder allows the index to be recovered if AsyncStorage is cleared or corrupted.

Whole-folder import currently targets Android. Individual PDF picking and the rest of the architecture remain portable, but iOS recursive import requires separate security-scoped access testing before it should be enabled.
