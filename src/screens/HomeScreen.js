import React,{useCallback,useState} from 'react';
import {View,Text,ScrollView,TouchableOpacity,ActivityIndicator,StyleSheet,Alert} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import * as Location from 'expo-location';
import ScreenContainer from '../components/ScreenContainer';
import RunMap from '../components/RunMap';
import {useAppTheme} from '../theme/useAppTheme';
import {getHistory} from '../store/historyStore';
import {calculateHomeStats} from '../utils/homeStats';
import {getUnits,getWeeklyGoalKm} from '../store/settingsStore';
import {getProfile} from '../store/profileStore';
import {getStatus} from '../store/runStore';
import {formatDuration} from '../utils/haversine';
const EMPTY=calculateHomeStats([]);
export default function HomeScreen({navigation}){
  const t=useAppTheme(),[stats,setStats]=useState(EMPTY),[goal,setGoal]=useState(25),[units,setUnits]=useState('km');
  const [name,setName]=useState(''),[position,setPosition]=useState(null),[accuracy,setAccuracy]=useState(null);
  const [locating,setLocating]=useState(false),[loading,setLoading]=useState(true),[active,setActive]=useState(false);
  useFocusEffect(useCallback(()=>{let live=true;
    Promise.all([getHistory(),getWeeklyGoalKm(),getUnits(),getProfile(),getStatus()]).then(([h,g,u,p,s])=>{
      if(!live)return;setStats(calculateHomeStats(h));setGoal(g);setUnits(u);setName(p.name||'');setActive(s==='running'||s==='paused');
    }).catch(()=>{if(live)Alert.alert('Aviso','No se pudo actualizar el resumen.');}).finally(()=>{if(live)setLoading(false)});
    return ()=>{live=false};
  },[]));
  React.useEffect(()=>{let alive=true;Location.getForegroundPermissionsAsync().then(async perm=>{if(perm.status!=='granted')return;const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});if(alive){setPosition({latitude:pos.coords.latitude,longitude:pos.coords.longitude});setAccuracy(pos.coords.accuracy!=null?Math.round(pos.coords.accuracy):null);}}).catch(()=>{});return ()=>{alive=false};},[]);
  const locate=async()=>{if(locating)return;setLocating(true);try{
    const permission=await Location.requestForegroundPermissionsAsync();
    if(permission.status!=='granted'){Alert.alert('Ubicación','Activa el permiso para mostrar tu ubicación en el mapa.');return;}
    const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
    setPosition({latitude:pos.coords.latitude,longitude:pos.coords.longitude});
    setAccuracy(pos.coords.accuracy!=null?Math.round(pos.coords.accuracy):null);
  }catch(e){Alert.alert('Sin ubicación','No fue posible obtener una posición actual.');}finally{setLocating(false);}};
  const div=units==='mi'?1609.344:1000;
  const pct=goal>0?Math.round(stats.weekMeters/(goal*1000)*100):0;
  return <ScreenContainer adaptive><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:42}}>
    <View style={styles.header}><View style={{flex:1}}><Text style={{color:t.blue,fontSize:11,fontWeight:'800',letterSpacing:2}}>MRUNNING 2.0</Text>
      <Text style={{color:t.text,fontSize:23,fontWeight:'800',marginTop:5}} numberOfLines={2}>{name?`Hola, ${name.split(' ')[0]}`:'¿Listo para correr?'}</Text></View>
      <TouchableOpacity onPress={()=>navigation.navigate('Settings')}><Text style={{color:t.blue,fontWeight:'700'}}>Ajustes</Text></TouchableOpacity></View>
    <View style={styles.signal}><Text style={{color:t.text,fontWeight:'800'}}>Tu punto de partida</Text>
      <Text style={{color:accuracy!=null&&accuracy<=15?t.success:t.muted,fontSize:12}}>{accuracy==null?'GPS aún no consultado':`Precisión reportada ±${accuracy} m`}</Text></View>
    <RunMap location={position} height={270}/>
    <TouchableOpacity accessibilityLabel="Obtener mi ubicación" onPress={locate} disabled={locating} style={[styles.locate,{borderColor:t.border,backgroundColor:t.surface}]}>
      <Text style={{color:t.blue,fontWeight:'800'}}>{locating?'Buscando satélites…':'◎  Actualizar mi ubicación'}</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={()=>navigation.navigate('ActivityType')} style={[styles.cta,{backgroundColor:t.blue}]}><Text style={styles.ctaText}>{active?'VOLVER A LA ACTIVIDAD':'▶  INICIAR CARRERA'}</Text></TouchableOpacity>
    <View style={[styles.card,{backgroundColor:t.surface,borderColor:t.border}]}>
      <View style={styles.signal}><Text style={{color:t.text,fontWeight:'800'}}>Tu semana</Text><Text style={{color:t.blue,fontWeight:'800'}}>{pct}% de la meta</Text></View>
      {loading?<ActivityIndicator color={t.blue}/>:<><Text style={{color:t.text,fontSize:26,fontWeight:'800'}}>{(stats.weekMeters/div).toFixed(1)} <Text style={{fontSize:15,color:t.muted}}>{units} / {(goal*1000/div).toFixed(1)} {units}</Text></Text>
      <View style={[styles.track,{backgroundColor:t.surface2}]}><View style={{width:`${Math.min(pct,100)}%`,height:'100%',backgroundColor:t.blue,borderRadius:5}}/></View>
      <Text style={{color:t.muted,marginTop:10,fontSize:12}}>{stats.weekCount} sesiones · {formatDuration(stats.weekSeconds)} · {stats.streakDays} días de racha</Text></>}
    </View>
    {stats.lastActivity&&<TouchableOpacity style={[styles.card,{backgroundColor:t.surface,borderColor:t.border}]} onPress={()=>navigation.navigate('HistoryDetail',{id:stats.lastActivity.id})}>
      <Text style={{color:t.muted,fontSize:11}}>ÚLTIMA ACTIVIDAD</Text><Text style={{color:t.text,fontWeight:'800',fontSize:17,marginTop:7}}>{(stats.lastActivity.distance/div).toFixed(2)} {units} · {formatDuration(stats.lastActivity.elapsed)}</Text><Text style={{color:t.blue,marginTop:5}}>Ver resultado ›</Text></TouchableOpacity>}
  </ScrollView></ScreenContainer>;
}
const styles=StyleSheet.create({header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:15,paddingBottom:16,gap:8},signal:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10,gap:8},locate:{alignSelf:'flex-start',borderRadius:12,borderWidth:1,paddingHorizontal:14,paddingVertical:10,marginTop:10},cta:{paddingVertical:17,borderRadius:18,alignItems:'center',marginTop:15,marginBottom:16},ctaText:{color:'#FFFFFF',fontSize:16,fontWeight:'800'},card:{borderWidth:1,borderRadius:20,padding:17,marginTop:10},track:{height:7,borderRadius:5,overflow:'hidden',marginTop:12}});
