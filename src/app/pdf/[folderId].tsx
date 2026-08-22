import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle, ChevronLeft, Clock3, Coffee, Pause } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View, useWindowDimensions } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { TimerManagerSheet } from '@/components/timer-manager-sheet';
import { colors } from '@/constants/theme';
import { normalizeRelativePath } from '@/lib/paths';
import {
  getPdfHeaderVisibility,
  getPdfScrubberOffset,
  getPdfScrubberPage,
} from '@/lib/pdf-viewer';
import { formatTimer } from '@/lib/timer';
import { getPdfFile } from '@/services/library-files';
import { useTimerStore } from '@/store/timer-store';

const PDF_HEADER_CONTENT_HEIGHT = 44;
const PDF_TIMER_PILL_GAP = 12;
const PDF_SCRUBBER_HEIGHT = 48;
const PDF_SCRUBBER_IDLE_DELAY = 1200;
const PDF_SCRUBBER_WIDTH = 76;
const PDF_VIEWER_INSET = 8;

export default function PdfScreen() {
  const params = useLocalSearchParams<'/pdf/[folderId]'>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rawPath = Array.isArray(params.path) ? params.path[0] : params.path;
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<PdfResolution | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [timerManagerSession, setTimerManagerSession] = useState<string | null>(null);
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
  const headerProgress = useSharedValue(1);
  const scrubberProgress = useSharedValue(0);
  const scrubberOffset = useSharedValue(0);
  const scrubberDragStart = useSharedValue(0);
  const scrubberPage = useSharedValue(1);
  const scrubberCurrentPage = useSharedValue(1);
  const scrubberPageCount = useSharedValue(0);
  const scrubberTravel = useSharedValue(0);
  const scrubbing = useSharedValue(false);
  const timerHydrated = useTimerStore((state) => state.hydrated);
  const timerStatus = useTimerStore((state) => state.status);
  const timerPhase = useTimerStore((state) => state.phase);
  const timerDeadlineAtMs = useTimerStore((state) => state.deadlineAtMs);
  const timerRemainingMs = useTimerStore((state) => state.remainingMs);
  const timerSecondsRemaining = useTimerStore((state) => state.secondsRemaining);
  const timerActive = timerHydrated && timerStatus !== 'idle';
  const TimerPillIcon = timerStatus === 'paused' ? Pause : timerPhase === 'rest' ? Coffee : Clock3;
  const timerSession =
    timerStatus === 'running'
      ? `${timerPhase}:running:${timerDeadlineAtMs}`
      : timerStatus === 'paused'
        ? `${timerPhase}:paused:${timerRemainingMs}`
        : null;
  const timerManagerVisible = timerSession !== null && timerManagerSession === timerSession;
  const headerTopInset = Math.max(insets.top - PDF_VIEWER_INSET, 0);
  const headerHeight = headerTopInset + PDF_HEADER_CONTENT_HEIGHT;
  const viewerTopMargin = (headerVisible ? headerHeight : 0) + PDF_VIEWER_INSET;
  const scrubberTop = headerHeight + 12;
  const scrubberBottom = Math.max(insets.bottom, 12) + 12;
  const availableScrubberTravel = Math.max(
    height - scrubberTop - scrubberBottom - PDF_SCRUBBER_HEIGHT,
    0,
  );
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.get(),
    transform: [{ translateY: (headerProgress.get() - 1) * headerHeight }],
  }));
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
    headerProgress.set(
      withTiming(headerVisible ? 1 : 0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [headerProgress, headerVisible]);

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
    setPdfScrolling(false);
    setScrubberIdleRevision((revision) => revision + 1);
  }

  function beginPageScrub() {
    setScrubberDragging(true);
    setScrubberVisible(true);
  }

  function previewScrubberPage(page: number) {
    setDisplayedPage(page);
  }

  function commitScrubberPage(page: number) {
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
    setHeaderVisible((currentVisibility) =>
      getPdfHeaderVisibility(lastPage, page, currentVisibility),
    );
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
    <View className="flex-1 bg-ink">
      <StatusBar
        animated
        hidden={!headerVisible}
        hideTransitionAnimation="fade"
        style="light"
      />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {error ? (
        <View className="flex-1 items-center justify-center px-7">
          <View className="h-20 w-20 items-center justify-center rounded-[26px] bg-purple">
            <AlertCircle color={colors.paper} size={38} />
          </View>
          <AppText variant="title" className="mt-5 text-center text-2xl text-paper">
            Could not display this PDF
          </AppText>
          <AppText variant="caption" className="mt-2 text-center text-line">
            {error}
          </AppText>
        </View>
      ) : null}

      {!resolution ? (
        <View className="flex-1 items-center justify-center bg-ink">
          <ActivityIndicator color={colors.purple} size="large" />
        </View>
      ) : null}

      {uri && !error ? (
        <View
          className="flex-1"
          onTouchCancel={finishPdfScroll}
          onTouchEnd={finishPdfScroll}
          onTouchMove={beginPdfScroll}
          testID="pdf-viewer-container">
          <View
            testID="pdf-viewport"
            style={{
              width: Math.max(width - PDF_VIEWER_INSET * 2, 1),
              height: Math.max(height - viewerTopMargin - PDF_VIEWER_INSET, 1),
              marginBottom: PDF_VIEWER_INSET,
              marginHorizontal: PDF_VIEWER_INSET,
              marginTop: viewerTopMargin,
            }}>
            <Pdf
              enablePaging={false}
              fitPolicy={0}
              horizontal={false}
              maxScale={5}
              minScale={1}
              onError={(pdfError) => {
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
                backgroundColor: colors.ink,
              }}
              trustAllCerts={false}
            />
          </View>
          {loading ? (
            <View className="absolute inset-0 items-center justify-center bg-ink">
              <ActivityIndicator color={colors.purple} size="large" />
              <AppText variant="caption" className="mt-4 text-line">
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
                    className="absolute right-2 rounded-lg bg-white/10 px-2 py-1"
                    style={[
                      { transformOrigin: 'right center' },
                      scrubberLabelAnimatedStyle,
                    ]}>
                    <AppText
                      variant="label"
                      className="text-[15px] text-ink"
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

      <Animated.View
        accessibilityElementsHidden={!headerVisible}
        importantForAccessibility={headerVisible ? 'auto' : 'no-hide-descendants'}
        pointerEvents={headerVisible ? 'auto' : 'none'}
        testID="pdf-header"
        className="absolute left-0 right-0 top-0 z-10 bg-ink px-2"
        style={[{ height: headerHeight, paddingTop: headerTopInset }, headerAnimatedStyle]}>
        <View className="h-11 flex-row items-center">
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            className="h-11 w-12 items-center justify-center rounded-full active:bg-white/10"
            onPress={() => router.back()}>
            <ChevronLeft color={colors.paper} size={30} strokeWidth={2.2} />
          </Pressable>
          <AppText
            accessibilityRole="header"
            ellipsizeMode="middle"
            numberOfLines={1}
            variant="label"
            className="flex-1 text-center text-paper">
            {fileName}
          </AppText>
          <View className="h-11 w-12" />
        </View>
      </Animated.View>
      {timerActive ? (
        <Animated.View
          accessibilityElementsHidden={!headerVisible}
          importantForAccessibility={headerVisible ? 'auto' : 'no-hide-descendants'}
          pointerEvents={headerVisible ? 'box-none' : 'none'}
          testID="pdf-timer-pill"
          className="absolute left-0 right-0 z-20 items-center"
          style={[{ top: headerHeight + PDF_TIMER_PILL_GAP }, headerAnimatedStyle]}>
          <View className="relative h-11 min-w-28">
            <View className="absolute inset-0 translate-x-1 translate-y-1 rounded-full bg-ink" />
            <Pressable
              accessibilityLabel={`${timerPhase === 'study' ? 'Study' : 'Rest'} timer${timerStatus === 'paused' ? ' paused' : ''}, ${formatTimer(timerSecondsRemaining)} remaining. Open timer controls.`}
              accessibilityRole="button"
              accessibilityState={{ expanded: timerManagerVisible }}
              className="h-11 min-w-28 flex-row items-center justify-center gap-2 rounded-full border-2 border-ink bg-purple px-4 active:bg-purple-dark"
              onPress={() => setTimerManagerSession(timerSession)}>
              <TimerPillIcon
                color={colors.white}
                size={16}
                strokeWidth={2.4}
                testID={
                  timerStatus === 'paused'
                    ? 'pdf-timer-paused-icon'
                    : timerPhase === 'rest'
                      ? 'pdf-timer-rest-icon'
                      : 'pdf-timer-running-icon'
                }
              />
              <AppText className="text-white" variant="label">
                {formatTimer(timerSecondsRemaining)}
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
      <TimerManagerSheet
        onDismiss={() => setTimerManagerSession(null)}
        visible={timerManagerVisible}
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
    const file = getPdfFile(folderId, relativePath);
    if (!file.exists) {
      throw new Error('This PDF is no longer stored on the device.');
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
