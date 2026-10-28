<div align="center">

# 🏃 MRUNNING 2.0

### Premium Motion · Cada kilómetro cuenta

**Aplicación móvil de seguimiento deportivo, análisis de entrenamientos y creación de imágenes para compartir tus logros.**

![Expo](https://img.shields.io/badge/Expo-SDK%2051-000020?logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.74-61DAFB?logo=react)
![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android)
![Estado](https://img.shields.io/badge/Estado-En%20desarrollo-blue)
![Versión](https://img.shields.io/badge/Proyecto-MRunning%202.0-2E6BFF)

**Diseñado para registrar, comprender y compartir cada entrenamiento.**

</div>

---

## 📖 1. ¿Qué es MRunning?

**MRunning** es una aplicación móvil desarrollada con React Native y Expo, orientada al seguimiento de actividades deportivas mediante GPS.

Su objetivo es ofrecer una experiencia de entrenamiento que combine:

- Registro de recorridos y actividades físicas.
- Medición de distancia, tiempo y ritmo.
- Consulta del historial deportivo.
- Visualización de estadísticas de rendimiento.
- Personalización de la experiencia.
- Creación de imágenes deportivas para compartir en redes sociales.

La aplicación utiliza una identidad visual denominada **Premium Motion**, caracterizada por una interfaz oscura, detalles en azul eléctrico y elementos gráficos deportivos.

MRunning se encuentra en desarrollo activo. Algunas funciones ya están implementadas, mientras que otras requieren pruebas adicionales en dispositivos Android.

---

## 🎯 2. Objetivo del proyecto

Desarrollar una aplicación móvil que permita registrar y analizar actividades deportivas utilizando tecnologías de geolocalización, ofreciendo herramientas visuales para interpretar el rendimiento y compartir los resultados de cada entrenamiento.

### Objetivos específicos

1. Registrar recorridos deportivos mediante coordenadas GPS.
2. Calcular métricas como distancia, duración y ritmo.
3. Almacenar un historial de actividades.
4. Presentar estadísticas útiles para el seguimiento del progreso.
5. Generar imágenes personalizadas de los entrenamientos.
6. Incorporar herramientas de configuración y personalización.
7. Mejorar progresivamente la precisión, estabilidad y experiencia de uso.

---

## 🚀 3. Funcionalidades

### 📍 Seguimiento GPS

El proyecto incorpora componentes para registrar coordenadas de ubicación durante una actividad.

Entre las métricas utilizadas se encuentran:

- Distancia recorrida.
- Tiempo transcurrido.
- Ritmo promedio.
- Coordenadas del recorrido.
- Información de precisión GPS.
- Desnivel acumulado, cuando existen datos suficientes.

**Importante:** la precisión depende del dispositivo, los permisos concedidos, la disponibilidad de señal y las condiciones del entorno.

El seguimiento en segundo plano requiere pruebas específicas en cada versión de Android.

### 🏃 Registro de entrenamientos

MRunning dispone de una estructura para gestionar actividades deportivas y registrar sus resultados.

El sistema contempla información como:

- Tipo de actividad.
- Fecha del entrenamiento.
- Duración.
- Distancia.
- Ritmo.
- Recorrido GPS.
- Parciales por kilómetro.
- Información complementaria del entrenamiento.

### 📚 Historial deportivo

Los entrenamientos se almacenan localmente mediante AsyncStorage.

El historial permite conservar información de las actividades registradas.

La implementación actual contempla un máximo de 100 entradas en el historial principal.

Cuando es posible, las coordenadas completas de un recorrido se guardan adicionalmente en archivos JSON locales.

**Advertencia:** los datos locales pueden perderse al borrar los datos de la aplicación o desinstalarla. Actualmente no debe asumirse que existe una copia de seguridad en la nube.

### 📊 Estadísticas y progreso

El proyecto incluye una sección de progreso y herramientas de análisis de actividades.

Las métricas disponibles dependen de la información registrada durante cada entrenamiento.

### 🎨 MShot — Imágenes deportivas

**MShot** es el módulo de MRunning destinado a crear imágenes de los entrenamientos.

Permite presentar estadísticas y recorridos en composiciones visuales para compartir.

#### Plantillas incluidas en el desarrollo

| Plantilla | Descripción |
|---|---|
| Solo datos | Distancia, tiempo y ritmo en formato visual |
| Ruta GPS | Representación gráfica del recorrido |
| Ruta + datos | Recorrido acompañado de estadísticas |
| Estadísticas | Resumen numérico del entrenamiento |
| Parciales | Ritmos por kilómetro |

#### Características de MShot

- Formato vertical 9:16.
- Exportación PNG configurada a 1080 × 1920 píxeles.
- Identidad visual Premium Motion.
- Posibilidad de seleccionar fotografías.
- Opción de fondo negro o transparente.
- Representación de rutas mediante coordenadas GPS.

**Estado:** MShot se encuentra en fase de pruebas. La transparencia del PNG, la fidelidad de los recorridos y el comportamiento de la exportación deben verificarse en Android.

### 🎨 Identidad visual

MRunning utiliza una combinación de colores:

| Elemento | Color |
|---|---|
| Fondo principal | `#0A0C10` |
| Azul principal | `#2E6BFF` |
| Azul oscuro | `#1E4FCC` |
| Texto claro | `#F5F7FA` |
| Rojo de alerta | `#E93B3B` |

La interfaz busca mantener consistencia entre navegación, controles deportivos, estadísticas e imágenes exportadas.

---

## 📱 4. Navegación principal

La aplicación organiza su interfaz mediante cinco secciones:

| Sección | Función |
|---|---|
| 🏠 Inicio | Pantalla principal |
| 🕘 Historial | Consulta de actividades registradas |
| ➕ Nuevo | Acceso al flujo de nueva actividad |
| 📈 Progreso | Estadísticas y evolución deportiva |
| 👤 Perfil | Información y preferencias del usuario |

La disponibilidad y el comportamiento de cada opción pueden variar según la versión instalada.

---

## 🛠️ 5. Tecnologías utilizadas

### Aplicación móvil

- JavaScript.
- React 18.
- React Native 0.74.
- Expo SDK 51.
- React Navigation 6.

### Geolocalización

- Expo Location.
- Expo Task Manager.

### Almacenamiento

- AsyncStorage.
- Expo FileSystem.

### Imágenes y multimedia

- Expo Image Picker.
- Expo Media Library.
- React Native View Shot.
- React Native SVG.

### Otras herramientas

- Expo Notifications.
- Expo Speech.
- EAS Build.
- Git y GitHub.

---

## 📂 6. Estructura del proyecto

```text
MRunning/
│
├── assets/
│   └── Recursos gráficos e iconos
│
├── src/
│   ├── components/
│   │   └── Componentes reutilizables
│   │
│   ├── navigation/
│   │   └── Navegación de la aplicación
│   │
│   ├── screens/
│   │   └── Pantallas principales
│   │
│   ├── store/
│   │   └── Persistencia y preferencias
│   │
│   ├── tasks/
│   │   └── Tareas de ubicación
│   │
│   ├── theme/
│   │   └── Colores y estilos
│   │
│   └── utils/
│       └── Cálculos y utilidades
│
├── tests/
│   └── Pruebas del proyecto
│
├── App.js
├── app.json
├── eas.json
├── package.json
└── README.md
```

La estructura puede ampliarse conforme avance el desarrollo.

---

## 💻 7. Requisitos de desarrollo

Para trabajar con el proyecto se recomienda disponer de:

- Node.js y npm.
- Git.
- Un entorno de desarrollo como VS Code o GitHub Codespaces.
- Acceso a Expo y EAS Build.
- Un dispositivo Android para pruebas.

### Nota de compatibilidad

Este repositorio utiliza actualmente **Expo SDK 51**.

La aplicación Expo Go instalada en un teléfono puede utilizar una versión diferente del SDK y resultar incompatible.

En ese caso, debe utilizarse una versión compatible de Expo Go o una compilación de desarrollo.

No se recomienda actualizar Expo y React Native sin comprobar previamente las dependencias.

---

## ⚙️ 8. Instalación del proyecto

### Paso 1. Clonar el repositorio

```bash
git clone https://github.com/YONT23/MRunning.git
```

### Paso 2. Entrar en el proyecto

```bash
cd MRunning
```

### Paso 3. Instalar dependencias

```bash
npm install
```

### Paso 4. Verificar compatibilidad

```bash
npx expo-doctor
```

### Paso 5. Iniciar el entorno de desarrollo

```bash
npx expo start --tunnel
```

**Nota:** iniciar Metro no garantiza que la aplicación pueda abrirse en cualquier versión de Expo Go.

---

## 📦 9. Generar una APK para Android

El proyecto utiliza EAS Build para generar compilaciones Android.

### Verificar el proyecto

```bash
npx expo export --platform android --output-dir /tmp/mrunning-check
```

### Generar APK de prueba

```bash
eas build -p android --profile preview --clear-cache
```

La configuración del perfil `preview` se encuentra en `eas.json`.

Al finalizar correctamente, EAS proporciona un enlace para acceder a la compilación.

### Advertencia

Una compilación exitosa no garantiza que todas las funciones trabajen correctamente en un dispositivo real.

Antes de distribuir una APK se recomienda verificar:

1. Inicio de la aplicación.
2. Solicitud de permisos.
3. Registro GPS.
4. Funcionamiento con pantalla bloqueada.
5. Guardado del historial.
6. Exportación de imágenes.
7. Estabilidad general.

---

## 🔐 10. Permisos de Android

MRunning solicita permisos relacionados con determinadas funciones.

| Permiso | Finalidad |
|---|---|
| Ubicación aproximada | Acceso general a la ubicación |
| Ubicación precisa | Registro del recorrido GPS |
| Ubicación en segundo plano | Continuidad del seguimiento cuando corresponda |
| Servicio en primer plano | Ejecución de tareas deportivas prolongadas |
| Notificaciones | Avisos relacionados con la aplicación |
| Acceso a fotografías | Selección de imágenes para MShot |
| Almacenamiento multimedia | Guardado de imágenes exportadas |

Algunos permisos dependen de la versión de Android.

El archivo `app.json` también contiene declaraciones adicionales que deben revisarse antes de publicar la aplicación.

### Privacidad

El historial deportivo se almacena localmente en la implementación actual.

Las rutas GPS pueden contener información sensible sobre los lugares que visita el usuario.

Se recomienda evitar compartir recorridos que revelen ubicaciones privadas, como el domicilio.

Este README no sustituye una política de privacidad formal.

---

## 🧪 11. Estado de desarrollo

MRunning 2.0 se encuentra en evolución.

| Componente | Estado |
|---|---|
| Navegación principal | Implementado |
| Registro e historial local | Implementado |
| Cálculos deportivos | Implementados; requieren validación con recorridos reales |
| Seguimiento GPS | En pruebas |
| Seguimiento en segundo plano | Requiere pruebas Android |
| MShot | Implementado; en pruebas |
| Exportación PNG 9:16 | Configurada; pendiente de validación completa |
| Fondo transparente de MShot | En corrección y pruebas |
| Fidelidad de rutas exportadas | En evaluación |
| Estabilidad de APK | En evaluación |

Los estados anteriores describen el desarrollo del proyecto y no constituyen certificación de funcionamiento.

---

## 🗺️ 12. Próximas mejoras

Entre las líneas de desarrollo previstas se encuentran:

- Mayor precisión y filtrado de datos GPS.
- Mejoras en la detección de pausas.
- Perfeccionamiento de estadísticas deportivas.
- Exportación y uso compartido de imágenes.
- Mejoras de MShot.
- Personalización adicional.
- Pruebas de rendimiento y estabilidad.
- Revisión de compatibilidad con versiones recientes de Android.
- Mejoras de accesibilidad.

Las funciones futuras no deben interpretarse como características disponibles en la versión actual.

---

## 🐛 13. Problemas conocidos y diagnóstico

### La aplicación se cierra al iniciar

Posibles causas:

- Error de ejecución nativo.
- Configuración de permisos.
- Dependencias incompatibles.
- Problemas específicos del dispositivo.
- Diferencias entre el entorno de desarrollo y la APK.

Se requiere consultar el registro de errores Android para identificar la causa concreta.

### Expo Go indica incompatibilidad

Comprobar que la versión de Expo Go sea compatible con Expo SDK 51.

### MShot muestra fondo negro

Verificar la opción de transparencia y comprobar el canal alfa del PNG exportado.

### La ruta GPS no coincide con el recorrido

Revisar:

- Disponibilidad de coordenadas originales.
- Precisión de cada punto.
- Saltos de señal.
- Intervalos entre mediciones.
- Posibles interrupciones del seguimiento.

No deben inventarse puntos GPS para completar recorridos incompletos.

---

## 🧑‍💻 14. Desarrollo y contribuciones

El proyecto se administra mediante Git y GitHub.

Para realizar modificaciones se recomienda:

1. Crear una rama de trabajo.
2. Mantener respaldos de archivos importantes.
3. Probar la compilación JavaScript.
4. Ejecutar pruebas en Android.
5. Documentar los cambios.
6. Integrar las modificaciones después de validarlas.

### Rama de pruebas

La rama `prueba-sin-iconos` se ha utilizado para comprobar modificaciones sin mezclar todos los cambios con la rama principal.

---

## 📌 15. Información del proyecto

| Campo | Información |
|---|---|
| Nombre | MRunning |
| Línea de desarrollo | MRunning 2.0 |
| Identidad visual | Premium Motion |
| Plataforma principal de pruebas | Android |
| Framework | React Native |
| Entorno | Expo |
| SDK actual | 51 |
| Repositorio | YONT23/MRunning |
| Estado | Desarrollo activo |

### Lema

> **Cada kilómetro cuenta.**

---

<div align="center">

### 🏃 MRUNNING

**Registra tu esfuerzo. Analiza tu progreso. Comparte tus logros.**

Premium Motion

</div>
