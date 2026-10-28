import React from 'react';
import {View,Text,TouchableOpacity,StyleSheet,useColorScheme} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {HomeIcon,HistoryIcon,ProgressIcon,ProfileIcon,PlusIcon} from './TabIcons';
const icons={Inicio:HomeIcon,Historial:HistoryIcon,Progreso:ProgressIcon,Perfil:ProfileIcon};
export default function TabBar({state,navigation}){
 const insets=useSafeAreaInsets();
 const dark=useColorScheme()!=='light';
 const bg=dark?'#12151B':'#FFFFFF';
 const inactive=dark?'#94A3BB':'#64748B';
 return <View style={[styles.bar,{backgroundColor:bg,borderTopColor:dark?'#1F2430':'#E2E8F0',paddingBottom:Math.max(insets.bottom,8)}]}>
 {state.routes.map((route,index)=>{
  if(route.name==='Nuevo')return <View key={route.key} style={styles.slot}><TouchableOpacity accessibilityLabel="Iniciar carrera" accessibilityRole="button" style={styles.play} onPress={()=>navigation.navigate('ActivityType')}><PlusIcon color="#FFFFFF" size={28}/></TouchableOpacity><Text style={[styles.label,{color:inactive}]}>Correr</Text></View>;
  const active=state.index===index;
  const color=active?'#2E6BFF':inactive;
  const Icon=icons[route.name]||HomeIcon;
  return <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:active}} key={route.key} style={styles.slot} onPress={()=>navigation.navigate(route.name)}><Icon color={color} size={24}/><Text style={[styles.label,{color}]}>{route.name}</Text></TouchableOpacity>;
 })}
 </View>;
}
const styles=StyleSheet.create({
 bar:{flexDirection:'row',borderTopWidth:1,paddingTop:9},
 slot:{flex:1,alignItems:'center',justifyContent:'center',minHeight:55},
 label:{fontSize:10,fontWeight:'700',marginTop:5},
 play:{width:54,height:54,borderRadius:27,backgroundColor:'#2E6BFF',alignItems:'center',justifyContent:'center',marginTop:-27,elevation:6},
});

