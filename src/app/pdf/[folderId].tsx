import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import Pdf from 'react-native-pdf';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';
import { normalizeRelativePath } from '@/lib/paths';
import { getPdfHeaderVisibility } from '@/lib/pdf-viewer';
import { getPdfFile } from '@/services/library-files';

export default function PdfScreen() {
  const params = useLocalSearchParams<'/pdf/[folderId]'>();
  const rawPath = Array.isArray(params.path) ? params.path[0] : params.path;
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<PdfResolution | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const previousPage = useRef(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setResolution(resolvePdf(params.folderId, rawPath));
    }, 0);
    return () => clearTimeout(timeout);
  }, [params.folderId, rawPath]);

  const { fileName = 'PDF', uri = null, error: routeError = null } = resolution ?? {};

  const error = routeError || viewerError;

  function updateHeaderForPage(page: number) {
    setHeaderVisible((currentVisibility) =>
      getPdfHeaderVisibility(previousPage.current, page, currentVisibility),
    );
    previousPage.current = page;
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={headerVisible ? [] : ['top']}>
      <StatusBar hidden={false} style="light" />
      <Stack.Screen
        options={{
          headerShown: headerVisible,
          statusBarHidden: false,
          statusBarStyle: 'light',
          title: fileName,
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
        <View className="flex-1">
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
            onLoadComplete={() => setLoading(false)}
            onPageChanged={updateHeaderForPage}
            source={{ uri }}
            spacing={8}
            style={{
              flex: 1,
              width,
              height,
              backgroundColor: colors.ink,
            }}
            trustAllCerts={false}
          />
          {loading ? (
            <View className="absolute inset-0 items-center justify-center bg-ink">
              <ActivityIndicator color={colors.purple} size="large" />
              <AppText variant="caption" className="mt-4 text-line">
                Opening PDF…
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
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
