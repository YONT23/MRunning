import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = 'mrunning_metric_prefs_v1';
export const OPTIONS = [
  {id:'time',label:'Tiempo'}, {id:'pace',label:'Ritmo promedio'},
  {id:'speed',label:'Velocidad media'}, {id:'accuracy',label:'Precisión GPS'},
  {id:'points',label:'Lecturas GPS'}, {id:'rejected',label:'Saltos descartados'},
];
export const DEFAULT_METRICS = ['time','pace','speed','accuracy'];
export async function getMetricPrefs(){
  const raw=await AsyncStorage.getItem(KEY);
  if(!raw) return DEFAULT_METRICS;
  try {
    const value=JSON.parse(raw);
    if(!Array.isArray(value)) return DEFAULT_METRICS;
    const unique=[...new Set(value)].filter(id=>OPTIONS.some(o=>o.id===id));
    return unique.length>=2 && unique.length<=6?unique:DEFAULT_METRICS;
  } catch { return DEFAULT_METRICS; }
}
export async function setMetricPrefs(value){
  const unique=[...new Set(value)].filter(id=>OPTIONS.some(o=>o.id===id));
  if(unique.length<2 || unique.length>6) throw new Error('Selecciona entre 2 y 6 métricas.');
  await AsyncStorage.setItem(KEY,JSON.stringify(unique));
}
