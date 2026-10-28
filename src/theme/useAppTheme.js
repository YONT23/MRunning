import { useColorScheme } from 'react-native';

const common = { blue: '#2E6BFF', red: '#E93B3B', success: '#25B58C' };
export const darkPalette = {
  ...common, bg:'#0A0C10', surface:'#121925', surface2:'#1B2636',
  text:'#F5F7FA', muted:'#9AA9BE', faint:'#72829C', border:'#293749',
  mapBackground:'#12263A', onBlue:'#FFFFFF',
};
export const lightPalette = {
  ...common, bg:'#F4F7FC', surface:'#FFFFFF', surface2:'#E9F0FA',
  text:'#142338', muted:'#546A82', faint:'#687E95', border:'#D6E0ED',
  mapBackground:'#EAF1F8', onBlue:'#FFFFFF',
};
export function useAppTheme() {
  return useColorScheme() === 'light' ? lightPalette : darkPalette;
}
