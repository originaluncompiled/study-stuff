import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';

export default function TimerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-5 pt-5">
        <View className="mb-3 h-2 w-16 rounded-full bg-purple" />
        <AppText variant="display">Timer</AppText>
      </View>
    </SafeAreaView>
  );
}
