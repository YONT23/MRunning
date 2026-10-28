import React,{useState} from 'react';
import {View,Text,Modal,TouchableOpacity,StyleSheet,ScrollView,Alert} from 'react-native';
import {OPTIONS} from '../store/metricPrefs';
import {useAppTheme} from '../theme/useAppTheme';
export default function MetricPicker({visible,selected,onCancel,onSave}){
  const t=useAppTheme();
  const [chosen,setChosen]=useState(selected);
  React.useEffect(()=>{if(visible)setChosen(selected)},[visible,selected]);
  const toggle=(id)=>setChosen(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.backdrop}><View style={[styles.dialog,{backgroundColor:t.surface,borderColor:t.border}]}>
      <Text style={{color:t.text,fontSize:20,fontWeight:'800'}}>Personalizar métricas</Text>
      <Text style={{color:t.muted,marginTop:7,marginBottom:10}}>Elige de 2 a 6 indicadores.</Text>
      <ScrollView>{OPTIONS.map(o=><TouchableOpacity key={o.id} onPress={()=>toggle(o.id)} style={[styles.option,{borderBottomColor:t.border}]}>
        <Text style={{color:t.text,fontWeight:'600',flex:1}}>{o.label}</Text><Text style={{color:chosen.includes(o.id)?t.blue:t.muted,fontSize:19}}>{chosen.includes(o.id)?'☑':'□'}</Text>
      </TouchableOpacity>)}</ScrollView>
      <View style={styles.actions}><TouchableOpacity onPress={onCancel} style={styles.btn}><Text style={{color:t.muted}}>Cancelar</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.btn,{backgroundColor:t.blue,borderRadius:12}]} onPress={()=>{if(chosen.length<2||chosen.length>6){Alert.alert('Selección inválida','Elige entre 2 y 6 indicadores.');return;}onSave(chosen);}}><Text style={{color:'#FFFFFF',fontWeight:'800'}}>Guardar</Text></TouchableOpacity></View>
    </View></View>
  </Modal>
}
const styles=StyleSheet.create({backdrop:{flex:1,justifyContent:'center',backgroundColor:'rgba(0,0,0,.6)',padding:23},dialog:{padding:18,borderRadius:20,borderWidth:1,maxHeight:'80%'},option:{paddingVertical:12,borderBottomWidth:1,flexDirection:'row',alignItems:'center'},actions:{flexDirection:'row',justifyContent:'flex-end',marginTop:14},btn:{paddingVertical:12,paddingHorizontal:17}});
