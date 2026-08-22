import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabsLayout from '@/app/(tabs)/_layout';
import { colors } from '@/constants/theme';

const mockDispatch = jest.fn();
const mockEmit = jest.fn(() => ({ defaultPrevented: false }));
const mockNavigate = jest.fn();
let mockTabsProps: {
  screenLayout?: unknown;
  screenOptions?: {
    animation?: string;
    headerShown?: boolean;
    sceneStyleInterpolator?: (props: {
      current: {
        progress: {
          interpolate: (config: { inputRange: number[]; outputRange: number[] }) => unknown;
        };
      };
    }) => unknown;
    transitionSpec?: { animation?: string; config?: { duration?: number } };
  };
};
const mockState = {
  index: 0,
  key: 'main-tabs',
  routes: [
    { key: 'library-tab', name: '(library)' },
    { key: 'timer-tab', name: 'timer' },
    { key: 'settings-tab', name: 'settings' },
  ],
};

jest.mock('expo-router', () => {
  function Tabs(props: {
    screenLayout?: unknown;
    screenOptions?: typeof mockTabsProps.screenOptions;
    tabBar: (props: object) => React.ReactNode;
  }) {
    mockTabsProps = props;
    return props.tabBar({
      navigation: {
        dispatch: mockDispatch,
        emit: mockEmit,
        navigate: mockNavigate,
      },
      state: mockState,
    });
  }

  function Screen() {
    return null;
  }

  Tabs.Screen = Screen;

  return { Tabs };
});

describe('main tab navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.index = 0;
  });

  it('slides pages edge-to-edge without fading', async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 47 },
        }}>
        <TabsLayout />
      </SafeAreaProvider>,
    );

    const interpolate = jest.fn(() => 'horizontal-offset');
    const sceneStyle = mockTabsProps.screenOptions?.sceneStyleInterpolator?.({
      current: { progress: { interpolate } },
    });
    const width = Dimensions.get('window').width;

    expect(mockTabsProps.screenOptions?.animation).toBeUndefined();
    expect(mockTabsProps.screenOptions?.headerShown).toBe(false);
    expect(mockTabsProps.screenOptions?.transitionSpec).toEqual({
      animation: 'timing',
      config: expect.objectContaining({ duration: 220 }),
    });
    expect(interpolate).toHaveBeenCalledWith({
      inputRange: [-1, 0, 1],
      outputRange: [-width, 0, width],
    });
    expect(sceneStyle).toEqual({
      sceneStyle: { transform: [{ translateX: 'horizontal-offset' }] },
    });
    expect(mockTabsProps.screenLayout).toBeUndefined();
  });

  it('updates the selected tab background when the active route changes', async () => {
    const renderTabs = () => (
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 47 },
        }}>
        <TabsLayout />
      </SafeAreaProvider>
    );
    const view = await render(renderTabs());

    expect(view.getByTestId('library-tab-background')).toHaveStyle({
      backgroundColor: colors.ink,
    });
    expect(view.getByRole('tab', { name: 'Library' })).toHaveStyle({ minWidth: 56 });
    expect(view.getByRole('tab', { name: 'Settings' })).toHaveStyle({ minWidth: 56 });
    expect(view.getByTestId('settings-tab-background')).toHaveStyle({
      backgroundColor: colors.paperRaised,
    });

    mockState.index = 2;
    await view.rerender(renderTabs());

    expect(view.getByRole('tab', { name: 'Library' })).toHaveStyle({ minWidth: 56 });
    expect(view.getByTestId('library-tab-background')).toHaveStyle({
      backgroundColor: colors.paperRaised,
    });
    expect(view.getByTestId('settings-tab-background')).toHaveStyle({
      backgroundColor: colors.ink,
    });
    expect(view.getByRole('tab', { name: 'Settings' })).toHaveStyle({ minWidth: 56 });

    mockState.index = 0;
    await view.rerender(renderTabs());

    expect(view.getByRole('tab', { name: 'Settings' })).toHaveStyle({ minWidth: 56 });
    expect(view.queryByText('Settings')).toBeNull();
  });

  it.each([
    { label: 'Timer', routeKey: 'timer-tab', routeName: 'timer' },
    { label: 'Settings', routeKey: 'settings-tab', routeName: 'settings' },
  ])('targets the $label action at the tabs navigator', async ({ label, routeKey, routeName }) => {
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 47 },
        }}>
        <TabsLayout />
      </SafeAreaProvider>,
    );

    await fireEvent.press(view.getByRole('tab', { name: label }));

    expect(mockEmit).toHaveBeenCalledWith({
      canPreventDefault: true,
      target: routeKey,
      type: 'tabPress',
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      payload: expect.objectContaining({ name: routeName }),
      target: 'main-tabs',
      type: 'NAVIGATE',
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
