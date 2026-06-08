import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

// Importar todas las pantallas
import HomeScreen from './HomeScreen';
import EntradaScreen from './EntradaScreen';
import SalidaScreen from './SalidaScreen';
import SettingsScreen from './SettingsScreen';

const COLORS = {
  turquesa: '#1a9ea1',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
  naranja: '#FF9800',
  morado: '#7e2b8d',
  rojito: '#f97272',
};

const FONT_SIZES = {
  titulo: 20,
  subtitulo: 16,
  normal: 14,
  pequeño: 12,
};

const SPACING = {
  header_padding: 20,
  content_padding: 15,
  bottom_padding: 30,
  btn_padding: 15,
  global: 10,
};

// FUNCIÓN PARA OBTENER COLORES SEGÚN DARK MODE
const getThemeColors = (darkMode) => {
  if (darkMode) {
    return {
      bg: '#1a1a1a',
      bgSecondary: '#2d2d2d',
      text: '#ffffff',
      textSecondary: '#cccccc',
      header: '#0d5f60',
      border: '#444444',
      input: '#333333',
    };
  } else {
    return {
      bg: COLORS.gris,
      bgSecondary: COLORS.blanco,
      text: COLORS.negro,
      textSecondary: '#666666',
      header: COLORS.turquesa,
      border: '#e0e0e0',
      input: COLORS.blanco,
    };
  }
};

export default function App() {
  const [page, setPage] = useState('home');
  const [darkMode, setDarkMode] = useState(false);

  const themeColors = getThemeColors(darkMode);

  const toggleDarkMode = (newValue) => {
    setDarkMode(newValue);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* PANTALLAS PRINCIPALES */}
      {page === 'home' && (
        <HomeScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
        />
      )}
      {page === 'entrada' && (
        <EntradaScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
        />
      )}
      {page === 'salida' && (
        <SalidaScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
        />
      )}

      {/* PANTALLAS SECUNDARIAS (FASE 3) */}
      {page === 'Configuranza' && (
        <SettingsScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
          onDarkModeChange={toggleDarkMode}
        />
      )}
      {page === 'analytics' && (
        <AnalyticsPlaceholder onNavigate={setPage} themeColors={themeColors} />
      )}
      {page === 'alertas' && (
        <AlertasPlaceholder onNavigate={setPage} themeColors={themeColors} />
      )}

      {/* PANTALLAS DE DASHBOARD ITEMS */}
      {page === 'inventario' && (
        <InventarioPlaceholder
          onNavigate={setPage}
          themeColors={themeColors}
        />
      )}
      {page === 'sin-stock' && (
        <SinStockPlaceholder onNavigate={setPage} themeColors={themeColors} />
      )}

      {/* FOOTER NAVBAR - SOLO EN PANTALLAS PRINCIPALES */}
      {(page === 'home' || page === 'entrada' || page === 'salida') && (
        <View
          style={[
            styles.navbar,
            { backgroundColor: themeColors.header },
          ]}
        >
          {/* Botón Dashboard */}
          <TouchableOpacity
            style={[
              styles.navBtn,
              page === 'home' && styles.navBtnActive,
            ]}
            onPress={() => setPage('home')}
          >
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={styles.navLabel}>Dashboard</Text>
          </TouchableOpacity>

          {/* Botón ADD (Entrada) */}
          <TouchableOpacity
            style={[
              styles.navBtn,
              page === 'entrada' && styles.navBtnActive,
            ]}
            onPress={() => setPage('entrada')}
          >
            <Text style={styles.navIcon}>➕</Text>
            <Text style={styles.navLabel}>ADD</Text>
          </TouchableOpacity>

          {/* Botón VENTA (Salida) */}
          <TouchableOpacity
            style={[
              styles.navBtn,
              page === 'salida' && styles.navBtnActive,
            ]}
            onPress={() => setPage('salida')}
          >
            <Text style={styles.navIcon}>💰</Text>
            <Text style={styles.navLabel}>VENTA</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// PLACEHOLDER: InventarioScreen
function InventarioPlaceholder({ onNavigate, themeColors }) {
  return (
    <View style={[styles.placeholder, { backgroundColor: themeColors.bg }]}>
      <View style={[styles.placeholderHeader, { backgroundColor: themeColors.header }]}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.placeholderBackBtn}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.placeholderTitle}>📦 Inventario</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.placeholderContent}>
        <Text style={[styles.placeholderText, { color: themeColors.text }]}>
          📦 Inventario Completo
        </Text>
        <Text style={[styles.placeholderSubtext, { color: themeColors.textSecondary }]}>
          Próximamente...
        </Text>
        <TouchableOpacity
          style={styles.placeholderBtn}
          onPress={() => onNavigate('home')}
        >
          <Text style={styles.placeholderBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// PLACEHOLDER: SinStockScreen
function SinStockPlaceholder({ onNavigate, themeColors }) {
  return (
    <View style={[styles.placeholder, { backgroundColor: themeColors.bg }]}>
      <View style={[styles.placeholderHeader, { backgroundColor: themeColors.header }]}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.placeholderBackBtn}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.placeholderTitle}>⚠️ Sin Stock</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.placeholderContent}>
        <Text style={[styles.placeholderText, { color: themeColors.text }]}>
          ⚠️ Productos sin Stock
        </Text>
        <Text style={[styles.placeholderSubtext, { color: themeColors.textSecondary }]}>
          Próximamente...
        </Text>
        <TouchableOpacity
          style={styles.placeholderBtn}
          onPress={() => onNavigate('home')}
        >
          <Text style={styles.placeholderBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// PLACEHOLDER: AnalyticsScreen
function AnalyticsPlaceholder({ onNavigate, themeColors }) {
  return (
    <View style={[styles.placeholder, { backgroundColor: themeColors.bg }]}>
      <View style={[styles.placeholderHeader, { backgroundColor: themeColors.header }]}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.placeholderBackBtn}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.placeholderTitle}>📊 Analytics</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.placeholderContent}>
        <Text style={[styles.placeholderText, { color: themeColors.text }]}>
          📊 Reportes de Ventas
        </Text>
        <Text style={[styles.placeholderSubtext, { color: themeColors.textSecondary }]}>
          Próximamente...
        </Text>
        <TouchableOpacity
          style={styles.placeholderBtn}
          onPress={() => onNavigate('home')}
        >
          <Text style={styles.placeholderBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// PLACEHOLDER: AlertasScreen
function AlertasPlaceholder({ onNavigate, themeColors }) {
  return (
    <View style={[styles.placeholder, { backgroundColor: themeColors.bg }]}>
      <View style={[styles.placeholderHeader, { backgroundColor: themeColors.header }]}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.placeholderBackBtn}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.placeholderTitle}>⚠️ Alertas</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.placeholderContent}>
        <Text style={[styles.placeholderText, { color: themeColors.text }]}>
          ⚠️ Alertas de Restock
        </Text>
        <Text style={[styles.placeholderSubtext, { color: themeColors.textSecondary }]}>
          Próximamente...
        </Text>
        <TouchableOpacity
          style={styles.placeholderBtn}
          onPress={() => onNavigate('home')}
        >
          <Text style={styles.placeholderBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // NAVBAR STYLES
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.btn_padding,
    paddingBottom: SPACING.bottom_padding,
    borderTopWidth: 1,
    borderTopColor: '#0d6f71',
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  navBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  navIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  navLabel: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    color: COLORS.blanco,
  },

  // PLACEHOLDER STYLES
  placeholder: {
    flex: 1,
  },
  placeholderHeader: {
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: SPACING.header_padding,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholderBackBtn: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    color: COLORS.blanco,
  },
  placeholderTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 28,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: FONT_SIZES.normal,
    marginBottom: 20,
  },
  placeholderBtn: {
    backgroundColor: COLORS.turquesa,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  placeholderBtnText: {
    color: COLORS.blanco,
    fontWeight: '600',
  },
});
