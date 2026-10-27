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
