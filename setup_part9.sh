#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/MRunning

if [ ! -f package.json ] || [ ! -f src/navigation/MainTabs.js ]; then
  echo "ERROR: No se encontró MRunning."
  exit 1
fi

mkdir -p src/utils src/screens tests

cp src/navigation/MainTabs.js \
  "src/navigation/MainTabs.js.bak-parte9-$(date +%s)"

# ==========================================
# 1. MOTOR DE ESTADÍSTICAS
# ==========================================

cat > src/utils/progressStats.js <<'EOF'
const MONTHS = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic'
];

const DAYS = ['D','L','M','X','J','V','S'];
const DISTANCES = [1,3,5,10];

function dayStart(d) {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
}

function addDays(d, n) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function validHistory(history, now) {
  return (Array.isArray(history) ? history : [])
    .filter(e =>
      e &&
      Number.isFinite(e.distance) &&
      e.distance > 0 &&
      Number.isFinite(e.elapsed) &&
      e.elapsed > 0
    )
    .map(e => ({
      ...e,
      parsedDate: new Date(e.date),
    }))
    .filter(e =>
      Number.isFinite(e.parsedDate.getTime()) &&
      e.parsedDate <= now
    )
    .sort((a,b) => a.parsedDate - b.parsedDate);
}

function getStart(now, period) {
  const today = dayStart(now);

  if (period === '7d') return addDays(today,-6);
  if (period === '30d') return addDays(today,-29);

  if (period === '12m') {
    return new Date(
      now.getFullYear(),
      now.getMonth()-11,
      1
    );
  }

  return null;
}

function bucketsFor(entries, period, now) {
  const today = dayStart(now);

  if (period === '7d') {
    const start = addDays(today,-6);

    return Array.from({length:7},(_,i) => {
      const d = addDays(start,i);

      return {
        key: String(i),
        label: DAYS[d.getDay()],
        meters: 0,
        count: 0,
        start: d,
        end: addDays(d,1),
      };
    });
  }

  if (period === '30d') {
    const start = addDays(today,-29);

    return Array.from({length:5},(_,i) => ({
      key: String(i),
      label: `S${i+1}`,
      meters: 0,
      count: 0,
      start: addDays(start,i*7),
      end: addDays(start,Math.min((i+1)*7,30)),
    }));
  }

  if (period === '12m') {
    return Array.from({length:12},(_,i) => {
      const d = new Date(
        now.getFullYear(),
        now.getMonth()-11+i,
        1
      );

      return {
        key: String(i),
        label: MONTHS[d.getMonth()],
        meters: 0,
        count: 0,
        start: d,
        end: new Date(
          d.getFullYear(),
          d.getMonth()+1,
          1
        ),
      };
    });
  }

  const firstYear = entries.length
    ? entries[0].parsedDate.getFullYear()
    : now.getFullYear();

  const count = Math.max(
    1,
    now.getFullYear()-firstYear+1
  );

  return Array.from({length:count},(_,i) => {
    const year = firstYear+i;

    return {
      key: String(year),
      label: String(year),
      meters: 0,
      count: 0,
      start: new Date(year,0,1),
      end: new Date(year+1,0,1),
    };
  });
}

// Mejor tramo consecutivo de N kilómetros.
// Solo utiliza parciales completos y válidos.
function bestPartial(entries,kms) {
  let best = null;

  for (const entry of entries) {
    const splits = Array.isArray(entry.splits)
      ? entry.splits
      : [];

    for (let i=0;i+kms<=splits.length;i++) {
      const section = splits.slice(i,i+kms);

      const valid = section.every((s,j) =>
        !s.partial &&
        Number.isFinite(s.seconds) &&
        s.seconds > 0 &&
        Number.isInteger(s.km) &&
        (!j || s.km === section[j-1].km+1)
      );

      if (!valid) continue;

      const seconds = section.reduce(
        (sum,s) => sum+s.seconds,0
      );

      if (!best || seconds < best.seconds) {
        best = {
          distanceKm: kms,
          seconds,
          id: entry.id,
          date: entry.date,
          estimated: false,
        };
      }
    }
  }

  return best;
}

function personalRecords(runs) {
  const records = DISTANCES.map(km => ({
    km,
    result: bestPartial(runs,km),
  }));

  const target = 21097.5;
  let half = null;

  for (const run of runs) {
    if (
      run.distance < target ||
      run.distance > target*1.02
    ) continue;

    const seconds = run.elapsed*target/run.distance;

    if (!half || seconds < half.seconds) {
      half = {
        distanceKm: 21.0975,
        seconds,
        id: run.id,
        date: run.date,
        estimated: true,
      };
    }
  }

  records.push({
    km: 21.0975,
    result: half,
  });

  return records;
}

function longestStreak(entries) {
  const days = [
    ...new Set(
      entries.map(e => {
        const d = e.parsedDate;

        return Date.UTC(
          d.getFullYear(),
          d.getMonth(),
          d.getDate()
        )/86400000;
      })
    )
  ].sort((a,b) => a-b);

  let best = 0;
  let current = 0;
  let previous = null;

  for (const day of days) {
    current = day === previous+1
      ? current+1
      : 1;

    best = Math.max(best,current);
    previous = day;
  }

  return best;
}

function getAchievements(entries,runs) {
  const total = entries.reduce(
    (sum,e) => sum+e.distance,0
  );

  const longest = longestStreak(entries);

  const longestRun = runs.reduce(
    (max,e) => Math.max(max,e.distance),0
  );

  const definitions = [
    {
      id:'first',
      title:'Primer paso',
      subtitle:'Completa tu primera actividad',
      icon:'●',
      value:entries.length,
      target:1,
    },
    {
      id:'five',
      title:'Constancia',
      subtitle:'Completa 5 actividades',
      icon:'◆',
      value:entries.length,
      target:5,
    },
    {
      id:'25km',
      title:'25 kilómetros',
      subtitle:'Acumula 25 km',
      icon:'◈',
      value:total,
      target:25000,
    },
    {
      id:'100km',
      title:'100 kilómetros',
      subtitle:'Acumula 100 km',
      icon:'★',
      value:total,
      target:100000,
    },
    {
      id:'streak3',
      title:'Tres días seguidos',
      subtitle:'Entrena durante 3 días consecutivos',
      icon:'↗',
      value:longest,
      target:3,
    },
    {
      id:'streak7',
      title:'Semana activa',
      subtitle:'Entrena durante 7 días consecutivos',
      icon:'✦',
      value:longest,
      target:7,
    },
    {
      id:'run5',
      title:'Corredor 5K',
      subtitle:'Completa una carrera de 5 km',
      icon:'5',
      value:longestRun,
      target:5000,
    },
    {
      id:'run10',
      title:'Corredor 10K',
      subtitle:'Completa una carrera de 10 km',
      icon:'10',
      value:longestRun,
      target:10000,
    },
  ];

  return definitions.map(d => ({
    ...d,
    done:d.value>=d.target,
    progress:Math.min(1,Math.max(0,d.value/d.target)),
  }));
}

export function calculateProgress(
  history,
  {period='30d',type='all',now=new Date()}={}
) {
  const allowedPeriods = ['7d','30d','12m','all'];
  const allowedTypes = ['all','running','walking'];

  const selectedPeriod = allowedPeriods.includes(period)
    ? period
    : '30d';

  const selectedType = allowedTypes.includes(type)
    ? type
    : 'all';

  const all = validHistory(history,now);

  const runs = all.filter(
    e => e.activityType !== 'walking'
  );

  const filtered = all.filter(e =>
    selectedType === 'all' ||
    (e.activityType === 'walking'
      ? 'walking'
      : 'running') === selectedType
  );

  const start = getStart(now,selectedPeriod);

  const selected = filtered.filter(
    e => !start || e.parsedDate>=start
  );

  const meters = selected.reduce(
    (sum,e) => sum+e.distance,0
  );

  const seconds = selected.reduce(
    (sum,e) => sum+e.elapsed,0
  );

  const longestMeters = selected.reduce(
    (max,e) => Math.max(max,e.distance),0
  );

  const buckets = bucketsFor(
    filtered,
    selectedPeriod,
    now
  );

  for (const entry of selected) {
    const bucket = buckets.find(
      b => entry.parsedDate>=b.start &&
           entry.parsedDate<b.end
    );

    if (bucket) {
      bucket.meters+=entry.distance;
      bucket.count++;
    }
  }

  return {
    meters,
    seconds,
    count:selected.length,
    longestMeters,
    averagePaceSecondsPerKm:
      meters>0 ? seconds/(meters/1000) : null,
    buckets,
    records:personalRecords(runs),
    achievements:getAchievements(all,runs),
    historicalCount:all.length,
  };
}
EOF

# ==========================================
# 2. PANTALLA DE PROGRESO
# ==========================================

cat > src/screens/ProgressScreen.js <<'EOF'
import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import ScreenContainer from '../components/ScreenContainer';
import { getHistory } from '../store/historyStore';
import { getUnits } from '../store/settingsStore';
import { calculateProgress } from '../utils/progressStats';
import { formatDuration,formatPace } from '../utils/haversine';
import { colors,spacing,radius } from '../theme/colors';

const PERIODS = [
  {key:'7d',label:'7 días'},
  {key:'30d',label:'30 días'},
  {key:'12m',label:'12 meses'},
  {key:'all',label:'Todo'},
];

const TYPES = [
  {key:'all',label:'Todo'},
  {key:'running',label:'Correr'},
  {key:'walking',label:'Caminar'},
];

const formatDistance = (meters,unit) =>
  (meters/(unit==='mi'?1609.344:1000)).toFixed(1);

function averagePace(seconds,unit) {
  if (seconds==null) return '--:--';

  return formatPace(
    1000,
    seconds*(unit==='mi'?1.609344:1)
  );
}

function StatCard({label,value,hint}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>

      <Text
        style={styles.statValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function Filter({items,value,onChange}) {
  return (
    <View style={styles.filterRow}>
      {items.map(item=>(
        <TouchableOpacity
          key={item.key}
          onPress={()=>onChange(item.key)}
          style={[
            styles.filter,
            value===item.key && styles.filterActive
          ]}
        >
          <Text style={[
            styles.filterText,
            value===item.key && styles.filterTextActive
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Chart({buckets,unit}) {
  const max = Math.max(
    1,
    ...buckets.map(b=>b.meters)
  );

  return (
    <ScrollView horizontal={buckets.length>12}>
      <View style={[
        styles.chart,
        buckets.length>12 && {
          minWidth:buckets.length*35
        }
      ]}>
        {buckets.map(b=>{
          const height = b.meters>0
            ? Math.max(4,b.meters/max*105)
            : 0;

          return (
            <View key={b.key} style={styles.barColumn}>
              <View style={styles.barArea}>
                <View style={[
                  styles.bar,
                  {height}
                ]}/>
              </View>

              <Text style={styles.barLabel}>
                {b.label}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Record({item,onOpen}) {
  const {km,result} = item;
  const label = km===21.0975?'21,1 km':`${km} km`;

  return (
    <TouchableOpacity
      disabled={!result}
      onPress={()=>result&&onOpen(result.id)}
      style={styles.record}
    >
      <View style={styles.recordBadge}>
        <Text style={styles.recordBadgeText}>
          {km===21.0975?'21':km}
        </Text>
      </View>

      <View style={{flex:1}}>
        <Text style={styles.recordName}>{label}</Text>

        <Text style={styles.muted}>
          {!result
            ? 'Sin marca registrada'
            : result.estimated
              ? 'Tiempo estimado'
              : 'Mejor tramo registrado'}
        </Text>
      </View>

      <Text style={styles.recordTime}>
        {result?formatDuration(result.seconds):'—'}
      </Text>
    </TouchableOpacity>
  );
}

function Achievement({item}) {
  return (
    <View style={[
      styles.achievement,
      item.done && styles.achievementDone
    ]}>
      <View style={styles.achievementIcon}>
        <Text style={styles.icon}>
          {item.icon}
        </Text>
      </View>

      <View style={{flex:1}}>
        <View style={styles.achievementHeader}>
          <Text style={styles.achievementTitle}>
            {item.title}
          </Text>

          <Text style={{
            color:item.done?'#4ADE80':colors.textFaint,
            fontSize:10
          }}>
            {item.done?'Conseguido':'Pendiente'}
          </Text>
        </View>

        <Text style={styles.muted}>
          {item.subtitle}
        </Text>

        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            {width:`${Math.round(item.progress*100)}%`}
          ]}/>
        </View>
      </View>
    </View>
  );
}

export default function ProgressScreen({navigation}) {
  const [history,setHistory] = useState([]);
  const [units,setUnits] = useState('km');
  const [period,setPeriod] = useState('30d');
  const [type,setType] = useState('all');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [now,setNow] = useState(new Date());

  useFocusEffect(
    useCallback(()=>{
      let active=true;
      setLoading(true);

      Promise.all([getHistory(),getUnits()])
        .then(([runs,u])=>{
          if(!active)return;
          setHistory(runs);
          setUnits(u==='mi'?'mi':'km');
          setNow(new Date());
          setError('');
        })
        .catch(()=>{
          if(active)setError(
            'No se pudo cargar el historial.'
          );
        })
        .finally(()=>{
          if(active)setLoading(false);
        });

      return ()=>{active=false};
    },[])
  );

  const data=useMemo(
    ()=>calculateProgress(history,{period,type,now}),
    [history,period,type,now]
  );

  const unlocked=data.achievements.filter(
    a=>a.done
  ).length;

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.brand}>
          MRUNNING · ANÁLISIS
        </Text>

        <Text style={styles.title}>
          Mi progreso
        </Text>

        <Text style={styles.subtitle}>
          Analiza tus recorridos y descubre tu evolución.
        </Text>

        {loading?(
          <ActivityIndicator
            color={colors.blue}
            size="large"
          />
        ):error?(
          <Text style={styles.error}>{error}</Text>
        ):(
          <>
            <Text style={styles.label}>PERÍODO</Text>
            <Filter
              items={PERIODS}
              value={period}
              onChange={setPeriod}
            />

            <Text style={styles.label}>ACTIVIDAD</Text>
            <Filter
              items={TYPES}
              value={type}
              onChange={setType}
            />

            <View style={styles.statsGrid}>
              <StatCard
                label="DISTANCIA"
                value={`${formatDistance(data.meters,units)} ${units}`}
                hint="Total del período"
              />

              <StatCard
                label="TIEMPO"
                value={formatDuration(data.seconds)}
                hint="Tiempo acumulado"
              />

              <StatCard
                label="ACTIVIDADES"
                value={String(data.count)}
                hint="Sesiones completadas"
              />

              <StatCard
                label="RITMO MEDIO"
                value={averagePace(
                  data.averagePaceSecondsPerKm,
                  units
                )}
                hint={`min/${units}`}
              />
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>
                Distancia recorrida
              </Text>

              <Chart
                buckets={data.buckets}
                unit={units}
              />

              <View style={styles.footer}>
                <Text style={styles.muted}>
                  Recorrido más largo
                </Text>

                <Text style={styles.footerValue}>
                  {formatDistance(data.longestMeters,units)} {units}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              Mejores marcas
            </Text>

            <Text style={styles.muted}>
              Récords de running calculados con tus parciales.
            </Text>

            <View style={styles.panel}>
              {data.records.map(item=>(
                <Record
                  key={String(item.km)}
                  item={item}
                  onOpen={id=>
                    navigation.navigate('HistoryDetail',{id})
                  }
                />
              ))}

              <Text style={styles.note}>
                Los tiempos de 1 a 10 km utilizan parciales
                consecutivos válidos. La media maratón
                es una estimación, no un tiempo exacto.
              </Text>
            </View>

            <View style={styles.heading}>
              <Text style={styles.sectionTitle}>
                Mis logros
              </Text>

              <Text style={styles.counter}>
                {unlocked}/{data.achievements.length}
              </Text>
            </View>

            {data.achievements.map(item=>(
              <Achievement
                key={item.id}
                item={item}
              />
            ))}

            <Text style={styles.note}>
              Los resultados se calculan desde el
              historial guardado en este dispositivo.
              Las actividades eliminadas dejan de contar.
            </Text>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles=StyleSheet.create({
  content:{
    paddingTop:spacing.md,
    paddingBottom:spacing.xxl,
  },
  brand:{
    color:colors.blue,
    fontSize:11,
    fontWeight:'800',
    letterSpacing:1.7,
  },
  title:{
    color:colors.white,
    fontSize:28,
    fontWeight:'800',
    marginTop:6,
  },
  subtitle:{
    color:colors.textMuted,
    fontSize:13,
    marginTop:5,
    marginBottom:20,
  },
  label:{
    color:colors.textMuted,
    fontSize:11,
    fontWeight:'800',
    marginBottom:8,
  },
  filterRow:{
    flexDirection:'row',
    backgroundColor:colors.bgElevated,
    borderRadius:12,
    padding:4,
    marginBottom:16,
  },
  filter:{
    flex:1,
    paddingVertical:10,
    alignItems:'center',
    borderRadius:9,
  },
  filterActive:{
    backgroundColor:colors.blue,
  },
  filterText:{
    color:colors.textMuted,
    fontSize:12,
    fontWeight:'700',
  },
  filterTextActive:{
    color:colors.white,
  },
  statsGrid:{
    flexDirection:'row',
    flexWrap:'wrap',
    gap:9,
    marginBottom:14,
  },
  statCard:{
    width:'48%',
    flexGrow:1,
    backgroundColor:colors.bgElevated,
    borderWidth:1,
    borderColor:colors.border,
    borderRadius:radius.md,
    padding:13,
  },
  statLabel:{
    color:colors.textMuted,
    fontSize:10,
    fontWeight:'800',
  },
  statValue:{
    color:colors.white,
    fontSize:25,
    fontWeight:'800',
    marginTop:6,
  },
  statHint:{
    color:colors.textFaint,
    fontSize:10,
    marginTop:4,
  },
  panel:{
    backgroundColor:colors.bgElevated,
    borderWidth:1,
    borderColor:colors.border,
    borderRadius:radius.lg,
    padding:spacing.md,
    marginBottom:18,
    marginTop:10,
  },
  sectionTitle:{
    color:colors.white,
    fontSize:18,
    fontWeight:'800',
    marginTop:8,
  },
  chart:{
    width:'100%',
    minHeight:145,
    flexDirection:'row',
    justifyContent:'space-around',
    alignItems:'flex-end',
    marginTop:12,
  },
  barColumn:{
    flex:1,
    alignItems:'center',
    minWidth:22,
  },
  barArea:{
    height:110,
    width:'100%',
    justifyContent:'flex-end',
    alignItems:'center',
  },
  bar:{
    width:'65%',
    maxWidth:22,
    backgroundColor:colors.blue,
    borderTopLeftRadius:5,
    borderTopRightRadius:5,
  },
  barLabel:{
    color:colors.textMuted,
    fontSize:10,
    marginTop:7,
  },
  footer:{
    borderTopWidth:1,
    borderTopColor:colors.border,
    marginTop:14,
    paddingTop:12,
    flexDirection:'row',
    justifyContent:'space-between',
  },
  footerValue:{
    color:colors.white,
    fontWeight:'800',
  },
  record:{
    flexDirection:'row',
    alignItems:'center',
    paddingVertical:12,
    borderBottomWidth:1,
    borderBottomColor:colors.border,
    gap:12,
  },
  recordBadge:{
    width:43,
    height:43,
    borderRadius:13,
    backgroundColor:'rgba(46,107,255,0.15)',
    alignItems:'center',
    justifyContent:'center',
  },
  recordBadgeText:{
    color:colors.blue,
    fontWeight:'800',
    fontSize:16,
  },
  recordName:{
    color:colors.white,
    fontWeight:'800',
    fontSize:14,
  },
  recordTime:{
    color:colors.white,
    fontWeight:'800',
    fontSize:16,
  },
  muted:{
    color:colors.textMuted,
    fontSize:11,
    marginTop:4,
  },
  note:{
    color:colors.textFaint,
    fontSize:11,
    lineHeight:17,
    marginTop:15,
    marginBottom:12,
  },
  heading:{
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    marginBottom:12,
  },
  counter:{
    color:colors.blue,
    fontWeight:'800',
  },
  achievement:{
    flexDirection:'row',
    alignItems:'center',
    gap:12,
    padding:14,
    backgroundColor:colors.bgElevated,
    borderWidth:1,
    borderColor:colors.border,
    borderRadius:radius.md,
    marginBottom:9,
  },
  achievementDone:{
    borderColor:colors.blue,
  },
  achievementIcon:{
    width:42,
    height:42,
    backgroundColor:colors.blueDark,
    borderRadius:12,
    justifyContent:'center',
    alignItems:'center',
  },
  icon:{
    color:colors.white,
    fontSize:19,
    fontWeight:'800',
  },
  achievementHeader:{
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
  },
  achievementTitle:{
    color:colors.white,
    fontWeight:'800',
    fontSize:12,
    flexShrink:1,
  },
  progressTrack:{
    height:5,
    backgroundColor:colors.border,
    borderRadius:5,
    marginTop:11,
    overflow:'hidden',
  },
  progressFill:{
    height:'100%',
    backgroundColor:colors.blue,
  },
  error:{
    color:colors.red,
    marginTop:30,
  },
});
EOF

# ==========================================
# 3. INTEGRAR LA PESTAÑA PROGRESO
# ==========================================

python3 - <<'PYCODE'
from pathlib import Path

p=Path('src/navigation/MainTabs.js')
s=p.read_text()

old='<Tab.Screen name="Progreso">{() => <PlaceholderScreen title="Progreso" />}</Tab.Screen>'
new='<Tab.Screen name="Progreso" component={ProgressScreen} />'

if old not in s and new not in s:
    raise SystemExit(
        "ERROR: No se encontró la pestaña Progreso."
    )

imp="import ProgressScreen from '../screens/ProgressScreen';"

if imp not in s:
    anchor="import PlaceholderScreen from '../screens/PlaceholderScreen';"

    if anchor not in s:
        raise SystemExit("ERROR: Navegación diferente.")

    s=s.replace(anchor,anchor+'\n'+imp,1)

s=s.replace(old,new,1)

p.write_text(s)
PYCODE

# ==========================================
# 4. PRUEBAS AUTOMÁTICAS
# ==========================================

cat > tests/progressStats.test.mjs <<'EOF'
import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateProgress} from '../src/utils/progressStats.js';

const now=new Date(2026,9,27,18);

const date=day =>
  new Date(2026,9,day,12).toISOString();

const run=(day,distance,elapsed,type='running',splits=[])=>({
  id:`${day}-${distance}`,
  date:date(day),
  distance,
  elapsed,
  activityType:type,
  splits,
});

test('Filtra actividades por período',()=>{
  const history=[
    run(15,9000,2800),
    run(25,2000,800,'walking'),
    run(27,5000,1500),
  ];

  const result=calculateProgress(history,{
    period:'7d',
    now,
  });

  assert.equal(result.meters,7000);
  assert.equal(result.count,2);
});

test('Separa correr y caminar',()=>{
  const history=[
    run(25,2000,800,'walking'),
    run(27,5000,1500),
  ];

  const result=calculateProgress(history,{
    period:'7d',
    type:'running',
    now,
  });

  assert.equal(result.meters,5000);
});

test('Calcula ritmo medio ponderado',()=>{
  const result=calculateProgress([
    run(25,3000,1200),
    run(26,2000,1100),
  ],{now});

  assert.equal(
    result.averagePaceSecondsPerKm,
    460
  );
});

test('Obtiene mejor parcial de 3 km',()=>{
  const splits=[310,305,299,308,302].map(
    (seconds,i)=>({
      km:i+1,
      seconds,
      partial:false,
    })
  );

  const result=calculateProgress([
    run(27,5020,1524,'running',splits),
  ],{now});

  assert.equal(
    result.records.find(r=>r.km===3).result.seconds,
    909
  );
});

test('No inventa récord de 5 km',()=>{
  const result=calculateProgress([
    run(27,4800,1400),
  ],{now});

  assert.equal(
    result.records.find(r=>r.km===5).result,
    null
  );
});

test('Diferencia récords de running y caminata',()=>{
  const splits=Array.from({length:10},(_,i)=>({
    km:i+1,
    seconds:300,
    partial:false,
  }));

  const result=calculateProgress([
    run(27,10000,3000,'walking',splits),
  ],{now});

  assert.equal(
    result.records.find(r=>r.km===10).result,
    null
  );
});

test('Desbloquea logros correctamente',()=>{
  const result=calculateProgress([
    run(25,1000,360),
    run(26,1500,450),
    run(27,2000,600),
  ],{now});

  assert.equal(
    result.achievements.find(a=>a.id==='streak3').done,
    true
  );
});
EOF

# ==========================================
# 5. EJECUTAR LAS PRUEBAS
# ==========================================

if command -v node >/dev/null 2>&1; then
  node --experimental-default-type=module \
    --test tests/progressStats.test.mjs
fi

echo ""
echo "=========================================="
echo "MRUNNING - PARTE 9 INSTALADA"
echo "=========================================="
echo "Pantalla Progreso creada."
echo "Estadísticas integradas."
echo "Récords personales integrados."
echo "Logros deportivos integrados."
echo "No se modificó el motor GPS."
echo "=========================================="

git status --short
git diff --stat

