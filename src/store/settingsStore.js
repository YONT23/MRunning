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

// Meta semanal en kilómetros
const WEEKLY_GOAL_KEY = 'mrunning_weekly_goal_km';

export async function getWeeklyGoalKm() {
  const raw = await AsyncStorage.getItem(WEEKLY_GOAL_KEY);
  const n = Number(raw);

  return raw && Number.isFinite(n) && n >= 1 && n <= 500
    ? n
    : 25;
}

export async function setWeeklyGoalKm(km) {
  const n = Number(km);

  if (!Number.isFinite(n) || n < 1 || n > 500) {
    throw new Error('Meta inválida');
  }

  await AsyncStorage.setItem(WEEKLY_GOAL_KEY, String(n));
}
