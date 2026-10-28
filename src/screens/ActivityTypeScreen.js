import React, { useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Switch,
} from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import { colors, spacing, radius } from '../theme/colors';
import { setLastActivity } from '../store/settingsStore';
import { validatePlan } from '../utils/trainingPlan';

import {
  getTrainingPrefs,
  setTrainingPrefs,
} from '../store/trainingPrefs';

const options = [
  {
    id: 'free',
    name: 'Carrera libre',
    hint: 'Corre sin objetivo fijado',
  },
  {
    id: 'distance',
    name: 'Distancia',
    hint: 'Meta de kilómetros',
  },
  {
    id: 'time',
    name: 'Tiempo',
    hint: 'Meta en minutos',
  },
  {
    id: 'pace',
    name: 'Ritmo objetivo',
    hint: 'Ritmo en min/km',
  },
  {
    id: 'intervals',
    name: 'Intervalos',
    hint: 'Calentamiento, series y recuperación',
  },
];

export default function ActivityTypeScreen({ navigation }) {
  const [kind, setKind] = useState('free');
  const [activity, setActivity] = useState('running');

  const [km, setKm] = useState('5');
  const [mins, setMins] = useState('30');
  const [pace, setPace] = useState('5:30');

  const [sets, setSets] = useState('5');
  const [work, setWork] = useState('2');
  const [rest, setRest] = useState('1');

  const [prefs, setPrefs] = useState(null);

  React.useEffect(() => {
    getTrainingPrefs()
      .then(setPrefs)
      .catch(() => {});
  }, []);

  const toggle = async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);

    try {
      await setTrainingPrefs(next);
    } catch {
      Alert.alert('Error', 'No se guardó la preferencia.');
    }
  };

  const parse = n => Number(
    String(n).trim().replace(',', '.')
  );

  const build = () => {
    if (kind === 'free') {
      return { kind: 'free' };
    }

    if (kind === 'distance') {
      return validatePlan({
        kind,
        meters: parse(km) * 1000,
      });
    }

    if (kind === 'time') {
      return validatePlan({
        kind,
        seconds: Math.round(parse(mins) * 60),
      });
    }

    if (kind === 'pace') {
      const match = /^(\d{1,2}):(\d{2})$/.exec(
        pace.trim()
      );

      if (!match || +match[2] > 59) {
        throw new Error(
          'Usa el ritmo mm:ss, por ejemplo 5:30'
        );
      }

      return validatePlan({
        kind,
        paceSeconds:
          +match[1] * 60 + (+match[2]),
      });
    }

    return validatePlan({
      kind,
      sets: parse(sets),
      warmup: 300,
      work: Math.round(parse(work) * 60),
      recovery: Math.round(parse(rest) * 60),
      cooldown: 180,
    });
  };

  const open = async () => {
    try {
      const trainingPlan = build();

      await setLastActivity(activity);

      navigation.navigate('Tracking', {
        activityType: activity,
        trainingPlan,
      });
    } catch (e) {
      Alert.alert('Revisa tu objetivo', e.message);
    }
  };

  const field = (label, value, setter) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={setter}
        keyboardType={
          label.includes('Ritmo')
            ? 'default'
            : 'decimal-pad'
        }
        style={styles.input}
      />
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{paddingBottom:40}}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop:12, marginBottom:14 }}
        >
          <Text style={{color:colors.blue}}>‹ Atrás</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Preparar entrenamiento
        </Text>

        <Text style={styles.help}>
          Elige cómo quieres correr. El GPS no inicia
          hasta pulsar Iniciar en la siguiente pantalla.
        </Text>

        <View style={styles.row}>
          {['running','walking'].map(v => (
            <TouchableOpacity
              key={v}
              onPress={() => setActivity(v)}
              style={[
                styles.chip,
                activity === v && styles.active,
              ]}
            >
              <Text style={styles.chipText}>
                {v === 'running' ? 'Correr' : 'Caminar'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>MODALIDAD</Text>

        <View style={styles.list}>
          {options.map(o => (
            <TouchableOpacity
              key={o.id}
              onPress={() => setKind(o.id)}
              style={[
                styles.option,
                kind === o.id && styles.selected,
              ]}
            >
              <View>
                <Text style={styles.optionText}>
                  {o.name}
                </Text>
                <Text style={styles.help}>
                  {o.hint}
                </Text>
              </View>

              <Text style={{
                color: kind === o.id
                  ? colors.blue
                  : colors.textMuted,
                fontSize: 19,
              }}>
                {kind === o.id ? '◉' : '○'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {kind === 'distance' &&
          field('Distancia (km)', km, setKm)}

        {kind === 'time' &&
          field('Tiempo (minutos)', mins, setMins)}

        {kind === 'pace' &&
          field('Ritmo (mm:ss por km)', pace, setPace)}

        {kind === 'intervals' && (
          <View style={styles.card}>
            <Text style={styles.optionText}>
              Series programadas
            </Text>

            <Text style={styles.help}>
              5 minutos de calentamiento y
              3 de vuelta a la calma.
            </Text>

            {field('Número de series', sets, setSets)}
            {field('Trabajo (minutos)', work, setWork)}
            {field('Recuperación (minutos)', rest, setRest)}
          </View>
        )}

        <Text style={styles.section}>PREFERENCIAS</Text>

        {prefs && [
          ['autoPause','Pausa automática GPS'],
          ['vibration','Vibración'],
          ['voice','Avisos por voz (pantalla activa)'],
          ['kilometerAlerts','Aviso cada kilómetro'],
        ].map(([key,label]) => (
          <View key={key} style={styles.toggle}>
            <Text style={{
              color: colors.white,
              flex: 1,
              fontSize: 13,
            }}>
              {label}
            </Text>

            <Switch
              value={!!prefs[key]}
              onValueChange={v => toggle(key,v)}
              trackColor={{true:colors.blue}}
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={open}
          style={styles.primary}
        >
          <Text style={{
            color:'#FFF',
            fontWeight:'800',
            fontSize:16,
          }}>
            Continuar al GPS
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title:{
    color:colors.white,fontSize:25,fontWeight:'800',
  },
  help:{
    color:colors.textMuted,fontSize:12,
    marginTop:4,lineHeight:18,
  },
  row:{
    flexDirection:'row',gap:10,marginVertical:16,
  },
  chip:{
    flex:1,borderWidth:1,borderColor:colors.border,
    borderRadius:13,padding:12,alignItems:'center',
  },
  active:{
    borderColor:colors.blue,
    backgroundColor:colors.blueDark,
  },
  chipText:{
    color:colors.white,fontWeight:'700',
  },
  section:{
    color:colors.blue,fontSize:11,fontWeight:'800',
    letterSpacing:1.5,marginTop:16,marginBottom:8,
  },
  list:{gap:6},
  option:{
    flexDirection:'row',alignItems:'center',
    justifyContent:'space-between',
    borderRadius:14,borderColor:colors.border,
    borderWidth:1,padding:13,
  },
  selected:{
    borderColor:colors.blue,
    backgroundColor:colors.bgElevated,
  },
  optionText:{
    color:colors.white,fontSize:15,fontWeight:'800',
  },
  field:{marginTop:12},
  label:{
    color:colors.textMuted,marginBottom:5,fontSize:12,
  },
  input:{
    color:colors.white,borderColor:colors.border,
    borderWidth:1,borderRadius:12,padding:12,fontSize:17,
  },
  card:{
    backgroundColor:colors.bgElevated,
    borderRadius:14,padding:14,marginTop:12,
  },
  toggle:{
    flexDirection:'row',alignItems:'center',
    paddingVertical:10,borderBottomWidth:1,
    borderColor:colors.border,
  },
  primary:{
    backgroundColor:colors.blue,borderRadius:15,
    padding:17,alignItems:'center',marginTop:25,
  },
});
