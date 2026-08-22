import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabsLayout from '@/app/(tabs)/_layout';

const mockDispatch = jest.fn();
const mockEmit = jest.fn(() => ({ defaultPrevented: false }));
const mockNavigate = jest.fn();
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
  function Tabs({ tabBar }: { tabBar: (props: object) => React.ReactNode }) {
    return tabBar({
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
