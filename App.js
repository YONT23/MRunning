import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Debe importarse una vez en la raíz para registrar el task de ubicación.
import './src/tasks/locationTask';

import WelcomeScreen from './src/screens/WelcomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ActivityTypeScreen from './src/screens/ActivityTypeScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import HistoryDetailScreen from './src/screens/HistoryDetailScreen';
import ShareCardsScreen from './src/screens/ShareCardsScreen';
import MainTabs from './src/navigation/MainTabs';
import { getOnboarded } from './src/store/settingsStore';
import { colors } from './src/theme/colors';
import {darkPalette,lightPalette} from './src/theme/useAppTheme';

const Stack = createNativeStackNavigator();

export default function App() {
  const isLight=useColorScheme()==='light';
  const themePalette=isLight?lightPalette:darkPalette;
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    getOnboarded().then((done) => setInitialRoute(done ? 'MainTabs' : 'Welcome'));
  }, []);

  if (!initialRoute) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={{dark:!isLight,colors:{primary:themePalette.blue,background:themePalette.bg,card:themePalette.surface,text:themePalette.text,border:themePalette.border,notification:themePalette.red}}}>
        <StatusBar style={isLight?"dark":"light"} />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ActivityType" component={ActivityTypeScreen} />
          <Stack.Screen name="Tracking" component={TrackingScreen} />
          <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
          <Stack.Screen name="ShareCards" component={ShareCardsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
