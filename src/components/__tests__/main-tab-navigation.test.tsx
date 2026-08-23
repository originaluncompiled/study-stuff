import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabsLayout from '@/app/(tabs)/_layout';
import { colors } from '@/constants/theme';
import { createDefaultTimerState, reconcileTimerState } from '@/lib/timer';
import { useTimerStore } from '@/store/timer-store';

const mockDispatch = jest.fn();
const mockEmit = jest.fn(() => ({ defaultPrevented: false }));
const mockNavigate = jest.fn();
let mockTimerScreenOptions: { lazy?: boolean; title?: string } | undefined;
let mockTabsProps: {
  detachInactiveScreens?: boolean;
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
    children?: React.ReactElement<{
      name: string;
      options?: { lazy?: boolean; title?: string };
    }>[];
    detachInactiveScreens?: boolean;
    screenLayout?: unknown;
    screenOptions?: typeof mockTabsProps.screenOptions;
    tabBar: (props: object) => React.ReactNode;
  }) {
    mockTabsProps = props;
    mockTimerScreenOptions = props.children?.find((child) => child.props.name === 'timer')?.props.options;
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
    mockTimerScreenOptions = undefined;
    mockState.index = 0;
    useTimerStore.setState({
      ...reconcileTimerState(createDefaultTimerState(), 0),
      hydrated: true,
      hydrationError: null,
      persistenceError: null,
    });
  });

  it('uses the default tab scene lifecycle without content animation', async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 47 },
        }}>
        <TabsLayout />
      </SafeAreaProvider>,
    );

    expect(mockTabsProps.screenOptions?.animation).toBeUndefined();
    expect(mockTabsProps.detachInactiveScreens).toBeUndefined();
    expect(mockTimerScreenOptions).toEqual({ title: 'Timer' });
    expect(mockTabsProps.screenOptions?.headerShown).toBe(false);
    expect(mockTabsProps.screenOptions?.sceneStyleInterpolator).toBeUndefined();
    expect(mockTabsProps.screenOptions?.transitionSpec).toBeUndefined();
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
    expect(view.getByRole('tab', { name: 'Library' }).props.className).toContain('px-[15px]');
    expect(view.getByRole('tab', { name: 'Timer' }).props.className).toContain('px-[15px]');
    expect(view.getByRole('tab', { name: 'Settings' }).props.className).toContain('px-[15px]');
    expect(view.getByRole('tab', { name: 'Library' }).props.className).not.toContain('w-14');
    expect(view.getByRole('tab', { name: 'Library' }).props.className).toContain('bg-ink');
    expect(view.getByRole('tab', { name: 'Timer' }).props.className).toContain('w-14');
    expect(view.getByRole('tab', { name: 'Timer' }).props.className).toContain('bg-paper-raised');
    expect(view.getByRole('tab', { name: 'Settings' }).props.className).toContain('w-14');
    expect(view.getByTestId('library-tab-label').props.className).toBe('px-2');
    expect(view.queryByTestId('timer-tab-label')).toBeNull();
    expect(view.queryByTestId('settings-tab-label')).toBeNull();
    expect(view.getByTestId('settings-tab-background')).toHaveStyle({
      backgroundColor: colors.paperRaised,
    });

    mockState.index = 2;
    await view.rerender(renderTabs());

    expect(view.getByTestId('library-tab-background')).toHaveStyle({
      backgroundColor: colors.paperRaised,
    });
    expect(view.getByTestId('settings-tab-background')).toHaveStyle({
      backgroundColor: colors.ink,
    });
    expect(view.queryByTestId('library-tab-label')).toBeNull();
    expect(view.getByTestId('settings-tab-label').props.className).toBe('px-2');
    expect(view.getByRole('tab', { name: 'Library' }).props.className).toContain('w-14');
    expect(view.getByRole('tab', { name: 'Settings' }).props.className).not.toContain('w-14');
    expect(view.getByRole('tab', { name: 'Settings' }).props.className).toContain('bg-ink');

    mockState.index = 0;
    await view.rerender(renderTabs());

    expect(view.queryByTestId('settings-tab-label')).toBeNull();
    expect(view.getByTestId('library-tab-label')).toBeTruthy();
    expect(view.queryByText('Settings')).toBeNull();
  });

  it('marks the timer tab during study and rest sessions', async () => {
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

    expect(view.queryByTestId('timer-tab-active-indicator')).toBeNull();

    await act(async () => {
      useTimerStore.setState({ status: 'running', phase: 'study' });
    });
    expect(view.getByTestId('timer-tab-active-indicator')).toHaveStyle({ left: 5, top: -10.5 });
    expect(view.getByTestId('timer-tab-active-indicator').props.className).toContain(
      'border-2 border-ink bg-purple',
    );
    expect(view.getByRole('tab', { name: 'Timer' }).props.className).toContain(
      'overflow-hidden',
    );
    expect(view.getByTestId('timer-tab-background').props.className).toBe('absolute inset-0');
    expect(view.getByTestId('timer-tab-background').props.children).toBeUndefined();
    expect(view.getByRole('tab', { name: 'Timer' }).props.accessibilityValue).toEqual({
      text: 'Timer running',
    });

    mockState.index = 1;
    await view.rerender(renderTabs());
    expect(view.getByTestId('timer-tab-active-indicator')).toHaveStyle({ left: 5, top: -10.5 });

    mockState.index = 0;
    await view.rerender(renderTabs());
    expect(view.getByTestId('timer-tab-active-indicator')).toHaveStyle({ left: 5, top: -10.5 });

    await act(async () => {
      useTimerStore.setState({ phase: 'rest' });
    });
    expect(view.getByTestId('timer-tab-active-indicator')).toBeTruthy();

    await act(async () => {
      useTimerStore.setState({ status: 'paused' });
    });
    expect(view.queryByTestId('timer-tab-active-indicator')).toBeNull();
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
