import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import TabBar from '../components/TabBar';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Espacio reservado para el botón "+". Nunca se muestra: el toque se
// intercepta en TabBar y lleva a la elección de actividad.
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
      <Tab.Screen name="Historial">{() => <PlaceholderScreen title="Historial" />}</Tab.Screen>
      <Tab.Screen
        name="Nuevo"
        component={EmptyScreen}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tab.Screen name="Progreso">{() => <PlaceholderScreen title="Progreso" />}</Tab.Screen>
      <Tab.Screen name="Perfil">{() => <PlaceholderScreen title="Perfil" />}</Tab.Screen>
    </Tab.Navigator>
  );
}
