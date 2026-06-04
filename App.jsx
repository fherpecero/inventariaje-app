import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
};

export default function App() {
  const [page, setPage] = useState('home');
  const [inventario, setInventario] = useState([
    { id: '1', nombre: 'Producto 1', cantidad: 10 },
    { id: '2', nombre: 'Producto 2', cantidad: 5 },
  ]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📦 InventariAJE</Text>
      </View>

      {/* Contenido */}
      {page === 'home' && (
        <View style={styles.content}>
          <Text style={styles.heading}>Gestión de Inventario</Text>
          <Text style={styles.subtitle}>Usuario: admin</Text>
          
          <FlatList
            data={inventario}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <Text style={styles.itemQty}>Stock: {item.cantidad}</Text>
              </View>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Bottom Navigation */}
      <View style={styles.navbar}>
        <TouchableOpacity
          style={[styles.navBtn, page === 'home' && styles.navBtnActive]}
          onPress={() => setPage('home')}
        >
          <Text style={styles.navText}>📊 Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, page === 'config' && styles.navBtnActive]}
          onPress={() => setPage('config')}
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
  header: {
    backgroundColor: COLORS.turquesa,
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.blanco,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  item: {
    backgroundColor: COLORS.blanco,
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.negro,
  },
  itemQty: {
    fontSize: 14,
    color: COLORS.turquesa,
    marginTop: 5,
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: COLORS.blanco,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navBtn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  navBtnActive: {
    borderTopWidth: 3,
    borderTopColor: COLORS.turquesa,
  },
  navText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.negro,
  },
});