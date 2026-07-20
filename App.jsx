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

// Importar pantallas
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import EntradaScreen from './screens/EntradaScreen';
import SalidaScreen from './screens/SalidaScreen';
import SettingsScreen from './screens/SettingsScreen';
import ExistenciasScreen from './screens/ExistenciasScreen'; 
import MembersScreen from './screens/MembersScreen';
import ClientesScreen from './screens/ClientesScreen';

// Importar items de Diseño
import HomeIcon from './assets/icons/IconHome.svg';
import AddIcon from './assets/icons/IconAdd.svg';
import VentaIcon from './assets/icons/IconVenta.svg';



const handleNavigation = async (screen) => {
  console.log('Navegando a:', screen);
  cerrarMenu();
  
  // Pequeño delay para evitar cambios visuales rápidos
  setTimeout(() => {
    onNavigate(screen);
  }, 100);
};

const COLORS = {
  turquesa: '#24c5c5',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
  naranja: '#FF9800',
  morado: '#7e2b8d',
  rojito: '#f97272',
  grey: '#565656',
};

const FONT_SIZES = {
  titulo: 24,
  subtitulo: 20,
  normal: 14,
  pequeño: 12,
};

const SPACING = {
  header_padding: 50,
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
      cardBg: '#2a2a2a',
    };
  } else {
    return {
      bg: COLORS.gris,
      bgSecondary: COLORS.blanco,
      text: COLORS.negro,
      textSecondary: '#666666',
      header: COLORS.blanco,
      border: '#e0e0e0',
      input: COLORS.blanco,
      cardBg: COLORS.blanco,
    };
  }
};

// COMPONENTE PRINCIPAL
function AppContent() {
  const { user, loading, logout } = useContext(AuthContext);
  const [page, setPage] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [userTier, setUserTier] = useState('basic'); 

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
        <ActivityIndicator size="large" color={COLORS.turquesa} />
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
      {page === 'existencias' && (  // ← AGREGAR ESTAS LÍNEAS
        <ExistenciasScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
        />
      )}
      {page === 'miembros' && 
        <MembersScreen 
          onNavigate={setPage} 
          darkMode={darkMode} 
          themeColors={themeColors} 
        />
      }
      {/* PANTALLAS PREMIUM */}
      {page === 'clientes' && (
        <ClientesScreen
          onNavigate={setPage}
          darkMode={darkMode}
          themeColors={themeColors}
        />
      )}

      {page === 'analytics' && (
        <AnalyticsPlaceholder onNavigate={setPage} themeColors={themeColors} />
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
          modoSoloSinStock={true}  // ← PARÁMETRO QUE ACTIVA EL FILTRO
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
            { backgroundColor: themeColors.header },
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

// COMPONENTE RAÍZ (CON PROVIDER)
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
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

// LOGOUT SCREEN
function LogoutScreen({ onNavigate, onLogout, themeColors }) {
  const handleLogout = async () => {
    await onLogout();  // Esperar a que logout() termine
    onNavigate('home');  // Redirige a home (que mostrará LoginScreen si user === null)
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
          onPress={() => {
            handleLogout();
          }}
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

  // NAVBAR STYLES
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
    paddingBottom: 25,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gris,
    boxShadow: '0px 0px 5px -3px #00000042',
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    //paddingVertical: 10,
    //borderRadius: 50,
    //marginHorizontal: 4,
    //width: 100,
    //height: 100,
    //borderRadius: 50,
    justifyContent: 'center',
    //alignItems: 'center',
    marginHorizontal: 4,
    //color: COLORS.gris, 
  },
  //navBtnActive: {
    //backgroundColor: COLORS.turquesa,
  //},
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
    backgroundColor: COLORS.turquesa,
    borderRadius: 25, 
  },
  navIcon: {
    //fontSize: 30,
    //marginBottom: 8,
    //color: COLORS.gris,
    //width: 1,
    //height: 1,
    //borderRadius: 25,
    //backgroundColor: 'transparent', 
    color: COLORS.grey,
    marginBottom: 4,
    //textAlign: 'center',
    
  },
  navIconActive: {
    //backgroundColor: COLORS.turquesa,
    color: COLORS.blanco,
  },
  navLabel: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    color: COLORS.grey,
    textAlign: 'center',
  },
  navLabelActive: {
    color: COLORS.turquesa,
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
    marginBottom: 10,
  },
  placeholderBtnText: {
    color: COLORS.blanco,
    fontWeight: '600',
  },
});
