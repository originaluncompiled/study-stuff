# StudyStuff

StudyStuff is an Android-first Expo app for organizing local study material. It provides a two-column folder library, nested folder imports, and focused viewers for PDFs, images, and plain-text notes.

## Features

- Two-column folder library with the add tile fixed in the first position
- Empty folder creation and recursive Android folder import
- Nested folder browsing with multi-file import, camera capture, and empty text-file creation
- Rename and delete actions for folders and files
- App-private local copies, so source permissions are not required after import
- Native PDF rendering, pinch zoom, and unlocked device rotation
- Sibling-image galleries with swipe navigation, pinch zoom, and thumbnails
- Plain-text reading and explicit edit/save controls with unsaved-change protection
- Crash-safe staging and recoverable per-folder metadata

Supported files include PDFs, plain-text files, and common image formats such as JPEG, PNG, GIF, WebP, AVIF, HEIC, HEIF, SVG, APNG, and ICO.

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

### Engineering Principles

- Use the simplest implementation that fully solves the problem; fewer moving parts are more robust.
- Prefer the project's installed, maintained packages and platform APIs over custom implementations of solved behavior.
- Ask for explicit approval before installing any new dependency, including an explanation of why it is needed and whether it changes the native build.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npx expo-doctor
```

## Storage

Imported files are copied under Expo's persistent document directory in `StudyStuff/folders/<folder-id>`. AsyncStorage keeps the display order, while a hidden metadata file in each folder allows the index to be recovered if AsyncStorage is cleared or corrupted.

Whole-folder import currently targets Android. Individual file picking and the rest of the architecture remain portable, but iOS recursive import requires separate security-scoped access testing before it should be enabled.
