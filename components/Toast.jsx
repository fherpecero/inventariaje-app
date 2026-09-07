import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';

const COLORS = {
  success: '#24c5c5',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196F3',
};

const ICONS = {
  success: <FontAwesome6 name="circle-check" size={18} color="white" />,
  error: <FontAwesome6 name="cancel" size={18} color="white" />,
  warning: <Ionicons name="warning-outline" size={18} color="white" />,
  info: <FontAwesome6 name="info" size={18} color="white" />,
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