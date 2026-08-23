# StudyStuff Agent Guide

This file applies to the whole repository. Use it to keep design and implementation decisions consistent across conversations.

## Read First

- This project uses Expo SDK 57. Read the exact versioned documentation at https://docs.expo.dev/versions/v57.0.0/ before changing Expo or React Native code.
- Prefer the smallest change that fits the current app and visual language. Extend existing components before introducing a second design system.

## Engineering Priorities

- Always look for the simplest solution that fully meets the requirement. Simpler implementations are the default because they have fewer interactions, failure modes, and maintenance costs.
- Before custom-building complex behavior, inspect the existing dependencies and platform APIs for a maintained solution. Prefer an already-installed package or library over recreating behavior it already solves.
- Do not add or install a package without the user's explicit approval. First state which package is needed, why the current dependencies are insufficient, and whether it requires native configuration or a development-client rebuild.
- Avoid custom navigation, gesture, animation, persistence, and platform-integration machinery when a compatible maintained library already provides the required behavior.
- Add abstractions, workarounds, or compatibility layers only when a concrete requirement makes the simpler approach insufficient.

## Visual Direction

The visual language is warm editorial stationery with bold, playful neo-brutalist accents.

- Use warm cream paper instead of clinical white or gray app chrome.
- Use vivid purple for brand moments and primary actions.
- Use near-black ink for outlines, navigation, and strong contrast.
- Pair generous rounded corners with visible borders and occasional hard offset shadows.
- Keep screens spacious and focused. The visual character should come from typography, color, shape, and a few strong objects, not decoration everywhere.
- Avoid generic Material cards, blue primary colors, glassmorphism, gradients, excessive shadows, tiny controls, and dashboard-style density.
- Use the purple book-and-glasses artwork for app branding. Do not reintroduce Expo placeholder branding.

## Design Tokens

Canonical runtime colors live in `src/constants/theme.ts`; NativeWind tokens live in `tailwind.config.js`. Keep both files synchronized when changing a shared token.

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `#F7F1E3` | Screen and navigation background |
| `paperRaised` | `#FFF9ED` | Cards, sheets, dialogs, raised controls |
| `purple` | `#6D3CEB` | Primary actions and brand emphasis |
| `purpleDark` | `#4D1FB8` | Pressed primary states |
| `ink` | `#141116` | Main text, outlines, dark surfaces |
| `muted` | `#716B75` | Supporting text |
| `line` | `#D8CEBE` | Quiet borders and dividers |
| `danger` | `#B42318` | Destructive actions and errors only |

The app icon uses the source artwork's slightly lighter cream, `#F8F1E4`, for its adaptive-icon background. This is intentional and does not replace the in-app `paper` token.

## Typography

- Use `Fraunces_700Bold` for expressive display and screen-level headings.
- Use DM Sans for all functional UI, body copy, labels, metadata, and navigation.
- Render app text through `AppText` unless a native component such as `TextInput` requires direct font styling.
- Use `display` sparingly for primary screen identity, `title` for clear hierarchy, `label` for actions and item names, and `caption` for metadata or help.
- Keep copy concise, direct, and friendly. Use sentence case.
- Prefer specific empty, loading, and error messages over vague text such as "Something went wrong".

## Layout And Shape

- Start screens on `paper` and respect safe areas.
- Use approximately 20px horizontal screen padding and 16px gaps for primary layouts.
- Use large corner radii: roughly 24-32px for prominent tiles, sheets, and dialogs; 12-16px for rows and controls; full pills for the tab control.
- Use black offset shadows only on major branded objects. Do not add soft elevation shadows to every surface.
- Keep thin `line` borders for quiet rows and 2px `ink` borders for high-emphasis tiles, dialogs, and sheets.
- Interactive targets should be at least 44x44px; current primary controls generally use 48px or more.
- Support narrow phones and landscape rotation. Do not hard-code layouts to one device size.

## Components And Interaction

- Reuse the shared components in `src/components` before creating alternatives.
- Use Lucide icons with the established rounded outline style. Do not use emoji as interface icons.
- Use bottom sheets for short action choices and dialogs for text entry or confirmation.
- Put destructive actions behind an explicit confirmation and color only the destructive action red.
- Show a visible loading state for asynchronous work and prevent duplicate submissions while work is active.
- Use haptics selectively for meaningful selection, success, and failure feedback, not every tap.
- Keep motion functional and restrained: sheet slides, dialog fades, pressed translations, and progress indicators are enough.

## States And Accessibility

- Every screen or substantial component should account for loading, empty, error, and long-name states where applicable.
- Add `accessibilityRole`, useful labels, selected/busy/disabled state, and live-region announcements when the state changes asynchronously.
- Preserve modal focus behavior and `accessibilityViewIsModal` when editing sheets or dialogs.
- Never rely on color alone to communicate state.
- Keep contrast strong and use `hitSlop` where an icon control is visually compact.
- Test long labels and truncate their display without changing stored values.

## Code Organization

- Routes and screens live in `src/app` and should mostly coordinate UI and services.
- Shared UI lives in `src/components`.
- Pure validation and formatting helpers live in `src/lib`.
- Service and persistence work lives in `src/services`.
- Shared state lives in `src/store`; domain types live in `src/types`.
- Use strict TypeScript and the `@/` path alias.
- Prefer NativeWind `className` styling for layout and static visual rules. Use `style` for runtime dimensions, safe-area values, native library props, or colors passed to icons.
- Native `android` and `ios` directories are generated and ignored. Make durable native configuration changes in `app.json` or config plugins, then run Expo prebuild.

## Validation

Run the checks relevant to the change before finishing:

```bash
npm run lint
npm run typecheck
npm test
npx expo-doctor
```

For native or configuration changes, also run an Android build or the closest focused Gradle task.

When adding UI, verify it on a narrow portrait phone and in landscape, and check the important flow with accessibility labels enabled.
