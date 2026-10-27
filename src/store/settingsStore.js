import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDED_KEY = 'rbt_onboarded';
const UNITS_KEY = 'rbt_units'; // 'km' | 'mi'
const LAST_ACTIVITY_KEY = 'rbt_last_activity'; // 'running' | 'walking'

export async function getOnboarded() {
  return (await AsyncStorage.getItem(ONBOARDED_KEY)) === 'true';
}
export async function setOnboarded() {
  await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
}

export async function getUnits() {
  return (await AsyncStorage.getItem(UNITS_KEY)) || 'km';
}
export async function setUnits(units) {
  await AsyncStorage.setItem(UNITS_KEY, units);
}

export async function getLastActivity() {
  return (await AsyncStorage.getItem(LAST_ACTIVITY_KEY)) || 'running';
}
export async function setLastActivity(type) {
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, type);
}
