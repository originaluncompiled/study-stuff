import type { FolderColor } from '@/types/library';

export const colors = {
  paper: '#F7F1E3',
  paperRaised: '#FFF9ED',
  purple: '#6D3CEB',
  purpleDark: '#4D1FB8',
  timerAction: '#6D3CEB',
  timerActionPressed: '#4D1FB8',
  onPurple: '#FFFFFF',
  offWhite: '#F7F1E3',
  fixedInk: '#141116',
  ink: '#141116',
  muted: '#716B75',
  line: '#D8CEBE',
  strongLine: '#141116',
  contrastLine: '#141116',
  offsetShadow: '#141116',
  navSurface: '#FFF9ED',
  danger: '#B42318',
  surfacePressed: '#EEE4CF',
  viewer: '#141116',
  viewerCanvas: '#2B272D',
  viewerForeground: '#F7F1E3',
  viewerMuted: '#D8CEBE',
  folderRed: '#D9554D',
  folderGreen: '#46A758',
  folderOrange: '#E58A2B',
  folderPink: '#D95D8A',
  folderBlue: '#3F7CCF',
  folderTeal: '#2E9C91',
  folderYellow: '#E2B93F',
  folderBlack: '#2B272D',
  folderGray: '#CFCDD2',
  white: '#FFFFFF',
} as const;

export type ThemeMode = 'light' | 'dark';
export type ThemeColors = { [Key in keyof typeof colors]: string };

export const darkColors: ThemeColors = {
  ...colors,
  paper: '#19161D',
  paperRaised: '#27222B',
  purple: '#8D67F2',
  purpleDark: '#754FD2',
  timerAction: '#784CDF',
  timerActionPressed: '#6338C1',
  onPurple: '#19161D',
  ink: '#F4ECDF',
  muted: '#B9B0BB',
  line: '#514A55',
  strongLine: '#746A77',
  contrastLine: '#F7F1E3',
  offsetShadow: '#F7F1E3',
  navSurface: '#19161D',
  danger: '#FF938A',
  surfacePressed: '#342E38',
};

export const themeColors: Record<ThemeMode, ThemeColors> = {
  light: colors,
  dark: darkColors,
};

export function getThemeVariables(mode: ThemeMode): Record<`--${string}`, string> {
  const palette = themeColors[mode];
  return {
    '--color-paper': hexToRgbChannels(palette.paper),
    '--color-paper-raised': hexToRgbChannels(palette.paperRaised),
    '--color-purple': hexToRgbChannels(palette.purple),
    '--color-purple-dark': hexToRgbChannels(palette.purpleDark),
    '--color-timer-action': hexToRgbChannels(palette.timerAction),
    '--color-timer-action-pressed': hexToRgbChannels(palette.timerActionPressed),
    '--color-on-purple': hexToRgbChannels(palette.onPurple),
    '--color-ink': hexToRgbChannels(palette.ink),
    '--color-muted': hexToRgbChannels(palette.muted),
    '--color-line': hexToRgbChannels(palette.line),
    '--color-strong-line': hexToRgbChannels(palette.strongLine),
    '--color-contrast-line': hexToRgbChannels(palette.contrastLine),
    '--color-offset-shadow': hexToRgbChannels(palette.offsetShadow),
    '--color-nav-surface': hexToRgbChannels(palette.navSurface),
    '--color-danger': hexToRgbChannels(palette.danger),
    '--color-surface-pressed': hexToRgbChannels(palette.surfacePressed),
  };
}

function hexToRgbChannels(hex: string): string {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).join(' ');
}

export const defaultFolderColor: FolderColor = 'purple';

export const folderColorOptions: readonly {
  hex: string;
  id: FolderColor;
  label: string;
}[] = [
  { hex: colors.folderRed, id: 'red', label: 'Red' },
  { hex: colors.folderOrange, id: 'orange', label: 'Orange' },
  { hex: colors.folderYellow, id: 'yellow', label: 'Yellow' },
  { hex: colors.folderGreen, id: 'green', label: 'Green' },
  { hex: colors.folderTeal, id: 'teal', label: 'Teal' },
  { hex: colors.folderBlue, id: 'blue', label: 'Blue' },
  { hex: colors.purple, id: 'purple', label: 'Purple' },
  { hex: colors.folderPink, id: 'pink', label: 'Pink' },
  { hex: colors.folderBlack, id: 'black', label: 'Black' },
  { hex: colors.folderGray, id: 'gray', label: 'Light gray' },
];

export const folderColorValues: Record<FolderColor, string> = Object.fromEntries(
  folderColorOptions.map((option) => [option.id, option.hex]),
) as Record<FolderColor, string>;

export function isFolderColor(value: unknown): value is FolderColor {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(folderColorValues, value);
}

export const libraryTabHeight = 78;
