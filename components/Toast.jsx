import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * 🎯 COMPONENTE: Toast
 * 
 * ¿QUÉ HACE?
 * Muestra una notificación que desaparece automáticamente
 * 
 * PROPS:
 * - visible: boolean (visible o no)
 * - message: string (mensaje a mostrar)
 * - duration: number (milisegundos - default 1500)
 * - type: 'success' | 'error' | 'warning' | 'info' (default 'success')
 * - onHide: function (callback cuando desaparece)
 * 
 * EJEMPLO DE USO:
 * const [toastConfig, setToastConfig] = useState({ visible: false });
 * 
 * const mostrarToast = (msg, type = 'success') => {
 *   setToastConfig({ visible: true, message: msg, type });
 * };
 * 
 * <Toast {...toastConfig} onHide={() => setToastConfig({ visible: false })} />
 */

const COLORS = {
  success: '#4CAF50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196F3',
};

const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

export default function Toast({ 
  visible, 
  message, 
  duration = 1500, 
  type = 'success',
  onHide 
}) {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto hide después de duration
      const timer = setTimeout(() => {
        // Fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (onHide) onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, fadeAnim, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: COLORS[type] }]}>
        <Text style={styles.icon}>{ICONS[type]}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },

  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  icon: {
    fontSize: 18,
  },

  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});