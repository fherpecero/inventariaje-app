import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
};

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📦 Inventariaje</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Dashboard</Text>
        <Text style={styles.subtitle}>Bienvenido a tu sistema de inventario</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Resumen</Text>
          <Text style={styles.cardText}>Usa los botones abajo para:</Text>
          <Text style={styles.cardText}>📥 Entrada - Agregar productos</Text>
          <Text style={styles.cardText}>📤 Salida - Registrar ventas</Text>
        </View>
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.blanco,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.turquesa,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.negro,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});