import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FilePlus2, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionRow, ActionSheet } from '@/components/action-sheet';
import { AppText } from '@/components/app-text';
import { EntryRow } from '@/components/entry-row';
import { getLibraryTabBarHeight } from '@/components/library-tab-bar';
import { NameDialog } from '@/components/name-dialog';
import { colors } from '@/constants/theme';
import { normalizePdfName, validateItemName } from '@/lib/names';
import { normalizeRelativePath } from '@/lib/paths';
import {
  createSubfolder,
  deleteEntry,
  listDirectory,
  pickAndCopyPdfs,
  renameEntry,
} from '@/services/library-files';
import { useLibraryStore } from '@/store/library-store';
import type { LibraryEntry } from '@/types/library';

export default function FolderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<'/(tabs)/(library)/folder/[folderId]'>();
  const folderId = params.folderId;
  const rawPath = Array.isArray(params.path) ? params.path[0] : params.path;
  const folder = useLibraryStore((state) => state.folders.find((item) => item.id === folderId));
  const touchFolder = useLibraryStore((state) => state.touchFolder);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [addingPdfs, setAddingPdfs] = useState(false);
  const [revision, setRevision] = useState(0);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [newFolderDialogVisible, setNewFolderDialogVisible] = useState(false);
  const [actionTarget, setActionTarget] = useState<LibraryEntry | null>(null);
  const [renameTarget, setRenameTarget] = useState<LibraryEntry | null>(null);

  let currentPath = '';
  let pathError: string | null = null;
  try {
    currentPath = normalizeRelativePath(rawPath);
  } catch (error) {
    pathError = getErrorMessage(error);
  }

  const title = currentPath.split('/').at(-1) || folder?.name || 'Folder';

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

  async function addPdfs() {
    if (addingPdfs) {
      return;
    }
    setAddingPdfs(true);
    try {
      const copied = await pickAndCopyPdfs(folderId, currentPath);
      if (copied > 0) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        void touchFolder(folderId).catch(() => undefined);
      }
    } catch (error) {
      Alert.alert('Could not add PDFs', getErrorMessage(error));
    } finally {
      setRevision((value) => value + 1);
      setAddingPdfs(false);
    }
  }

  function createNamedSubfolder(name: string) {
    createSubfolder(folderId, currentPath, name);
    setRevision((current) => current + 1);
    void touchFolder(folderId).catch(() => undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function openEntry(entry: LibraryEntry) {
    if (entry.kind === 'directory') {
      router.push({
        pathname: '/(tabs)/(library)/folder/[folderId]',
        params: { folderId, path: entry.relativePath },
      });
      return;
    }
    router.push({
      pathname: '/pdf/[folderId]',
      params: { folderId, path: entry.relativePath },
    });
  }

  async function submitRename(value: string) {
    if (!renameTarget) {
      return;
    }
    const name = renameTarget.kind === 'pdf' ? normalizePdfName(value) : validateItemName(value);
    renameEntry(folderId, renameTarget.relativePath, renameTarget.kind, name);
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
        : 'This permanently removes the PDF from StudyStuff.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            try {
              deleteEntry(folderId, entry.relativePath, entry.kind);
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
              accessibilityState={{ busy: addingPdfs, disabled: addingPdfs }}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-line/50"
              disabled={addingPdfs}
              hitSlop={8}
              onPress={() => setAddSheetVisible(true)}>
              {addingPdfs ? (
                <ActivityIndicator color={colors.purple} />
              ) : (
                <Plus color={colors.ink} size={25} />
              )}
            </Pressable>
          ),
        }}
      />

      {folder ? (
        <ScrollView
          horizontal
          className="max-h-12 border-b border-line"
          contentContainerClassName="items-center px-5"
          showsHorizontalScrollIndicator={false}>
          {[folder.name, ...currentPath.split('/').filter(Boolean)].map((segment, index, all) => (
            <View className="flex-row items-center" key={`${segment}-${index}`}>
              {index > 0 ? <AppText className="mx-2 text-muted">/</AppText> : null}
              <AppText
                variant={index === all.length - 1 ? 'label' : 'caption'}
                className={index === all.length - 1 ? 'text-purple' : ''}>
                {segment}
              </AppText>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View className="flex-1" pointerEvents={addingPdfs ? 'none' : 'auto'}>
        {error ? (
          <View className="m-5 rounded-2xl border border-danger bg-paper-raised px-5 py-4">
            <AppText variant="label" className="text-danger">
              Could not open this folder
            </AppText>
            <AppText variant="caption" className="mt-1 text-danger">
              {error}
            </AppText>
          </View>
        ) : loadingEntries ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.purple} size="large" />
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(entry) => entry.relativePath}
            contentContainerStyle={{
              flexGrow: 1,
              padding: 20,
              paddingBottom: getLibraryTabBarHeight(insets.bottom) + 8,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-7 pb-16">
                <View className="h-20 w-20 items-center justify-center rounded-[26px] bg-purple">
                  <FolderPlus color={colors.paperRaised} size={36} />
                </View>
                <AppText variant="title" className="mt-5 text-center text-2xl">
                  Nothing here yet
                </AppText>
                <AppText variant="caption" className="mt-2 text-center">
                  Add PDFs or a subfolder with the &quot;+&quot; button at the top.
                </AppText>
              </View>
            }
            renderItem={({ item }) => (
              <EntryRow
                entry={item}
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
          icon={FilePlus2}
          label="Import PDF"
          onPress={() => {
            setAddSheetVisible(false);
            void addPdfs();
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
        centerInTopHalf
        confirmLabel="Rename"
        initialValue={renameTarget?.name}
        inputLabel={renameTarget?.kind === 'pdf' ? 'PDF name' : 'Folder name'}
        title={`Rename ${renameTarget?.kind === 'directory' ? 'Folder' : 'PDF'}`}
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
