import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { StatsCard, SplitsCard, RouteCard, CompareCard } from '../components/ShareCards';
import { getHistory } from '../store/historyStore';
import { compareRuns } from '../utils/analysis';
import { colors, spacing, radius } from '../theme/colors';

// Cuatro tarjetas deslizables. Sin foto se guardan como PNG con fondo
// transparente. Con foto, cada tarjeta se guarda como JPG sobre la foto.
export default function ShareCardsScreen({ route, navigation }) {
  const { id } = route.params;
  const { width } = useWindowDimensions();
  const pageW = width - spacing.lg * 2;

  const [entry, setEntry] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [index, setIndex] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    (async () => {
      const h = await getHistory();
      const e = h.find((x) => x.id === id) || null;
      setEntry(e);
      if (e) setComparison(compareRuns(e, h));
    })();
  }, [id]);

  if (!entry) return <SafeAreaView style={styles.container} />;

  const pages = [
    { key: 'stats', label: 'Datos', node: <StatsCard distance={entry.distance} elapsed={entry.elapsed} activityType={entry.activityType} avgAccuracy={entry.avgAccuracy} /> },
    { key: 'splits', label: 'Parciales', node: <SplitsCard splits={entry.splits} /> },
    { key: 'route', label: 'Ruta', node: <RouteCard points={entry.routePreview} /> },
    { key: 'compare', label: 'Comparación', node: <CompareCard comparison={comparison} /> },
  ];

  const ensurePermission = async () => {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso al carrete para guardar.');
      return false;
    }
    return true;
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const saveCurrent = async () => {
    try {
      if (!(await ensurePermission())) return;
      const uri = await refs.current[index].capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Listo', photoUri ? 'Tarjeta guardada en tu carrete.' : 'Tarjeta guardada con fondo transparente.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar: ' + e.message);
    }
  };

  const saveAll = async () => {
    try {
      if (!(await ensurePermission())) return;
      for (let i = 0; i < pages.length; i++) {
        const uri = await refs.current[i].capture();
        await MediaLibrary.saveToLibraryAsync(uri);
      }
      Alert.alert('Listo', 'Se guardaron las 4 tarjetas en tu carrete.');
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar todas: ' + e.message);
    }
  };

  const onScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
    setIndex(Math.max(0, Math.min(pages.length - 1, i)));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tarjetas</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ flexGrow: 0 }}
      >
        {pages.map((p, i) => (
          <View key={p.key} style={[styles.page, { width: pageW }]}>
            <ViewShot
              ref={(r) => {
                refs.current[i] = r;
              }}
              options={{ format: photoUri ? 'jpg' : 'png', quality: 0.95, result: 'tmpfile' }}
              style={[styles.shot, photoUri && styles.shotWithPhoto]}
            >
              {photoUri ? (
                <>
                  <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={styles.photoShade} />
                </>
              ) : null}
              {p.node}
            </ViewShot>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.pageLabel}>{pages[index].label}</Text>
      <View style={styles.dots}>
        {pages.map((p, i) => (
          <View key={p.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={pickPhoto} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>{photoUri ? 'Cambiar foto' : 'Elegir foto de fondo'}</Text>
        </TouchableOpacity>
        {photoUri ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhotoUri(null)} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>Quitar foto</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={saveCurrent} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Guardar esta tarjeta</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.outlineBtn} onPress={saveAll} activeOpacity={0.85}>
        <Text style={styles.outlineBtnText}>Guardar las 4 tarjetas</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        {photoUri ? 'Se guardan como imagen JPG sobre tu foto.' : 'Sin foto: se guardan como PNG con fondo transparente.'}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  back: { color: colors.blue, fontSize: 16 },
  title: { color: colors.white, fontSize: 17, fontWeight: '700' },
  page: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  shot: { backgroundColor: 'transparent' },
  shotWithPhoto: { padding: 16, borderRadius: radius.lg, overflow: 'hidden' },
  photoShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,12,16,0.4)' },
  pageLabel: { color: colors.white, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: spacing.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textFaint },
  dotActive: { backgroundColor: colors.blue, width: 18 },
  photoRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  secondaryBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  primaryBtn: {
    backgroundColor: colors.blue,
    paddingVertical: 15,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  outlineBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  hint: { color: colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
});
