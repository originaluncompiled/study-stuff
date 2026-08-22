import type { FolderColor } from '@/types/library';

export const colors = {
  paper: '#F7F1E3',
  paperRaised: '#FFF9ED',
  purple: '#6D3CEB',
  purpleDark: '#4D1FB8',
  ink: '#141116',
  muted: '#716B75',
  line: '#D8CEBE',
  danger: '#B42318',
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
