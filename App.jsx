import React, { useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  ActivityIndicator,
  LogBox
} from 'react-native';

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

import { AuthContext, AuthProvider } from './context/AuthContext';
import { fetchAndCacheTier, getTierFromCache } from './utils/tierUtils';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// ✅ IMPORTACIÓN CENTRALIZADA DE TEMA Y ESTILOS
import { COLORS, FONT_SIZES, SPACING } from './context/theme';

// Importar pantallas
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import EntradaScreen from './screens/EntradaScreen';
import SalidaScreen from './screens/SalidaScreen';
import SettingsScreen from './screens/SettingsScreen';
import ExistenciasScreen from './screens/ExistenciasScreen'; 
import MembersScreen from './screens/MembersScreen';
import ClientesScreen from './screens/ClientesScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';

// Importar items de Diseño
import HomeIcon from './assets/icons/IconHome.svg';
import AddIcon from './assets/icons/IconAdd.svg';
import VentaIcon from './assets/icons/IconVenta.svg';

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
      cardBg: '#2a2a2a',
    };
  } else {
    return {
      bg: COLORS.gris || '#f5f5f5',
      bgSecondary: COLORS.blanco || '#ffffff',
      text: COLORS.negro || '#000000',
      textSecondary: '#666666',
      header: COLORS.blanco || '#ffffff',
      border: '#e0e0e0',
      input: COLORS.blanco || '#ffffff',
      cardBg: COLORS.blanco || '#ffffff',
    };
  }
};

// COMPONENTE PRINCIPAL
function AppContent() {
  const { user, loading, logout } = useContext(AuthContext);
  const [page, setPage] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [userTier, setUserTier] = useState('basic'); 

  const insets = useSafeAreaInsets();

  // BACK BUTTON HANDLER
  useEffect(() => {
    const backAction = () => {
      if (page !== 'home') {
        setPage('home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [page]);

  const themeColors = getThemeColors(darkMode);

  const toggleDarkMode = (newValue) => {
    setDarkMode(newValue);
  };

  // CARGAR TIER CUANDO USUARIO HACE LOGIN
  useEffect(() => {
    if (user) {
      cargarTierDelUsuario();
    }
  }, [user]);

  const cargarTierDelUsuario = async () => {
    try {
      const tier = await getTierFromCache();
      setUserTier(tier);
      console.log(`📱 Tier cargado en App: ${tier}`);
    } catch (error) {
      console.error('❌ Error cargando tier en App:', error);
      setUserTier('basic');
    }
  };

  // MOSTRAR LOADING MIENTRAS SE VERIFICA AUTENTICACIÓN
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.turquesa || COLORS.primary} />
        <Text style={[styles.loadingText, { color: themeColors.text }]}>Cargando...</Text>
      </View>
    );
  }

  // SI NO HAY USUARIO LOGUEADO, MOSTRAR LOGIN
  if (!user) {
    return <LoginScreen />;
  }

  // SI HAY USUARIO LOGUEADO, MOSTRAR APP
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

      {/* PANTALLAS SECUNDARIAS */}
      {page === 'Configuranza' && (
        <SettingsScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
          onDarkModeChange={toggleDarkMode}
        />
      )}
      {page === 'existencias' && (
        <ExistenciasScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
        />
      )}
      {page === 'miembros' && (
        <MembersScreen 
          onNavigate={setPage} 
          darkMode={darkMode} 
          themeColors={themeColors} 
        />
      )}
      {/* PANTALLAS PREMIUM */}
      {page === 'clientes' && (
        <ClientesScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
        />
      )}

      {/* SECCIÓN ANALYTICS INTEGRADA */}
      {page === 'analytics' && (
        <AnalyticsScreen 
          onNavigate={setPage} 
          darkMode={darkMode} 
          themeColors={themeColors} 
        />
      )}
      
      {page === 'alertas' && (
        <AlertasPlaceholder onNavigate={setPage} themeColors={themeColors} />
      )}
      {page === 'inventario' && (
        <InventarioPlaceholder onNavigate={setPage} themeColors={themeColors} />
      )}
      {page === 'sin-stock' && (
        <ExistenciasScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
          modoSoloSinStock={true}
        />
      )}
      {page === 'logout' && (
        <LogoutScreen onNavigate={setPage} onLogout={logout} themeColors={themeColors} />
      )}

      {/* FOOTER NAVBAR - SOLO EN PANTALLAS PRINCIPALES */}
      {(page === 'home' || page === 'entrada' || page === 'salida') && (
        <View
          style={[
            styles.navbar,
            { 
              backgroundColor: themeColors.header,
              paddingBottom: Math.max(insets.bottom, 25)
            },
          ]}
        >
          {/* Botón Dashboard */}
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setPage('home')}
          >
            <View style={[
              styles.navIconContainer, 
              page === 'home' && styles.navIconContainerActive
            ]}>
              <HomeIcon 
                style={[
                  styles.navIcon, 
                  page === 'home' && styles.navIconActive
                ]} 
              />
            </View>
            <Text style={[
              styles.navLabel, 
              page === 'home' && styles.navLabelActive
            ]}>Inicio</Text>
          </TouchableOpacity>

          {/* Botón ADD (Entrada) */}
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setPage('entrada')}
          >
            <View style={[
              styles.navIconContainer, 
              page === 'entrada' && styles.navIconContainerActive
            ]}>
              <AddIcon 
                style={[
                  styles.navIcon, 
                  page === 'entrada' && styles.navIconActive
                ]} 
              />
            </View>
            <Text style={[
              styles.navLabel, 
              page === 'entrada' && styles.navLabelActive
            ]}>Agregar</Text>
          </TouchableOpacity>

          {/* Botón VENTA (Salida) */}
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setPage('salida')}
          >
            <View style={[
              styles.navIconContainer, 
              page === 'salida' && styles.navIconContainerActive
            ]}>
              <VentaIcon 
                style={[
                  styles.navIcon, 
                  page === 'salida' && styles.navIconActive
                ]} 
              />
            </View>
            <Text style={[
              styles.navLabel, 
              page === 'salida' && styles.navLabelActive
            ]}>Vender</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// COMPONENTE RAÍZ
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor="#ffffff" />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// ZONA DE PLACEHOLDERS RESTANTES
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

function LogoutScreen({ onNavigate, onLogout, themeColors }) {
  const handleLogout = async () => {
    await onLogout();
    onNavigate('home');
  };
  
  return (
    <View style={[styles.placeholder, { backgroundColor: themeColors.bg }]}>
      <View style={[styles.placeholderHeader, { backgroundColor: themeColors.header }]}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.placeholderBackBtn}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.placeholderTitle}>Salir</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.placeholderContent}>
        <Text style={[styles.placeholderText, { color: themeColors.text }]}>
          ¿Deseas cerrar sesión?
        </Text>
        <TouchableOpacity
          style={styles.placeholderBtn}
          onPress={handleLogout}
        >
          <Text style={styles.placeholderBtnText}>Cerrar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.placeholderBtn, { backgroundColor: '#999' }]}
          onPress={() => onNavigate('home')}
        >
          <Text style={styles.placeholderBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gris || '#f5f5f5',
    boxShadow: '0px 0px 5px -3px #00000042',
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  navIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 25, 
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    padding: 10,
  },
  navIconContainerActive: {
    backgroundColor: COLORS.turquesa || COLORS.primary,
    borderRadius: 25, 
  },
  navIcon: {
    color: COLORS.grey || '#565656',
    marginBottom: 4,
  },
  navIconActive: {
    color: COLORS.blanco || '#ffffff',
  },
  navLabel: {
    fontSize: FONT_SIZES.pequeño || FONT_SIZES.xs || 12,
    fontWeight: '600',
    color: COLORS.grey || '#565656',
    textAlign: 'center',
  },
  navLabelActive: {
    color: COLORS.turquesa || COLORS.primary,
  },
  placeholder: {
    flex: 1,
  },
  placeholderHeader: {
    paddingHorizontal: SPACING.content_padding || SPACING.md || 15,
    paddingVertical: SPACING.header_padding || 50,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholderBackBtn: {
    fontSize: FONT_SIZES.normal || FONT_SIZES.md || 14,
    fontWeight: '600',
    color: COLORS.blanco || '#ffffff',
  },
  placeholderTitle: {
    fontSize: FONT_SIZES.subtitulo || FONT_SIZES.lg || 20,
    fontWeight: '700',
    color: COLORS.blanco || '#ffffff',
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
    fontSize: FONT_SIZES.normal || FONT_SIZES.md || 14,
    marginBottom: 20,
  },
  placeholderBtn: {
    backgroundColor: COLORS.turquesa || COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  placeholderBtnText: {
    color: COLORS.blanco || '#ffffff',
    fontWeight: '600',
  },
});