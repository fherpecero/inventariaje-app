import { StyleSheet } from 'react-native';
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// ============================================
// PALETA DE COLORES GLOBAL
// ============================================
export const COLORS = {
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
  rojoCredito: '#f97272',
};

// ============================================
// TAMAÑOS DE FUENTE
// ============================================
export const FONT_SIZES = {
  titulo: 40,
  subtitulo: 20,
  normal: 16,
  pequeño: 14,
  muy_pequeño: 12,
};

// ============================================
// ESPACIADO GLOBAL
// ============================================
export const SPACING = {
  header_padding: 40,
  content_padding: 15,
  bottom_padding: 30,
  btn_padding: 15,
  global: 10,
};

// ============================================
// ESTILOS GLOBALES (Source of Truth)
// ============================================
export const GLOBAL_STYLES = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.content_padding,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    color: COLORS.grey,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 20,
  },
  emptyText: {
    fontSize: FONT_SIZES.normal,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  cardBase: {
    backgroundColor: COLORS.blanco,
    borderRadius: 12,
    padding: SPACING.content_padding,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.turquesa,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.blanco,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.negro,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.negro,
  },
  btnPrimary: {
    backgroundColor: COLORS.turquesa,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSuccess: {
    backgroundColor: COLORS.verde,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDanger: {
    backgroundColor: COLORS.rojito,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },
  modalBtnHalf: {
    flex: 1,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  inputBase: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: COLORS.blanco,
    borderRadius: 8,
    padding: 12,
    fontSize: FONT_SIZES.normal,
    color: COLORS.negro,
    marginBottom: 15,
  },
});

// ============================================
// HEADER GLOBAL - StyleSheet (Centralizado para TODA la app)
// ============================================
export const HEADER = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.blanco,
    paddingTop: 65,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.content_padding,
    paddingBottom: 20,
  },
  headerBorderGradient: {
    height: 2,
    width: '100%',
  },
  // Estilos de Títulos (Usados tanto en HomeScreen como en otros lados)
  headerTitle: {
    fontSize: FONT_SIZES.subtitulo, // Unificado al tamaño correcto
    fontWeight: '700',
    color: COLORS.grey,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.pequeño,
    fontStyle: 'italic',
    color: COLORS.grey,
  },
  // Controles del lado derecho (Campana, Menú)
  menuBtn: {
    padding: 10,
  },
  menuIcon: {
    fontSize: 40,
    color: COLORS.grey,
    fontWeight: '500',
  },
  // Específico para el ScreenHeader (Botón Atrás)
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: FONT_SIZES.subtitulo, // Con la corrección que hicimos antes
    fontWeight: '700',
    color: COLORS.grey,
    marginRight: 8,
  },
});

// ==========================================
// COMPONENTE: SCREEN HEADER (Refactorizado a 3 columnas)
// ==========================================
export const ScreenHeader = ({ title, onPress, themeColors, rightAction }) => {
  return (
  <View style={HEADER.headerContainer}>
    <View style={{
      backgroundColor: themeColors?.header || '#24c5c5',
      paddingHorizontal: 10,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between', // Distribuye las 3 zonas
    }}>
      
      {/* 1. LADO IZQUIERDO: Botón Back */}
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {onPress && (
          <TouchableOpacity 
            onPress={onPress}
            style={{ padding: 8 }} // Padding interno para que sea fácil de tocar
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="COLOR.negro" />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. CENTRO: Título */}
      <View style={{ flex: 2, alignItems: 'center' }}>
        <Text 
          style={{ 
            fontSize: 20, 
            fontWeight: '700', 
            color: COLORS.negro, 
            textAlign: 'center' 
          }}
          numberOfLines={1} 
        >
          {title}
        </Text>
      </View>

      {/* 3. LADO DERECHO: Botón de acción o Espaciador Fantasma */}
        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
          {rightAction ? rightAction : <View />}
           </View>

    </View>
      <LinearGradient
        colors={['rgba(68, 194, 194, 1)', 'rgba(122, 122, 236, 0.7)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0.27, 0.90]}
        style={HEADER.headerBorderGradient}
      />
    </View>
  )
}

// ============================================
// TEMAS: Light vs Dark Mode
// ============================================
export const getThemeColors = (darkMode) => {
  if (darkMode) {
    return {
      bg: '#1a1a1a',
      bgSecondary: '#2d2d2d',
      text: '#ffffff',
      textSecondary: '#cccccc',
      header: '#0d5f60',
      border: '#444444',
      borderColor: '#444444',
      input: '#333333',
      cardBg: '#2a2a2a',
    };
  } else {
    return {
      bg: COLORS.gris,
      bgSecondary: COLORS.blanco,
      text: COLORS.negro,
      textSecondary: '#666666',
      header: COLORS.turquesa,
      border: '#e0e0e0',
      borderColor: '#e0e0e0',
      input: COLORS.blanco,
      cardBg: COLORS.blanco,
    };
  }
};

// ============================================
// ESTILOS APP.JSX
// ============================================
export const appStyles = StyleSheet.create({
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
    backgroundColor: COLORS.turquesa,
    borderRadius: 25,
  },
  navIcon: {
    color: COLORS.grey,
    marginBottom: 4,
  },
  navIconActive: {
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
});

// ============================================
// ESTILOS HOME SCREEN (Limpiado de duplicados globales)
// ============================================
export const homeStyles = StyleSheet.create({
  welcomeSection: {
    marginTop: 20,
    marginBottom: 25,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.titulo,
    fontWeight: '700',
    color: COLORS.turquesa,
    fontStyle: 'italic',
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.normal,
    color: '#565656',
  },
  dashboardSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
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
    marginBottom: 4,
  },
  dashboardValue: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '600',
    color: COLORS.turquesa,
  },
  dashboardValueWarning: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '600',
    color: COLORS.rojo,
  },
  dashboardArrow: {
    fontSize: 20,
    color: COLORS.morado,
    fontWeight: '700',
  },
  
  /* ESTILOS DEL MENÚ LATERAL (Específicos de Home) */
  menuPressable: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '75%',
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
  },
  menuItemArrow: {
    fontSize: 16,
    color: '#999',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: COLORS.gris,
    marginVertical: 0,
  },
  menuFeatureSection: {
    paddingVertical: 12,
  },
  menuFeatureTitle: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '700',
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: 14,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  menuFeatureItemLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: 14,
    marginHorizontal: 8,
    borderRadius: 8,
    opacity: 0.7,
  },
  menuFeatureLockIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  upgradeBtn: {
    marginHorizontal: SPACING.content_padding,
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.morado,
    alignItems: 'center',
  },
  upgradeBtnText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  
  /* ESCÁNER Y EVENTOS */
  scannerSection: {
    marginBottom: 20,
  },
  eventoCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.turquesa,
    marginBottom: 12,
  },
  eventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventoTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    flex: 1,
  },
  eventoStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.verde,
  },
  eventoDetails: {
    marginBottom: 16,
  },
  eventoDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventoLabel: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '500',
  },
  eventoValue: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
  },
  eventoValueMoney: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    color: COLORS.naranja,
  },
  eventoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  eventoBtnEdit: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  eventoBtnFinish: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  eventoBtnText: {
    color: COLORS.blanco,
    fontWeight: '600',
    fontSize: FONT_SIZES.normal,
  },
  eventoBtnCreate: {
    borderRadius: 12,
    padding: SPACING.btn_padding,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: COLORS.turquesa,
    marginBottom: 12,
  },
  eventoBtnCreateIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  eventoBtnCreateText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
  },
  eventoBtnCreateSubtext: {
    fontSize: FONT_SIZES.pequeño,
    marginTop: 2,
  },

  /* CREDITOS EN HOME */
  cardContainer: {
    borderLeftWidth: 5,
    borderRadius: 12,
    padding: SPACING.btn_padding,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleSecondary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  creditoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  creditoInfo: {
    flex: 1,
  },
  creditoNombre: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  creditoFecha: {
    fontSize: 12,
    fontWeight: '400',
  },
  creditoMonto: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.rojito,
    marginLeft: 10,
  },
  masCreditos: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});