import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Pdf, { type PdfRef } from 'react-native-pdf';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import {
  ImmersiveViewerChrome,
  useImmersiveViewerChrome,
} from '@/components/immersive-viewer-chrome';
import { normalizeRelativePath } from '@/lib/paths';
import { getPdfScrubberOffset, getPdfScrubberPage } from '@/lib/pdf-viewer';
import { getLibraryFile, getLibraryFileKind } from '@/services/library-files';
import { useThemeColors } from '@/store/theme-store';

const PDF_HEADER_SCROLL_THRESHOLD = 12;
const PDF_SCRUBBER_HEIGHT = 48;
const PDF_SCRUBBER_IDLE_DELAY = 1200;
const PDF_SCRUBBER_WIDTH = 76;
const PDF_PAGE_INSET = 8;

export default function PdfScreen() {
  const params = useLocalSearchParams<'/pdf/[folderId]'>();
  const router = useRouter();
  const colors = useThemeColors();
  const rawPath = Array.isArray(params.path) ? params.path[0] : params.path;
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<PdfResolution | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayedPage, setDisplayedPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(0);
  const [scrubberVisible, setScrubberVisible] = useState(false);
  const [scrubberDragging, setScrubberDragging] = useState(false);
  const [pdfScrolling, setPdfScrolling] = useState(false);
  const [scrubberIdleRevision, setScrubberIdleRevision] = useState(0);
  const [pageRequest, setPageRequest] = useState<{ id: number; page: number } | null>(null);
  const pdfRef = useRef<PdfRef>(null);
  const previousPage = useRef(1);
  const previousTouchY = useRef<number | null>(null);
  const directionalTouchTravel = useRef(0);
  const scrubberProgress = useSharedValue(0);
  const scrubberOffset = useSharedValue(0);
  const scrubberDragStart = useSharedValue(0);
  const scrubberPage = useSharedValue(1);
  const scrubberCurrentPage = useSharedValue(1);
  const scrubberPageCount = useSharedValue(0);
  const scrubberTravel = useSharedValue(0);
  const scrubbing = useSharedValue(false);
  const pendingPageRequest = useSharedValue(0);
  const chrome = useImmersiveViewerChrome(headerVisible);
  const { headerHeight, insets } = chrome;
  const scrubberTop = headerHeight + 12;
  const scrubberBottom = Math.max(insets.bottom, 12) + 12;
  const availableScrubberTravel = Math.max(
    height - scrubberTop - scrubberBottom - PDF_SCRUBBER_HEIGHT,
    0,
  );
  const scrubberLabelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scrubberProgress.get(),
    transform: [{ scaleX: scrubberProgress.get() }],
  }));
  const scrubberHandleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrubberOffset.get() }],
  }));

  useEffect(() => {
    const timeout = setTimeout(() => {
      setResolution(resolvePdf(params.folderId, rawPath));
    }, 0);
    return () => clearTimeout(timeout);
  }, [params.folderId, rawPath]);

  useEffect(() => {
    scrubberProgress.set(
      withTiming(scrubberVisible ? 1 : 0, {
        duration: scrubberVisible ? 140 : 180,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [scrubberProgress, scrubberVisible]);

  useEffect(() => {
    scrubberPageCount.set(numberOfPages);
    scrubberTravel.set(availableScrubberTravel);
    scrubberCurrentPage.set(currentPage);
    scrubberPage.set(currentPage);

    if (!scrubbing.get()) {
      scrubberOffset.set(
        withTiming(getPdfScrubberOffset(currentPage, numberOfPages, availableScrubberTravel), {
          duration: 100,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [
    availableScrubberTravel,
    currentPage,
    numberOfPages,
    scrubberCurrentPage,
    scrubberOffset,
    scrubberPage,
    scrubberPageCount,
    scrubberTravel,
    scrubbing,
  ]);

  useEffect(() => {
    if (pageRequest) {
      pdfRef.current?.setPage(pageRequest.page);
    }
  }, [pageRequest]);

  useEffect(() => {
    if (!scrubberVisible || scrubberDragging || pdfScrolling) {
      return;
    }

    const timeout = setTimeout(() => setScrubberVisible(false), PDF_SCRUBBER_IDLE_DELAY);
    return () => clearTimeout(timeout);
  }, [pdfScrolling, scrubberDragging, scrubberIdleRevision, scrubberVisible]);

  const { fileName = 'PDF', uri = null, error: routeError = null } = resolution ?? {};

  const error = routeError || viewerError;

  function showScrubberUntilIdle() {
    if (numberOfPages <= 1 && scrubberPageCount.get() <= 1) {
      return;
    }
    setScrubberVisible(true);
    setScrubberIdleRevision((revision) => revision + 1);
  }

  function beginPdfScroll() {
    if (numberOfPages > 1) {
      setPdfScrolling(true);
      setScrubberVisible(true);
    }
  }

  function finishPdfScroll() {
    previousTouchY.current = null;
    directionalTouchTravel.current = 0;
    setPdfScrolling(false);
    setScrubberIdleRevision((revision) => revision + 1);
  }

  function beginPdfTouch(event: GestureResponderEvent) {
    previousTouchY.current = event.nativeEvent.pageY;
    directionalTouchTravel.current = 0;
  }

  function trackPdfScroll(event: GestureResponderEvent) {
    if (scrubbing.get()) {
      return;
    }

    beginPdfScroll();
    const touchY = event.nativeEvent.pageY;
    const lastTouchY = previousTouchY.current;
    previousTouchY.current = touchY;
    if (lastTouchY === null) {
      return;
    }

    const delta = touchY - lastTouchY;
    if (delta === 0) {
      return;
    }

    if (
      directionalTouchTravel.current !== 0 &&
      Math.sign(directionalTouchTravel.current) !== Math.sign(delta)
    ) {
      directionalTouchTravel.current = delta;
    } else {
      directionalTouchTravel.current += delta;
    }

    if (Math.abs(directionalTouchTravel.current) >= PDF_HEADER_SCROLL_THRESHOLD) {
      setHeaderVisible(directionalTouchTravel.current > 0);
      directionalTouchTravel.current = 0;
    }
  }

  function beginPageScrub() {
    setScrubberDragging(true);
    setScrubberVisible(true);
  }

  function previewScrubberPage(page: number) {
    setDisplayedPage(page);
  }

  function commitScrubberPage(page: number) {
    pendingPageRequest.set(page);
    setCurrentPage(page);
    setDisplayedPage(page);
    setPageRequest((request) => ({ id: (request?.id ?? 0) + 1, page }));
  }

  function finishPageScrub(page: number) {
    setDisplayedPage(page);
    setScrubberDragging(false);
    setScrubberIdleRevision((revision) => revision + 1);
  }

  function updateHeaderForPage(page: number, pageCount?: number) {
    const requestedPage = pendingPageRequest.get();
    if (requestedPage > 0) {
      if (page !== requestedPage) {
        return;
      }
      pendingPageRequest.set(0);
    }

    const lastPage = previousPage.current;
    previousPage.current = page;
    setCurrentPage(page);
    setDisplayedPage(page);
    scrubberCurrentPage.set(page);
    scrubberPage.set(page);
    if (pageCount && pageCount > 0) {
      setNumberOfPages(pageCount);
      scrubberPageCount.set(pageCount);
    }
    if (page !== lastPage) {
      showScrubberUntilIdle();
    }
  }

  function adjustPageFromAccessibility(direction: 'increment' | 'decrement') {
    const delta = direction === 'increment' ? 1 : -1;
    const page = Math.min(Math.max(currentPage + delta, 1), numberOfPages);
    if (page !== currentPage) {
      commitScrubberPage(page);
    }
    showScrubberUntilIdle();
  }

  const pageScrubberGesture = Gesture.Pan()
    .withTestId('pdf-page-scrubber-pan')
    .activeOffsetY([-2, 2])
    .onStart(() => {
      scrubbing.set(true);
      cancelAnimation(scrubberOffset);
      scrubberDragStart.set(scrubberOffset.get());
      runOnJS(beginPageScrub)();
    })
    .onUpdate((event) => {
      const travel = scrubberTravel.get();
      const offset = Math.min(Math.max(scrubberDragStart.get() + event.translationY, 0), travel);
      const page = getPdfScrubberPage(offset, scrubberPageCount.get(), travel);
      scrubberOffset.set(offset);
      if (page !== scrubberPage.get()) {
        scrubberPage.set(page);
        runOnJS(previewScrubberPage)(page);
      }
    })
    .onEnd(() => {
      const page = scrubberPage.get();
      pendingPageRequest.set(page);
      scrubberCurrentPage.set(page);
      runOnJS(commitScrubberPage)(page);
    })
    .onFinalize((_event, success) => {
      scrubbing.set(false);
      const page = scrubberCurrentPage.get();
      if (!success) {
        scrubberPage.set(page);
        scrubberOffset.set(
          withTiming(getPdfScrubberOffset(page, scrubberPageCount.get(), scrubberTravel.get()), {
            duration: 100,
          }),
        );
      }
      runOnJS(finishPageScrub)(page);
    });

  return (
    <View className="flex-1 bg-viewer">
      {error ? (
        <View className="flex-1 items-center justify-center px-7">
          <View className="h-20 w-20 items-center justify-center rounded-[26px] bg-purple">
            <AlertCircle color={colors.onPurple} size={38} />
          </View>
          <AppText variant="title" className="mt-5 text-center text-2xl text-viewer-foreground">
            Could not display this PDF
          </AppText>
          <AppText variant="caption" className="mt-2 text-center text-viewer-muted">
            {error}
          </AppText>
        </View>
      ) : null}

      {!resolution ? (
        <View className="flex-1 items-center justify-center bg-viewer">
          <ActivityIndicator color={colors.purple} size="large" />
        </View>
      ) : null}

      {uri && !error ? (
        <View
          className="flex-1"
          onTouchCancel={finishPdfScroll}
          onTouchEnd={finishPdfScroll}
          onTouchMove={trackPdfScroll}
          onTouchStart={beginPdfTouch}
          testID="pdf-viewer-container">
          <Animated.View
            testID="pdf-viewport"
            style={[
              {
                flex: 1,
                width: Math.max(width, 1),
              },
            ]}>
            <Pdf
              contentPadding={{
                top: headerHeight + PDF_PAGE_INSET,
                right: PDF_PAGE_INSET,
                bottom: PDF_PAGE_INSET,
                left: PDF_PAGE_INSET,
              }}
              enablePaging={false}
              fitPolicy={0}
              horizontal={false}
              maxScale={5}
              onError={(pdfError) => {
                setHeaderVisible(true);
                setLoading(false);
                setViewerError(pdfError instanceof Error ? pdfError.message : String(pdfError));
              }}
              onLoadComplete={(pageCount) => {
                setLoading(false);
                setNumberOfPages(pageCount);
              }}
              onPageChanged={updateHeaderForPage}
              ref={pdfRef}
              source={{ uri }}
              spacing={8}
              style={{
                flex: 1,
                width: '100%',
                backgroundColor: colors.viewer,
              }}
              trustAllCerts={false}
            />
          </Animated.View>
          {loading ? (
            <View className="absolute inset-0 items-center justify-center bg-viewer">
              <ActivityIndicator color={colors.purple} size="large" />
              <AppText variant="caption" className="mt-4 text-viewer-muted">
                Opening PDF…
              </AppText>
            </View>
          ) : null}
          {numberOfPages > 1 ? (
            <View
              pointerEvents="box-none"
              testID="pdf-page-scrubber"
              className="absolute z-20"
              style={{
                bottom: scrubberBottom,
                right: Math.max(insets.right, 8),
                top: scrubberTop,
                width: PDF_SCRUBBER_WIDTH,
              }}>
              <GestureDetector gesture={pageScrubberGesture}>
                <Animated.View
                  accessible
                  accessibilityActions={[{ name: 'decrement' }, { name: 'increment' }]}
                  accessibilityHint="Drag vertically to move to another page."
                  accessibilityLabel={`Page ${displayedPage} of ${numberOfPages}`}
                  accessibilityRole="adjustable"
                  accessibilityValue={{
                    max: numberOfPages,
                    min: 1,
                    now: displayedPage,
                    text: `${displayedPage} of ${numberOfPages}`,
                  }}
                  onAccessibilityAction={(event) => {
                    const action = event.nativeEvent.actionName;
                    if (action === 'increment' || action === 'decrement') {
                      adjustPageFromAccessibility(action);
                    }
                  }}
                  testID="pdf-page-scrubber-handle"
                  className="absolute right-0 h-12 w-[76px] items-end justify-center"
                  style={scrubberHandleAnimatedStyle}>
                  <Animated.View
                    pointerEvents="none"
                    testID="pdf-page-scrubber-label"
                    className="absolute right-3.5 rounded-lg bg-white/45 px-2 py-1"
                    style={[
                      { transformOrigin: 'right center' },
                      scrubberLabelAnimatedStyle,
                    ]}>
                    <AppText
                      variant="label"
                      className="text-[15px] text-viewer"
                      numberOfLines={1}
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontWeight: '700',
                        textShadowColor: colors.white,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 2,
                      }}>
                      {displayedPage} / {numberOfPages}
                    </AppText>
                  </Animated.View>
                  <View
                    pointerEvents="none"
                    testID="pdf-page-scrubber-progress"
                    className="mr-1 h-[29px] w-1.5 rounded-full bg-purple"
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          ) : null}
        </View>
      ) : null}

      <ImmersiveViewerChrome
        chrome={chrome}
        headerVisible={headerVisible}
        onBack={() => router.back()}
        testIDPrefix="pdf"
        timerPillGap={6}
        title={fileName}
      />
    </View>
  );
}

type PdfResolution = {
  error: string | null;
  fileName: string;
  uri: string | null;
};

function resolvePdf(folderId: string, rawPath: string | undefined): PdfResolution {
  try {
    const relativePath = normalizeRelativePath(rawPath);
    const fileName = relativePath.split('/').at(-1) || 'PDF';
    const file = getLibraryFile(folderId, relativePath);
    if (!file.exists) {
      throw new Error('This PDF is no longer stored on the device.');
    }
    if (getLibraryFileKind(file) !== 'pdf') {
      throw new Error('This is not a supported PDF file.');
    }
    return { error: null, fileName, uri: file.uri };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'This PDF could not be opened.',
      fileName: 'PDF',
      uri: null,
    };
  }
}
