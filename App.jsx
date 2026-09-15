import React, { useState, useContext, useEffect } from 'react';
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
import { InventarioProvider } from './context/InventarioContext'; 
import { fetchAndCacheTier, getTierFromCache } from './utils/tierUtils';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// IMPORTACIÓN CENTRALIZADA DE TEMA Y ESTILOS
import { COLORS, FONT_SIZES, SPACING, lightTheme, darkTheme } from './context/theme';

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
import UpgradeScreen from './screens/UpgradeScreen';
import HelpScreen from './screens/HelpScreen';
import AlertasScreen from './screens/AlertasScreen';

// Importar items de Diseño
import HomeIcon from './assets/icons/IconHome.svg';
import AddIcon from './assets/icons/IconAdd.svg';
import VentaIcon from './assets/icons/IconVenta.svg';

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

  // ✅ ÚNICA FUENTE DE VERDAD PARA EL DISEÑO
  const themeColors = darkMode ? darkTheme : lightTheme;

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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.turquesa || COLORS.primary} />
        <Text style={[styles.loadingText, { color: themeColors.text }]}>Cargando...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* PANTALLAS PRINCIPALES */}
      {page === 'home' && (
        <HomeScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} />
      )}
      {page === 'entrada' && (
        <EntradaScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} />
      )}
      {page === 'salida' && (
        <SalidaScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} />
      )}

      {/* PANTALLAS SECUNDARIAS */}
      {page === 'Configuración' && (
        <SettingsScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} onDarkModeChange={toggleDarkMode} />
      )}
      {page === 'existencias' && (
        <ExistenciasScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} />
      )}
      {page === 'miembros' && (
        <MembersScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} onDarkModeChange={toggleDarkMode} />
      )}
      {page === 'upgrade' && (
        <UpgradeScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} onDarkModeChange={toggleDarkMode} />
      )}
      {page === 'ayuda' && (
        <HelpScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} onDarkModeChange={toggleDarkMode} />
      )}
      {page === 'clientes' && (
        <ClientesScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} />
      )}
      {page === 'analytics' && (
        <AnalyticsScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} />
      )}
      {page === 'alertas' && (
        <AlertasScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} />
      )}
      {page === 'sin-stock' && (
        <ExistenciasScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} modoSoloSinStock={true} />
      )}
      {page === 'bajo-stock' && (
        <ExistenciasScreen onNavigate={setPage} darkMode={darkMode} themeColors={themeColors} modoBajoStock={true} />
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
              backgroundColor: themeColors.cardBg, 
              borderTopColor: themeColors.border,
              paddingBottom: Math.max(insets.bottom, 25)
            },
          ]}
        >
          <TouchableOpacity style={styles.navBtn} onPress={() => setPage('home')}>
            <View style={[styles.navIconContainer, page === 'home' && styles.navIconContainerActive]}>
              <HomeIcon style={[styles.navIcon, { color: themeColors.textSecondary }, page === 'home' && styles.navIconActive]} />
            </View>
            <Text style={[styles.navLabel, { color: themeColors.textSecondary }, page === 'home' && styles.navLabelActive]}>Inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={() => setPage('entrada')}>
            <View style={[styles.navIconContainer, page === 'entrada' && styles.navIconContainerActive]}>
              <AddIcon style={[styles.navIcon, { color: themeColors.textSecondary }, page === 'entrada' && styles.navIconActive]} />
            </View>
            <Text style={[styles.navLabel, { color: themeColors.textSecondary }, page === 'entrada' && styles.navLabelActive]}>Agregar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={() => setPage('salida')}>
            <View style={[styles.navIconContainer, page === 'salida' && styles.navIconContainerActive]}>
              <VentaIcon style={[styles.navIcon, { color: themeColors.textSecondary }, page === 'salida' && styles.navIconActive]} />
            </View>
            <Text style={[styles.navLabel, { color: themeColors.textSecondary }, page === 'salida' && styles.navLabelActive]}>Vender</Text>
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
        <InventarioProvider>
          <StatusBar style="dark" backgroundColor="#ffffff" />
          <AppContent />
        </InventarioProvider>
      </AuthProvider>
    </SafeAreaProvider>
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
        <TouchableOpacity style={styles.placeholderBtn} onPress={handleLogout}>
          <Text style={styles.placeholderBtnText}>Cerrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.placeholderBtn, { backgroundColor: '#999' }]} onPress={() => onNavigate('home')}>
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
    textAlign: 'center',
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