import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mrunning_current_training_plan';

export const FREE = { kind: 'free' };

export async function setCurrentPlan(plan) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(plan || FREE)
  );
}

export async function getCurrentPlan() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : FREE;
  } catch {
    return FREE;
  }
}

export async function clearCurrentPlan() {
  await AsyncStorage.removeItem(KEY);
}
