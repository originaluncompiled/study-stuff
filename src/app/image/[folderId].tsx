import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import {
  GestureViewer,
  useGestureViewerController,
  useGestureViewerEvent,
  useGestureViewerState,
} from 'react-native-gesture-image-viewer';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import {
  ImmersiveViewerChrome,
  useImmersiveViewerChrome,
} from '@/components/immersive-viewer-chrome';
import { colors } from '@/constants/theme';
import { orderLibraryEntries } from '@/lib/library-entry-order';
import { normalizeRelativePath, parentRelativePath } from '@/lib/paths';
import { readFavouritePaths } from '@/services/library-favourites';
import {
  getLibraryFile,
  getLibraryFileKind,
  listDirectory,
} from '@/services/library-files';

type GalleryImage = {
  name: string;
  relativePath: string;
  uri: string;
};

type GalleryResolution = {
  error: string | null;
  images: GalleryImage[];
  initialIndex: number;
};

export default function ImageScreen() {
  const params = useLocalSearchParams<'/image/[folderId]'>();
  const router = useRouter();
  const rawPath = Array.isArray(params.path) ? params.path[0] : params.path;
  const [resolution, setResolution] = useState<GalleryResolution | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [failedPaths, setFailedPaths] = useState<Set<string>>(new Set());
  const viewerId = `folder-images:${params.folderId}:${rawPath ?? ''}`;
  const { currentIndex, totalCount } = useGestureViewerState(viewerId);
  const { goToIndex, goToNext, goToPrevious } = useGestureViewerController(viewerId);
  const chrome = useImmersiveViewerChrome(headerVisible);
  const footerProgress = useSharedValue(1);
  const footerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: footerProgress.get(),
    transform: [{ translateY: (1 - footerProgress.get()) * 120 }],
  }));

  useGestureViewerEvent(viewerId, 'zoomChange', ({ scale }) => {
    if (scale > 1.01) {
      setHeaderVisible(false);
    }
  });

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      void resolveGallery(params.folderId, rawPath).then((nextResolution) => {
        if (!cancelled) {
          setResolution(nextResolution);
          setHeaderVisible(true);
        }
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [params.folderId, rawPath]);

  useEffect(() => {
    footerProgress.set(
      withTiming(headerVisible ? 1 : 0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [footerProgress, headerVisible]);

  const images = resolution?.images ?? [];
  const activeImage = images[currentIndex] ?? images[resolution?.initialIndex ?? 0];
  const error = resolution?.error;

  function adjustImage(direction: 'increment' | 'decrement') {
    if (direction === 'increment' && currentIndex < totalCount - 1) {
      goToNext();
    }
    if (direction === 'decrement' && currentIndex > 0) {
      goToPrevious();
    }
  }

  return (
    <View className="flex-1 bg-ink">
      {!resolution ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.purple} size="large" />
        </View>
      ) : null}

      {error ? (
        <View className="flex-1 items-center justify-center px-7">
          <View className="h-20 w-20 items-center justify-center rounded-[26px] bg-purple">
            <AlertCircle color={colors.paper} size={38} />
          </View>
          <AppText variant="title" className="mt-5 text-center text-2xl text-paper">
            Could not display this image
          </AppText>
          <AppText variant="caption" className="mt-2 text-center text-line">
            {error}
          </AppText>
        </View>
      ) : null}

      {images.length > 0 ? (
        <GestureViewer
          backdropStyle={{ backgroundColor: colors.ink }}
          containerStyle={{ flex: 1 }}
          data={images}
          dismiss={{ enabled: false }}
          id={viewerId}
          initialIndex={resolution?.initialIndex ?? 0}
          ListComponent={FlatList}
          maxZoomScale={5}
          onSingleTap={() => setHeaderVisible((visible) => !visible)}
          renderItem={(item, index, { isActive }) => (
            <View
              accessibilityElementsHidden={!isActive}
              className="h-full w-full items-center justify-center bg-ink"
              importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}>
              {failedPaths.has(item.relativePath) ? (
                <View className="items-center px-8">
                  <AlertCircle color={colors.purple} size={36} />
                  <AppText variant="label" className="mt-3 text-center text-paper">
                    This image could not be opened.
                  </AppText>
                </View>
              ) : (
                <Image
                  accessibilityLabel={`Image ${index + 1} of ${images.length}, ${item.name}`}
                  alt={item.name}
                  contentFit="contain"
                  source={item.uri}
                  style={{ height: '100%', width: '100%' }}
                  onError={() =>
                    setFailedPaths((current) => new Set(current).add(item.relativePath))
                  }
                />
              )}
            </View>
          )}
        />
      ) : null}

      {images.length > 0 ? (
        <Animated.View
          accessibilityElementsHidden={!headerVisible}
          importantForAccessibility={headerVisible ? 'auto' : 'no-hide-descendants'}
          pointerEvents={headerVisible ? 'auto' : 'none'}
          className="absolute bottom-0 left-0 right-0 z-30 bg-ink/95 pt-2"
          style={[
            { paddingBottom: Math.max(chrome.insets.bottom, 10) },
            footerAnimatedStyle,
          ]}
          testID="image-footer">
          <View
            accessible
            accessibilityActions={[{ name: 'decrement' }, { name: 'increment' }]}
            accessibilityLabel={`Image ${currentIndex + 1} of ${images.length}`}
            accessibilityLiveRegion="polite"
            accessibilityRole="adjustable"
            accessibilityValue={{
              max: images.length,
              min: 1,
              now: currentIndex + 1,
              text: `${currentIndex + 1} of ${images.length}`,
            }}
            className="mb-2 items-center"
            onAccessibilityAction={(event) => {
              const action = event.nativeEvent.actionName;
              if (action === 'increment' || action === 'decrement') {
                adjustImage(action);
              }
            }}>
            <AppText variant="label" className="text-paper">
              {currentIndex + 1} / {images.length}
            </AppText>
          </View>
          <FlatList
            horizontal
            contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
            data={images}
            keyExtractor={(item) => item.relativePath}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const selected = index === currentIndex;
              return (
                <Pressable
                  accessibilityLabel={`Show image ${index + 1} of ${images.length}, ${item.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={`h-14 w-14 overflow-hidden rounded-xl border-2 ${selected ? 'border-purple' : 'border-line/60'}`}
                  onPress={() => goToIndex(index)}>
                  <Image
                    accessibilityIgnoresInvertColors
                    contentFit="cover"
                    source={item.uri}
                    style={{ height: '100%', width: '100%' }}
                  />
                </Pressable>
              );
            }}
          />
        </Animated.View>
      ) : null}

      <ImmersiveViewerChrome
        chrome={chrome}
        headerVisible={headerVisible}
        onBack={() => router.back()}
        testIDPrefix="image"
        title={activeImage?.name ?? 'Image'}
      />
    </View>
  );
}

async function resolveGallery(
  folderId: string,
  rawPath: string | undefined,
): Promise<GalleryResolution> {
  try {
    const relativePath = normalizeRelativePath(rawPath);
    const selectedFile = getLibraryFile(folderId, relativePath);
    if (!selectedFile.exists) {
      throw new Error('This image is no longer stored on the device.');
    }
    if (getLibraryFileKind(selectedFile) !== 'image') {
      throw new Error('This is not a supported image file.');
    }

    const parentPath = parentRelativePath(relativePath);
    const favourites = await readFavouritePaths(folderId).catch(() => new Set<string>());
    const images = orderLibraryEntries(listDirectory(folderId, parentPath), favourites)
      .filter((entry) => entry.kind === 'image')
      .map((entry) => ({
        name: entry.name,
        relativePath: entry.relativePath,
        uri: getLibraryFile(folderId, entry.relativePath).uri,
      }));
    const initialIndex = images.findIndex((image) => image.relativePath === relativePath);
    if (initialIndex < 0) {
      throw new Error('This image could not be found in its folder.');
    }
    return { error: null, images, initialIndex };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'This image could not be opened.',
      images: [],
      initialIndex: 0,
    };
  }
}
