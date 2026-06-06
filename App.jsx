import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import HomeScreen from './HomeScreen';
import EntradaScreen from './EntradaScreen';
import SalidaScreen from './SalidaScreen';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  naranja: '#FF9800',
  morado: '#9C27B0',
};

export default function App() {
  const [page, setPage] = useState('home');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Mostrar pantalla según page */}
        {page === 'home' && <HomeScreen onNavigate={setPage} />}
        {page === 'entrada' && <EntradaScreen />}
        {page === 'salida' && <SalidaScreen />}

        {/* Bottom Navigation - MORADO CON 3 BOTONES */}
        <View style={styles.navbar}>
          <TouchableOpacity
            style={[styles.navBtn, page === 'home' && styles.navBtnActive]}
            onPress={() => setPage('home')}
          >
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={styles.navLabel}>HOME</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, page === 'entrada' && styles.navBtnActive]}
            onPress={() => setPage('entrada')}
          >
            <Text style={styles.navIcon}>✨</Text>
            <Text style={styles.navLabel}>ADD</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, page === 'salida' && styles.navBtnActive]}
            onPress={() => setPage('salida')}
          >
            <Text style={styles.navIcon}>💰</Text>
            <Text style={styles.navLabel}>VENTA</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: COLORS.morado,
    borderTopWidth: 0,
    paddingVertical: 10,
    paddingBottom: 16,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    marginHorizontal: 6,
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.blanco,
  },
});