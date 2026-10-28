import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import RoutePreview from './RoutePreview';
import { useAppTheme } from '../theme/useAppTheme';

// Mapa web interactivo con Leaflet y teselas OSM; requiere internet.
// La grabación del GPS es independiente del mapa. Se usa userAgent identificable,
// atribución visible y sin precarga masiva de teselas.
function htmlForMap(){
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>html,body,#map{margin:0;width:100%;height:100%;background:#162b40} .leaflet-control-attribution{font-size:10px!important}</style>
  </head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
  var map, marker, route, followed=false;
  function init(){if(!window.L){window.ReactNativeWebView.postMessage('ERROR');return;}
    map=L.map('map',{zoomControl:false}).setView([4.711,-74.0721],13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
    route=L.polyline([],{color:'#2E6BFF',weight:5,opacity:0.95}).addTo(map);
    window.ReactNativeWebView.postMessage('READY');
    setTimeout(function(){map.invalidateSize()},400);
  }
  window.updateFromNative=function(data){if(!map)return;
    var p=data.points||[];var good=p.filter(function(a){return Number.isFinite(a.latitude)&&Number.isFinite(a.longitude)});
    if(good.length){route.setLatLngs(good.map(function(v){return [v.latitude,v.longitude]}));}
    var loc=data.location;
    if(loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)){
      var latlng=[loc.latitude,loc.longitude];
      if(!marker){marker=L.circleMarker(latlng,{radius:8,color:'#ffffff',weight:2,fillColor:'#2E6BFF',fillOpacity:1}).addTo(map);}
      else marker.setLatLng(latlng);
      if(!followed){map.setView(latlng,16);followed=true;}
    }
  };
  init();
  </script></body></html>`;
}
export default function RunMap({ location, points=[], height=240 }) {
  const t=useAppTheme();
  const ref=useRef(null);
  const [ready,setReady]=useState(false);
  const [failed,setFailed]=useState(false);
  const html=useMemo(htmlForMap,[]);
  const payload=useMemo(()=>({location,points:points.slice(-500)}),[location,points]);
  useEffect(()=>{
    if(!ready||!ref.current)return;
    const js=`window.updateFromNative(${JSON.stringify(payload)});true;`;
    ref.current.injectJavaScript(js);
  },[ready,payload]);
  const fallback=(
    <View style={[styles.fallback,{backgroundColor:t.mapBackground}]}>
      {points?.length>1 ? <RoutePreview points={points} size={165} strokeColor={t.blue}/>:null}
      <Text style={{color:t.text,fontWeight:'700',textAlign:'center',marginTop:5}}>
        {location?'Mapa no disponible':'Esperando posición GPS'}
      </Text>
      <Text style={{color:t.muted,fontSize:11,textAlign:'center',marginTop:4}}>
        La carrera puede registrarse sin conexión a mapas.
      </Text>
    </View>
  );
  if(!location && !(points&&points.length)) return <View style={[styles.outer,{height,backgroundColor:t.mapBackground,borderColor:t.border}]}>{fallback}</View>;
  return (
    <View style={[styles.outer,{height,backgroundColor:t.mapBackground,borderColor:t.border}]}>
      {!failed && <WebView ref={ref} source={{html}} originWhitelist={['*']}
        javaScriptEnabled domStorageEnabled
        userAgent="MRunning/2.0 (+https://github.com/YONT23/MRunning)"
        onMessage={e=>{if(e.nativeEvent.data==='READY')setReady(true);if(e.nativeEvent.data==='ERROR')setFailed(true);}}
        onError={()=>setFailed(true)} onHttpError={()=>setFailed(true)}
        style={{flex:1,backgroundColor:t.mapBackground}}
        scrollEnabled={false} />}
      {(!ready||failed) && <View style={StyleSheet.absoluteFill}>{fallback}</View>}
      <View style={styles.label} pointerEvents="none"><Text style={styles.labelText}>Mapa en línea · © OpenStreetMap</Text></View>
    </View>
  );
}
const styles=StyleSheet.create({outer:{borderWidth:1,borderRadius:18,overflow:'hidden'},fallback:{flex:1,alignItems:'center',justifyContent:'center',padding:12},label:{position:'absolute',bottom:4,left:4,backgroundColor:'rgba(0,0,0,.65)',borderRadius:4,paddingHorizontal:5,paddingVertical:3},labelText:{color:'#FFFFFF',fontSize:9}});
