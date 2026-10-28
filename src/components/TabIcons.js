import React from 'react';
import Svg, {Path, Circle, Rect, Polyline} from 'react-native-svg';
const paths={
 home:<Path d="M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3Z"/>,
 history:<><Path d="M3.5 8A9 9 0 1 1 3 13"/><Path d="M3 3v5h5M12 7v6l4 2"/></>,
 progress:<><Rect x="3" y="14" width="4" height="7" rx="1"/><Rect x="10" y="9" width="4" height="12" rx="1"/><Rect x="17" y="4" width="4" height="17" rx="1"/></>,
 profile:<><Circle cx="12" cy="7.5" r="4"/><Path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></>,
 play:<Path d="m8 5 11 7-11 7Z"/>,
 pause:<><Path d="M8 5v14M16 5v14"/></>,
 stop:<Rect x="5" y="5" width="14" height="14" rx="2"/>,
 gps:<><Circle cx="12" cy="12" r="7"/><Circle cx="12" cy="12" r="2"/><Path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></>,
 map:<><Path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z M9 3v16M15 5v16"/></>,
 distance:<><Circle cx="5" cy="18" r="2"/><Circle cx="19" cy="6" r="2"/><Path d="M7 18c11 0 0-12 10-12"/></>,
 time:<><Circle cx="12" cy="12" r="9"/><Path d="M12 6v6l4 2"/></>,
 pace:<><Path d="M4 18a9 9 0 1 1 16 0M12 15l5-7"/><Circle cx="12" cy="15" r="1"/></>,
 intervals:<><Rect x="3" y="13" width="4" height="8" rx="1"/><Rect x="10" y="8" width="4" height="13" rx="1"/><Rect x="17" y="3" width="4" height="18" rx="1"/></>,
 goal:<><Circle cx="12" cy="12" r="9"/><Circle cx="12" cy="12" r="5"/><Circle cx="12" cy="12" r="1"/></>,
 alerts:<><Path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 20h4"/></>,
 autopause:<><Circle cx="12" cy="12" r="9"/><Path d="M9 8v8M15 8v8"/></>,
 coach:<><Path d="M9 3c-4-2-7 2-6 5-3 3-1 7 2 8-1 4 4 6 7 3V5M15 3c4-2 7 2 6 5 3 3 1 7-2 8 1 4-4 6-7 3V5"/></>,
 achievement:<><Circle cx="12" cy="9" r="6"/><Path d="m8 14-2 8 6-3 6 3-2-8"/></>,
 challenge:<Path d="M5 22V3m0 1c7-3 8 3 16 0v10c-8 3-9-3-16 0"/>,
 share:<><Circle cx="18" cy="5" r="2"/><Circle cx="6" cy="12" r="2"/><Circle cx="18" cy="19" r="2"/><Path d="m8 11 8-5M8 13l8 5"/></>,
 settings:<><Path d="M3 6h18M3 12h18M3 18h18"/><Circle cx="8" cy="6" r="2"/><Circle cx="16" cy="12" r="2"/><Circle cx="10" cy="18" r="2"/></>,
 calendar:<><Rect x="3" y="5" width="18" height="16" rx="2"/><Path d="M7 2v6M17 2v6M3 11h18"/></>,
};
export function MotionIcon({name='home',color='#2E6BFF',size=24,filled=false}){
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled?color:'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{paths[name]||paths.home}</Svg>;
}
export const HomeIcon=({color,size=24})=><MotionIcon name="home" color={color} size={size}/>;
export const HistoryIcon=({color,size=24})=><MotionIcon name="history" color={color} size={size}/>;
export const ProgressIcon=({color,size=24})=><MotionIcon name="progress" color={color} size={size}/>;
export const ProfileIcon=({color,size=24})=><MotionIcon name="profile" color={color} size={size}/>;
export const PlusIcon=({color,size=26})=><MotionIcon name="play" color={color} size={size} filled/>;

