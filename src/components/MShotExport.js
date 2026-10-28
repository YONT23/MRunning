import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';

import {
  View,
  StyleSheet,
} from 'react-native';

import ViewShot from 'react-native-view-shot';

import MShotStory from './MShotStory';

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1920;

const MShotExport = forwardRef(
  function MShotExport(
    {
      entry,
      points,
      photoUri,
      kind,
      transparent = false,
    },
    ref
  ) {
    const shot = useRef(null);

    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (!shot.current) {
          throw new Error(
            'La imagen todavía no está preparada.'
          );
        }

        return shot.current.capture();
      },
    }));

    return (
      <View
        pointerEvents="none"
        style={styles.container}
        collapsable={false}
      >
        <ViewShot
          ref={shot}
          options={{
            format: 'png',
            result: 'tmpfile',
            width: EXPORT_WIDTH,
            height: EXPORT_HEIGHT,
          }}
        >
          <View
            style={[styles.canvas, transparent && styles.transparentCanvas]}
            collapsable={false}
          >
            <View
              style={styles.scaledStory}
              collapsable={false}
            >
              <MShotStory
                entry={entry}
                points={points}
                photoUri={photoUri}
                kind={kind}
                transparent={transparent}
              />
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }
);

export default MShotExport;

const styles = StyleSheet.create({
  transparentCanvas: {
    backgroundColor: 'transparent',
  },

  container: {
    position: 'absolute',
    left: -2000,
    top: 0,
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
  },

  canvas: {
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },

  scaledStory: {
    width: 360,
    height: 640,
    transform: [
      {scale: 3},
    ],
    position: 'absolute',
    left: 360,
    top: 640,
  },
});
