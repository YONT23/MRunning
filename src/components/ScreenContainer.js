import React from 'react';
import {View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppTheme} from '../theme/useAppTheme';
import {colors} from '../theme/colors';
export default function ScreenContainer({children,style,edges,adaptive=false}){
  const {width}=useWindowDimensions(); const t=useAppTheme();
  const wide=width>=700;
  return <SafeAreaView style={{flex:1,backgroundColor:adaptive?t.bg:colors.bg}} edges={edges||['top','bottom','left','right']}>
    <View style={[{flex:1,width:'100%',alignSelf:'center',maxWidth:wide?480:undefined,paddingHorizontal:wide?0:Math.max(16,Math.min(32,width*.06))},style]}>{children}</View>
  </SafeAreaView>;
}
