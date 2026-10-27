import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import ProgressScreen from '../screens/ProgressScreen';
import TabBar from '../components/TabBar';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Espacio reservado para el botón "+". El toque se intercepta en TabBar.
function EmptyScreen() {
  return <View />;
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      <Tab.Screen
        name="Nuevo"
        component={EmptyScreen}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tab.Screen name="Progreso" component={ProgressScreen} />
      <Tab.Screen name="Perfil">{() => <PlaceholderScreen title="Perfil" />}</Tab.Screen>
    </Tab.Navigator>
  );
}
