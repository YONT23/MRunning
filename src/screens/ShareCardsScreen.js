import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { getHistory } from '../store/historyStore';
import MShotStory from '../components/MShotStory';

const BLUE = '#2E6BFF';

const TEMPLATES = [
  ['route', 'Ruta GPS'],
  ['routeStats', 'Ruta + datos'],
  ['stats', 'Estadísticas'],
  ['splits', 'Parciales'],
];

export default function ShareCardsScreen({
  route,
  navigation,
}) {
  const { width } = useWindowDimensions();

  const scale = Math.min(
    (width - 32) / 360,
    0.82
  );

  const [entry, setEntry] = useState(null);
  const [points, setPoints] = useState([]);
  const [photoUri, setPhotoUri] = useState(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const shotRef = useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const history = await getHistory();

        const selected = history.find(
          item => item.id === route.params?.id
        );

        if (!selected) {
          Alert.alert(
            'MShot',
            'No se encontró el entrenamiento.'
          );
          return;
        }

        let track = Array.isArray(selected.routePreview)
          ? selected.routePreview
          : [];

        if (selected.rawTrackUri) {
          try {
            const raw = await FileSystem.readAsStringAsync(
              selected.rawTrackUri
            );

            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed) && parsed.length) {
              track = parsed;
            }
          } catch (error) {
            console.warn(
              'No se pudo leer el recorrido completo:',
              error.message
            );
          }
        }

        if (active) {
          setEntry(selected);
          setPoints(track);
        }
      } catch (error) {
        Alert.alert(
          'MShot',
          'Error al cargar: ' + error.message
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [route.params?.id]);

  const pickPhoto = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permiso requerido',
        'Permite acceder a tus fotografías.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

    if (
      !result.canceled &&
      result.assets?.[0]?.uri
    ) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    if (saving) return;

    setSaving(true);

    try {
      const permission =
        await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        throw new Error(
          'Falta permiso para guardar imágenes.'
        );
      }

      if (!shotRef.current) {
        throw new Error(
          'La plantilla todavía no está lista.'
        );
      }

      const uri = await shotRef.current.capture();

      await MediaLibrary.saveToLibraryAsync(uri);

      Alert.alert(
        'MShot',
        'Imagen PNG guardada en la galería.'
      );
    } catch (error) {
      Alert.alert(
        'Error al exportar',
        error.message
      );
    } finally {
      setSaving(false);
    }
  };

  if (!entry) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator
          color={BLUE}
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.link}>
            ‹ Volver
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          MShot 2.0
        </Text>

        <View style={{ width: 55 }} />
      </View>

      <Text style={styles.help}>
        Historias verticales · PNG 1080 × 1920
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          flexGrow: 0,
          marginTop: 14,
        }}
        contentContainerStyle={{
          gap: 8,
          paddingHorizontal: 16,
        }}
      >
        {TEMPLATES.map(([key, label], i) => (
          <TouchableOpacity
            key={key}
            onPress={() => setIndex(i)}
            style={[
              styles.tab,
              index === i && styles.activeTab,
            ]}
          >
            <Text style={styles.tabText}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingVertical: 12,
        }}
      >
        <View
          style={{
            width: 360 * scale,
            height: 640 * scale,
            overflow: 'hidden',
            borderRadius: 14,
          }}
        >
          <View
            style={{
              marginLeft: -(360 * (1 - scale)) / 2,
              marginTop: -(640 * (1 - scale)) / 2,
              transform: [{ scale }],
            }}
          >
            <ViewShot
              ref={shotRef}
              options={{
                format: 'png',
                quality: 1,
                result: 'tmpfile',
                width: 1080,
                height: 1920,
              }}
            >
              <MShotStory
                entry={entry}
                points={points}
                photoUri={photoUri}
                kind={TEMPLATES[index][0]}
              />
            </ViewShot>
          </View>
        </View>

        <Text style={styles.note}>
          {points.length} coordenadas disponibles
        </Text>

        <Text style={styles.note}>
          {entry.rawTrackUri
            ? 'Se prioriza el recorrido GPS original'
            : 'Se utiliza la vista previa del historial'}
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={pickPhoto}
        >
          <Text style={styles.buttonText}>
            {photoUri
              ? 'Cambiar foto'
              : 'Elegir foto'}
          </Text>
        </TouchableOpacity>

        {photoUri && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setPhotoUri(null)}
          >
            <Text style={styles.buttonText}>
              Quitar foto
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          disabled={saving}
          style={styles.primaryButton}
          onPress={save}
        >
          <Text style={styles.buttonText}>
            {saving
              ? 'Guardando...'
              : 'Guardar PNG'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0C10',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },

  link: {
    color: BLUE,
    fontSize: 15,
  },

  help: {
    color: '#AAB8D0',
    textAlign: 'center',
    marginTop: 10,
  },

  tab: {
    borderWidth: 1,
    borderColor: '#333B49',
    padding: 9,
    borderRadius: 20,
  },

  activeTab: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  tabText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  note: {
    color: '#9AA6BA',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },

  actions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  primaryButton: {
    backgroundColor: BLUE,
    padding: 13,
    borderRadius: 22,
  },

  secondaryButton: {
    backgroundColor: '#202631',
    padding: 13,
    borderRadius: 22,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
