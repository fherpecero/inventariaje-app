import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import HomeScreen from './HomeScreen';
import EntradaScreen from './EntradaScreen';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
};

export default function App() {
  const [page, setPage] = useState('home');
  const [usuario, setUsuario] = useState('admin'); // Usuario logueado

  return (
    <View style={styles.container}>
      {/* Mostrar pantalla según page */}
      {page === 'home' && <HomeScreen />}
      {page === 'entrada' && <EntradaScreen />}

      {/* Bottom Navigation */}
      <View style={styles.navbar}>
        <TouchableOpacity
          style={[styles.navBtn, page === 'home' && styles.navBtnActive]}
          onPress={() => setPage('home')}
        >
          <Text style={styles.navText}>📊 Inicio</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navBtn, page === 'entrada' && styles.navBtnActive]}
          onPress={() => setPage('entrada')}
        >
          <Text style={styles.navText}>📥 Entrada</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => {}}
        >
          <Text style={styles.navText}>📤 Salida</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => {}}
        >
          <Text style={styles.navText}>⚙️ Config</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: COLORS.blanco,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navBtnActive: {
    borderTopWidth: 3,
    borderTopColor: COLORS.turquesa,
  },
  navText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.negro,
  },
});