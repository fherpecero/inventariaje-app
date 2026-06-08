import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';


const COLORS = {
  turquesa: '#1a9ea1',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
  naranja: '#FF9800',
  morado: '#7e2b8d',
};

const FONT_SIZES = {
  titulo: 20,
  subtitulo: 16,
  normal: 14,
  pequeño: 12,
};

const SPACING = {
  header_padding: 40,
  content_padding: 15,
  bottom_padding: 30,
  btn_padding: 15,
};

export default function HomeScreen({ onNavigate, darkMode, themeColors }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState({
    totalEnExistencia: 0,
    productosSinStock: 0,
    ventasDelaSemana: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://inventariaje-app.vercel.app/api/salida');
      const data = await response.json();

      if (data.exito && data.productos) {
        const totalEnExistencia = data.productos.reduce((sum, p) => sum + (p.cantidad || 0), 0);
        const productosSinStock = data.productos.filter(p => p.cantidad === 0).length;

        setStats({
          totalEnExistencia,
          productosSinStock,
          ventasDelaSemana: 0,
        });
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const cerrarMenu = () => {
    setMenuVisible(false);
  };

  const handleNavigation = (screen) => {
    console.log('Navegando a:', screen);
    cerrarMenu();
    onNavigate(screen);
  };

  if (loading) {
    return (
      <View style={styles.container}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
        </View>
    );
  }

  return (
        <View style={[
          styles.container, 
          { backgroundColor: themeColors.bg }
        ]}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🌿 INVENTARIAJE APP 🌱</Text>
            <Text style={styles.headerSubtitle}>by FherLaRush</Text>
          </View>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.menuIcon}>≡</Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* BIENVENIDA */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Bienvenido 👋</Text>
            <Text style={styles.welcomeSubtitle}>Gestiona tu inventario y ventas VH 🌱</Text>
          </View>

          {/* DASHBOARD - BOTONES INTERACTIVOS */}
          <View style={styles.dashboardSection}>
            <Text style={styles.sectionTitle}>📊 Dashboard</Text>

            {/* Botón Total Existencias */}
            <TouchableOpacity
              style={styles.dashboardBtn}
              onPress={() => handleNavigation('inventario')}
              activeOpacity={0.8}
            >
              <View style={styles.dashboardBtnContent}>
                <Text style={styles.dashboardIcon}>📦</Text>
                <View style={styles.dashboardBtnText}>
                  <Text style={styles.dashboardLabel}>Total en Existencia</Text>
                  <Text style={styles.dashboardValue}>{stats.totalEnExistencia} unidades</Text>
                </View>
              </View>
              <Text style={styles.dashboardArrow}>→</Text>
            </TouchableOpacity>

            {/* Botón Productos sin Stock */}
            <TouchableOpacity
              style={[styles.dashboardBtn, styles.dashboardBtnWarning]}
              onPress={() => handleNavigation('sin-stock')}
              activeOpacity={0.8}
            >
              <View style={styles.dashboardBtnContent}>
                <Text style={styles.dashboardIcon}>⚠️</Text>
                <View style={styles.dashboardBtnText}>
                  <Text style={styles.dashboardLabel}>Productos sin Stock</Text>
                  <Text style={styles.dashboardValueWarning}>{stats.productosSinStock} productos</Text>
                </View>
              </View>
              <Text style={styles.dashboardArrow}>→</Text>
            </TouchableOpacity>

            {/* Botón Ventas Semana */}
            <TouchableOpacity
              style={styles.dashboardBtn}
              onPress={() => handleNavigation('analytics')}
              activeOpacity={0.8}
            >
              <View style={styles.dashboardBtnContent}>
                <Text style={styles.dashboardIcon}>💰</Text>
                <View style={styles.dashboardBtnText}>
                  <Text style={styles.dashboardLabel}>Ventas de la Semana</Text>
                  <Text style={styles.dashboardValue}>${stats.ventasDelaSemana || '0.00'}</Text>
                </View>
              </View>
              <Text style={styles.dashboardArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* ROADMAP */}
          <View style={styles.roadmapSection}>
            <Text style={styles.sectionTitle}>🛣️ Roadmap de la App</Text>
            <Text style={styles.roadmapSubtitle}>Lista de mejoras en desarrollamiento:</Text>

            <View style={styles.roadmapList}>
              <View style={styles.roadmapItem}>
                <Text style={styles.roadmapCheckmark}>✅</Text>
                <View style={styles.roadmapText}>
                  <Text style={styles.roadmapItemTitle}>ADD</Text>
                  <Text style={styles.roadmapItemDesc}>Agregar productos nuevos</Text>
                </View>
              </View>

              <View style={styles.roadmapItem}>
                <Text style={styles.roadmapCheckmark}>✅</Text>
                <View style={styles.roadmapText}>
                  <Text style={styles.roadmapItemTitle}>VENTA</Text>
                  <Text style={styles.roadmapItemDesc}>Registrar ventas y salidas</Text>
                </View>
              </View>

              <View style={styles.roadmapItem}>
                <Text style={styles.roadmapCheckmark}>🎯</Text>
                <View style={styles.roadmapText}>
                  <Text style={styles.roadmapItemTitle}>Configuración</Text>
                  <Text style={styles.roadmapItemDesc}>Preferencias y usuario</Text>
                </View>
              </View>

              <View style={styles.roadmapItem}>
                <Text style={styles.roadmapCheckmark}>🎯</Text>
                <View style={styles.roadmapText}>
                  <Text style={styles.roadmapItemTitle}>Analytics</Text>
                  <Text style={styles.roadmapItemDesc}>Reportes de ventas</Text>
                </View>
              </View>

              <View style={styles.roadmapItem}>
                <Text style={styles.roadmapCheckmark}>🎯</Text>
                <View style={styles.roadmapText}>
                  <Text style={styles.roadmapItemTitle}>Multi-usuario</Text>
                  <Text style={styles.roadmapItemDesc}>Inventarios por usuarios</Text>
                </View>
              </View>

              <View style={styles.roadmapItem}>
                <Text style={styles.roadmapCheckmark}>🎯</Text>
                <View style={styles.roadmapText}>
                  <Text style={styles.roadmapItemTitle}>Alertas de Restock</Text>
                  <Text style={styles.roadmapItemDesc}>Notificaciones automáticas</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: SPACING.bottom_padding }} />
        </ScrollView>

        {/* MODAL MENU HAMBURGUESA */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={cerrarMenu}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={cerrarMenu}
          >
            <Pressable
              style={styles.menuPressable}
              onPress={(e) => e.stopPropagation()}
            >
                <View style={styles.menuModal}>
                  {/* Header Menu */}
                  <View style={styles.menuHeader}>
                    <Text style={styles.menuTitle}>Menú</Text>
                    <TouchableOpacity onPress={cerrarMenu}>
                      <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Menu Items */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNavigation('Configuranza')}
                  >
                    <Text style={styles.menuItemIcon}>⚙️</Text>
                    <Text style={styles.menuItemText}>Configuranza</Text>
                    <Text style={styles.menuItemArrow}>→</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNavigation('analytics')}
                  >
                    <Text style={styles.menuItemIcon}>📊</Text>
                    <Text style={styles.menuItemText}>Reportes & Analytics</Text>
                    <Text style={styles.menuItemArrow}>→</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNavigation('alertas')}
                  >
                    <Text style={styles.menuItemIcon}>⚠️</Text>
                    <Text style={styles.menuItemText}>Alertas de Restock</Text>
                    <Text style={styles.menuItemArrow}>→</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNavigation('home')}
                  >
                    <Text style={styles.menuItemIcon}>ℹ️</Text>
                    <Text style={styles.menuItemText}>Acerca de</Text>
                    <Text style={styles.menuItemArrow}>→</Text>
                  </TouchableOpacity>
                </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.blanco,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // HEADER
  header: {
    backgroundColor: COLORS.turquesa,
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: SPACING.header_padding,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: FONT_SIZES.titulo,
    fontWeight: '700',
    color: COLORS.blanco,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.pequeño,
    color: 'rgba(255,255,255,0.8)',
  },
  menuBtn: {
    padding: 10,
  },
  menuIcon: {
    fontSize: 28,
    color: COLORS.blanco,
    fontWeight: '700',
  },

  // CONTENT
  content: {
    flex: 1,
    padding: SPACING.content_padding,
  },
  welcomeSection: {
    marginBottom: 25,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.titulo,
    fontWeight: '700',
    color: COLORS.negro,
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.normal,
    color: '#666',
  },

  // DASHBOARD
  dashboardSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.negro,
    marginBottom: 12,
  },
  dashboardBtn: {
    backgroundColor: COLORS.blanco,
    borderRadius: 12,
    padding: SPACING.btn_padding,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: COLORS.morado,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dashboardBtnWarning: {
    borderLeftColor: COLORS.rojo,
  },
  dashboardBtnContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  dashboardBtnText: {
    flex: 1,
  },
  dashboardLabel: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 4,
  },
  dashboardValue: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.turquesa,
  },
  dashboardValueWarning: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.rojo,
  },
  dashboardArrow: {
    fontSize: 20,
    color: COLORS.morado,
    fontWeight: '700',
  },

  // ROADMAP
  roadmapSection: {
    marginBottom: 30,
  },
  roadmapSubtitle: {
    fontSize: FONT_SIZES.normal,
    color: '#666',
    marginBottom: 12,
  },
  roadmapList: {
    backgroundColor: COLORS.blanco,
    borderRadius: 12,
    padding: SPACING.btn_padding,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.morado,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roadmapCheckmark: {
    fontSize: 20,
    marginRight: 12,
    minWidth: 24,
  },
  roadmapText: {
    flex: 1,
  },
  roadmapItemTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    color: COLORS.negro,
    marginBottom: 2,
  },
  roadmapItemDesc: {
    fontSize: FONT_SIZES.pequeño,
    color: '#999',
  },

  // NAVBAR
  navbar: {
    backgroundColor: COLORS.turquesa,
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

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuPressable: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '75%',
    backgroundColor: COLORS.blanco,
  },
  menuSafeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuModal: {
    flex: 1,
    backgroundColor: COLORS.blanco,
  },
  menuHeader: {
    backgroundColor: COLORS.turquesa,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: 15,
    paddingTop: 80,
  },
  menuTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  closeBtn: {
    fontSize: 28,
    color: COLORS.blanco,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gris,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    color: COLORS.negro,
  },
  menuItemArrow: {
    fontSize: 16,
    color: '#999',
  },
});
