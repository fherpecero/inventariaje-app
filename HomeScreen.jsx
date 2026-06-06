import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
  naranja: '#FF9800',
  morado: '#9C27B0',
};

export default function HomeScreen({ onNavigate }) {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleNavigation = (screen) => {
    setMenuVisible(false);
    if (onNavigate) {
      onNavigate(screen);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.logo}>🌿INVENTARIAJE APP🌱</Text>
            <Text style={styles.subtitle}>by FherLaRush</Text>
          </View>
          
          {/* Hamburger Menu Button - ALINEADO */}
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.hamburgerIcon}>≡</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>Bienvenido 👋</Text>
            <Text style={styles.subgreeting}>
              Sistema de gestión de inventario VH
            </Text>
          </View>

          {/* Roadmap Card - TU CONTENIDO MEJORADO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Roadmap de la app</Text>
            <Text style={styles.cardSubtitle}>Usa los botones arriba para:</Text>
            
            <View style={styles.roadmapItem}>
              <Text style={styles.roadmapCheck}>✅</Text>
              <View>
                <Text style={styles.roadmapLabel}>ADD</Text>
                <Text style={styles.roadmapDesc}>Agregar productos nuevos</Text>
              </View>
            </View>

            <View style={styles.roadmapItem}>
              <Text style={styles.roadmapCheck}>✅</Text>
              <View>
                <Text style={styles.roadmapLabel}>VENTA</Text>
                <Text style={styles.roadmapDesc}>Registrar ventas y salidas</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.roadmapItem}>
              <Text style={styles.roadmapPlan}>🎯</Text>
              <View>
                <Text style={styles.roadmapLabel}>Settings</Text>
                <Text style={styles.roadmapDesc}>Configuraciones y preferencias</Text>
              </View>
            </View>

            <View style={styles.roadmapItem}>
              <Text style={styles.roadmapPlan}>🎯</Text>
              <View>
                <Text style={styles.roadmapLabel}>Analytics</Text>
                <Text style={styles.roadmapDesc}>Reportes de ventas mensuales</Text>
              </View>
            </View>

            <View style={styles.roadmapItem}>
              <Text style={styles.roadmapPlan}>🎯</Text>
              <View>
                <Text style={styles.roadmapLabel}>Multi-usuario</Text>
                <Text style={styles.roadmapDesc}>Inventarios por usuarios</Text>
              </View>
            </View>

            <Text style={styles.roadmapQuestion}>🤔 ¿Qué más se le ofrece?</Text>
          </View>

          {/* Info Cards */}
          <View style={styles.cardsSection}>
            <Text style={styles.sectionTitle}>📊 Estado del Sistema</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardIcon}>📦</Text>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Productos</Text>
                <Text style={styles.infoCardValue}>27 activos</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardIcon}>📈</Text>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Últimas Ventas</Text>
                <Text style={styles.infoCardValue}>En tiempo real</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardIcon}>🔄</Text>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Sincronización</Text>
                <Text style={styles.infoCardValue}>Firebase ✅</Text>
              </View>
            </View>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </View>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuModal}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menú</Text>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuDivider} />

            {/* Menu Items */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemIcon}>⚙️</Text>
              <Text style={styles.menuItemText}>Configuración</Text>
              <Text style={styles.menuItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemIcon}>📊</Text>
              <Text style={styles.menuItemText}>Reportes & Analytics</Text>
              <Text style={styles.menuItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemIcon}>👥</Text>
              <Text style={styles.menuItemText}>Multi-usuario</Text>
              <Text style={styles.menuItemArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemIcon}>ℹ️</Text>
              <Text style={styles.menuItemText}>Acerca de</Text>
              <Text style={styles.menuItemArrow}>→</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={styles.menuItemText}>Cerrar Sesión</Text>
              <Text style={styles.menuItemArrow}>→</Text>
            </TouchableOpacity>

            <View style={styles.menuFooter}>
              <Text style={styles.versionText}>v1.0.0 - Beta</Text>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    backgroundColor: COLORS.turquesa,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.blanco,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 3,
  },
  hamburgerBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerIcon: {
    fontSize: 26,
    color: COLORS.blanco,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  welcomeSection: {
    marginBottom: 25,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.negro,
    marginBottom: 4,
  },
  subgreeting: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  // Card Roadmap
  card: {
    backgroundColor: COLORS.blanco,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.turquesa,
    marginBottom: 25,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.negro,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
    marginBottom: 14,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  roadmapCheck: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  roadmapPlan: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  roadmapLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.negro,
  },
  roadmapDesc: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  roadmapQuestion: {
    fontSize: 13,
    color: COLORS.morado,
    fontWeight: '600',
    marginTop: 6,
    fontStyle: 'italic',
  },
  cardsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.negro,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: COLORS.blanco,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.turquesa,
  },
  infoCardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.negro,
  },
  spacer: {
    height: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuModal: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '75%',
    backgroundColor: COLORS.blanco,
    paddingTop: 16,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.negro,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 24,
    color: COLORS.negro,
    fontWeight: 'bold',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
  },
  menuItemArrow: {
    fontSize: 16,
    color: '#999',
  },
  menuItemDanger: {
    marginTop: 4,
  },
  menuFooter: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  versionText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
});