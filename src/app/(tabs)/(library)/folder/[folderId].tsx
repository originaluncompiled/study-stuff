import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Camera,
  ChevronRight,
  FilePlus2,
  FileText,
  FolderPlus,
  Image,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionRow, ActionSheet } from '@/components/action-sheet';
import { AppText } from '@/components/app-text';
import { EntryRow } from '@/components/entry-row';
import { getMainTabBarHeight } from '@/components/main-tab-bar';
import { NameDialog } from '@/components/name-dialog';
import { orderLibraryEntries } from '@/lib/library-entry-order';
import { joinRelativePath, normalizeRelativePath, parentRelativePath } from '@/lib/paths';
import {
  readFavouritePaths,
  remapFavouritePaths,
  removeFavouritePaths,
  writeFavouritePaths,
} from '@/services/library-favourites';
import {
  createSubfolder,
  createTextFile,
  deleteEntry,
  listDirectory,
  pickAndCopyFiles,
  pickAndCopyImages,
  renameEntry,
  takeAndCopyPhoto,
} from '@/services/library-files';
import { useLibraryStore } from '@/store/library-store';
import { useThemeColors } from '@/store/theme-store';
import type { LibraryEntry } from '@/types/library';

export default function FolderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const params = useLocalSearchParams<'/(tabs)/(library)/folder/[folderId]'>();
  const folderId = params.folderId;
  const rawPath = Array.isArray(params.path) ? params.path[0] : params.path;
  const folder = useLibraryStore((state) => state.folders.find((item) => item.id === folderId));
  const touchFolder = useLibraryStore((state) => state.touchFolder);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [favouritePaths, setFavouritePaths] = useState<Set<string>>(new Set());
  const [loadingFavourites, setLoadingFavourites] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [addingFiles, setAddingFiles] = useState(false);
  const [revision, setRevision] = useState(0);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [newFolderDialogVisible, setNewFolderDialogVisible] = useState(false);
  const [newTextDialogVisible, setNewTextDialogVisible] = useState(false);
  const [actionTarget, setActionTarget] = useState<LibraryEntry | null>(null);
  const [renameTarget, setRenameTarget] = useState<LibraryEntry | null>(null);

  let currentPath = '';
  let pathError: string | null = null;
  try {
    currentPath = normalizeRelativePath(rawPath);
  } catch (error) {
    pathError = getErrorMessage(error);
  }

  const pathSegments = currentPath.split('/').filter(Boolean);
  const title = pathSegments.at(-1) || folder?.name || 'Folder';
  const actionTargetIsFavourite = Boolean(
    actionTarget && favouritePaths.has(actionTarget.relativePath),
  );
  const actionTargetType = actionTarget?.kind === 'directory' ? 'folder' : 'file';
  const breadcrumbSegments =
    folder && pathSegments.length > 0 ? [folder.name, ...pathSegments.slice(0, -1)] : [];

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!folder || pathError) {
        setEntries([]);
        setLoadingEntries(false);
        return;
      }
      try {
        setEntries(listDirectory(folderId, currentPath));
        setLoadError(null);
      } catch (error) {
        setLoadError(getErrorMessage(error));
      } finally {
        setLoadingEntries(false);
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [currentPath, folder, folderId, pathError, revision]);

  useEffect(() => {
    let cancelled = false;
    readFavouritePaths(folderId)
      .then((paths) => {
        if (!cancelled) {
          setFavouritePaths(paths);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          Alert.alert('Could not load favourites', getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingFavourites(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  async function addFiles(source: 'files' | 'images' | 'camera') {
    if (addingFiles) {
      return;
    }
    setAddingFiles(true);
    try {
      const copied =
        source === 'files'
          ? await pickAndCopyFiles(folderId, currentPath)
          : source === 'images'
            ? await pickAndCopyImages(folderId, currentPath)
            : await takeAndCopyPhoto(folderId, currentPath);
      if (copied > 0) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        void touchFolder(folderId).catch(() => undefined);
      }
    } catch (error) {
      Alert.alert(
        source === 'camera' ? 'Could not take picture' : 'Could not import files',
        getErrorMessage(error),
      );
    } finally {
      setRevision((value) => value + 1);
      setAddingFiles(false);
    }
  }

  function createNamedSubfolder(name: string) {
    createSubfolder(folderId, currentPath, name);
    setRevision((current) => current + 1);
    void touchFolder(folderId).catch(() => undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function createNamedTextFile(name: string) {
    const relativePath = createTextFile(folderId, currentPath, name);
    setRevision((current) => current + 1);
    void touchFolder(folderId).catch(() => undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/text/[folderId]',
      params: { edit: '1', folderId, path: relativePath },
    });
  }

  function openEntry(entry: LibraryEntry) {
    if (entry.kind === 'directory') {
      router.push({
        pathname: '/(tabs)/(library)/folder/[folderId]',
        params: { folderId, path: entry.relativePath },
      });
      return;
    }
    const pathname =
      entry.kind === 'pdf'
        ? '/pdf/[folderId]'
        : entry.kind === 'image'
          ? '/image/[folderId]'
          : '/text/[folderId]';
    router.push({ pathname, params: { folderId, path: entry.relativePath } });
  }

  async function toggleFavourite(entry: LibraryEntry) {
    const previous = favouritePaths;
    const next = new Set(previous);
    if (next.has(entry.relativePath)) {
      next.delete(entry.relativePath);
    } else {
      next.add(entry.relativePath);
    }

    setActionTarget(null);
    setFavouritePaths(next);
    try {
      await writeFavouritePaths(folderId, next);
      void Haptics.selectionAsync();
    } catch (error) {
      setFavouritePaths(previous);
      Alert.alert('Could not update favourite', getErrorMessage(error));
    }
  }

  async function submitRename(value: string) {
    if (!renameTarget) {
      return;
    }
    const name = renameEntry(folderId, renameTarget.relativePath, renameTarget.kind, value);
    const nextPath = joinRelativePath(parentRelativePath(renameTarget.relativePath), name);
    const nextFavourites = remapFavouritePaths(
      favouritePaths,
      renameTarget.relativePath,
      nextPath,
    );
    setFavouritePaths(nextFavourites);
    try {
      await writeFavouritePaths(folderId, nextFavourites);
    } catch (error) {
      Alert.alert('Could not update favourites', getErrorMessage(error));
    }
    setRevision((current) => current + 1);
    void touchFolder(folderId).catch(() => undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function confirmDelete(entry: LibraryEntry) {
    setActionTarget(null);
    Alert.alert(
      `Delete “${entry.name}”?`,
      entry.kind === 'directory'
        ? 'This permanently removes the folder and everything inside it.'
        : 'This permanently removes the file from StudyStuff.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            try {
              deleteEntry(folderId, entry.relativePath, entry.kind);
              const nextFavourites = removeFavouritePaths(favouritePaths, entry.relativePath);
              setFavouritePaths(nextFavourites);
              void writeFavouritePaths(folderId, nextFavourites).catch((error) => {
                Alert.alert('Could not update favourites', getErrorMessage(error));
              });
              setRevision((current) => current + 1);
              void touchFolder(folderId).catch(() => undefined);
            } catch (error) {
              Alert.alert('Could not delete item', getErrorMessage(error));
            }
          },
        },
      ],
    );
  }

  const error = pathError || loadError || (!folder ? 'This library folder no longer exists.' : null);

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['left', 'right']}>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <Pressable
              accessibilityLabel="Add to folder"
              accessibilityRole="button"
              accessibilityState={{ busy: addingFiles, disabled: addingFiles }}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-line/50"
              disabled={addingFiles}
              hitSlop={8}
              onPress={() => setAddSheetVisible(true)}>
              {addingFiles ? (
                <ActivityIndicator color={colors.purple} />
              ) : (
                <Plus color={colors.ink} size={25} />
              )}
            </Pressable>
          ),
        }}
      />

      <View className="flex-1" pointerEvents={addingFiles ? 'none' : 'auto'}>
        {error ? (
          <View className="m-5 rounded-2xl border border-danger bg-paper-raised px-5 py-4">
            <AppText variant="label" className="text-danger">
              Could not open this folder
            </AppText>
            <AppText variant="caption" className="mt-1 text-danger">
              {error}
            </AppText>
          </View>
        ) : loadingEntries || loadingFavourites ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.purple} size="large" />
          </View>
        ) : (
          <FlatList
            data={orderLibraryEntries(entries, favouritePaths)}
            keyExtractor={(entry) => entry.relativePath}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingTop: breadcrumbSegments.length > 0 ? 8 : 12,
              paddingBottom: getMainTabBarHeight(insets.bottom),
            }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              breadcrumbSegments.length > 0 ? (
                <ScrollView
                  horizontal
                  className="mb-3"
                  contentContainerClassName="items-center"
                  showsHorizontalScrollIndicator={false}>
                  {breadcrumbSegments.map((segment, index) => (
                    <View className="flex-row items-center" key={`${segment}-${index}`}>
                      {index > 0 ? (
                        <ChevronRight className="mx-1.5" color={colors.muted} size={16} />
                      ) : null}
                      <AppText variant="caption" className="font-sans-medium">
                        {segment}
                      </AppText>
                    </View>
                  ))}
                </ScrollView>
              ) : null
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-7 pb-16">
                <View className="h-20 w-20 items-center justify-center rounded-[26px] bg-purple">
                  <FolderPlus color={colors.onPurple} size={36} />
                </View>
                <AppText variant="title" className="mt-5 text-center text-2xl">
                  Nothing here yet
                </AppText>
                <AppText variant="caption" className="mt-2 text-center">
                  Add files or a subfolder with the &quot;+&quot; button at the top.
                </AppText>
              </View>
            }
            renderItem={({ item }) => (
              <EntryRow
                entry={item}
                favourite={favouritePaths.has(item.relativePath)}
                onMenu={() => setActionTarget(item)}
                onPress={() => openEntry(item)}
              />
            )}
          />
        )}
      </View>

      <ActionSheet
        title="Add to this folder"
        visible={addSheetVisible}
        onDismiss={() => setAddSheetVisible(false)}>
        <ActionRow
          description="Add PDFs or text files from device storage."
          icon={FilePlus2}
          label="Import file(s)"
          onPress={() => {
            setAddSheetVisible(false);
            void addFiles('files');
          }}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <ActionRow
              icon={Image}
              label="Import image(s)"
              onPress={() => {
                setAddSheetVisible(false);
                void addFiles('images');
              }}
            />
          </View>
          <Pressable
            accessibilityLabel="Take picture"
            accessibilityRole="button"
            className="aspect-square shrink-0 self-stretch items-center justify-center rounded-2xl border border-line bg-paper active:bg-surface-pressed"
            onPress={() => {
              setAddSheetVisible(false);
              void addFiles('camera');
            }}>
            <View
              className="h-11 w-11 items-center justify-center rounded-xl bg-paper-raised"
              testID="camera-action-icon-background">
              <Camera color={colors.ink} size={25} strokeWidth={2.1} />
            </View>
          </Pressable>
        </View>
        <ActionRow
          icon={FileText}
          label="Create empty text file"
          onPress={() => {
            setAddSheetVisible(false);
            setNewTextDialogVisible(true);
          }}
        />
        <ActionRow
          icon={FolderPlus}
          label="Create new subfolder"
          onPress={() => {
            setAddSheetVisible(false);
            setNewFolderDialogVisible(true);
          }}
        />
      </ActionSheet>

      <ActionSheet
        title={actionTarget?.name ?? 'Item options'}
        visible={Boolean(actionTarget)}
        onDismiss={() => setActionTarget(null)}>
        <ActionRow
          description={
            actionTargetIsFavourite
              ? `Unpin this ${actionTargetType} from the top of the list.`
              : `Pin this ${actionTargetType} to the top of the list.`
          }
          icon={Star}
          iconFill={actionTargetIsFavourite ? colors.ink : undefined}
          label={actionTargetIsFavourite ? 'Unfavourite' : 'Favourite'}
          onPress={() => actionTarget && void toggleFavourite(actionTarget)}
        />
        <ActionRow
          icon={Pencil}
          label="Rename"
          onPress={() => {
            setRenameTarget(actionTarget);
            setActionTarget(null);
          }}
        />
        <ActionRow
          destructive
          icon={Trash2}
          label="Delete"
          onPress={() => actionTarget && confirmDelete(actionTarget)}
        />
      </ActionSheet>

      <NameDialog
        title="Create new subfolder"
        visible={newFolderDialogVisible}
        onClose={() => setNewFolderDialogVisible(false)}
        onSubmit={createNamedSubfolder}
      />
      <NameDialog
        inputLabel="Text file name"
        title="Create empty text file"
        visible={newTextDialogVisible}
        onClose={() => setNewTextDialogVisible(false)}
        onSubmit={createNamedTextFile}
      />
      <NameDialog
        centerInTopHalf
        confirmLabel="Rename"
        initialValue={renameTarget?.name}
        inputLabel={renameTarget?.kind === 'directory' ? 'Folder name' : 'File name'}
        title={`Rename ${renameTarget?.kind === 'directory' ? 'Folder' : 'File'}`}
        visible={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        onSubmit={submitRename}
      />
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}
