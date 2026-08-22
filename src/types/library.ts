export type FolderColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'black'
  | 'gray';

export type StudyFolder = {
  color: FolderColor;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type LibraryEntry = {
  childCount: number | null;
  kind: 'directory' | 'pdf';
  name: string;
  relativePath: string;
  size: number | null;
};

export type ImportProgress = {
  copiedPdfs: number;
  currentName: string;
};
