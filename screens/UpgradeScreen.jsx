import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES } from '../context/theme';

// Para calcular anchos de tarjetas en row de forma precisa
const { width } = Dimensions.get('window');
// Ancho de pantalla menos padding global (10*2) menos gap entre tarjetas (10) dividido entre 2
const CARD_WIDTH = (width - 20 - 10) / 2; 

export default function UpgradeScreen({ onNavigate, themeColors }) {
  // Estado para seleccionar el plan (por defecto el recomendado)
  const [selectedPlan, setSelectedPlan] = useState('launch'); // 'launch' | 'standard'

  const handleSimularPago = () => {
    const planNombre = selectedPlan === 'launch' ? 'Líder de Lanzamiento ($139/mes)' : 'Estándar ($199/mes)';
    alert(`¡Iniciando checkout de Google/Apple!\n\nPlan seleccionado: ${planNombre}`);
  };

  const comparativa = [
    { feature: 'Registro de inventarios', basic: true, premier: true},
    { feature: 'Registro de ventas', basic: true, premier: true},
    { feature: 'Existencias totales', basic: true, premier: true},
    { feature: 'Productos sin Stock', basic: true, premier: true},
    { feature: 'Usuarios adicionales', basic: true, premier: true},
    { feature: 'Eventos de Escaner', basic: true, premier: true},
    { feature: 'Modulo de Creditos', basic: false, premier: true},
    { feature: 'Modulo de intercambios', basic: false, premier: true},
    { feature: 'Analytics y control de ventas', basic: false, premier: true},
    { feature: 'Reportes descargables', basic: false, premier: true},
    { feature: 'Resguardo seguro de historial en la nube', basic: false, premier: true},
  ];

  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      
      {/* Header oficial estandarizado */}
      <ScreenHeader 
        title="Planes Premium" 
        onPress={() => onNavigate('home')} 
        themeColors={themeColors} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Encabezado Principal */}
        <View style={styles.headerContainer}>
          <Text style={styles.diamondIcon}>💎</Text>
          {/* <Text style={[styles.mainTitle, { color: themeColors.text }]}>
            Conserva el control total de tu negocio
          </Text> */}
          <Text style={[styles.mainSubtitle, { color: themeColors.textSecondary }]}>
            Tu periodo de prueba ha concluido. Conviértete en Líder de Lanzamiento y mantén tus herramientas Profesionales activas.
          </Text>
        </View>

        {/* Tarjetas de Selección de Plan - AHORA EN ROW */}
        <View style={styles.cardsRow}>
          
          {/* Opcion 1: Lanzamiento VIP (Destacada) */}
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setSelectedPlan('launch')}
            style={[
              styles.planCard,
              { backgroundColor: themeColors.cardBg, borderColor: themeColors.border },
              selectedPlan === 'launch' && styles.planCardSelected
            ]}
          >
            <View style={styles.badgeLaunch}>
              <Text style={styles.badgeLaunchText}>⭐ LANZAMIENTO VIP</Text>
            </View>

            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleBox}>
                <Text style={[styles.planTitle, { color: selectedPlan === 'launch' ? COLORS.turquesa : themeColors.text }]}>
                  Líder de Lanzamiento
                </Text>
                <Text style={styles.planSubtitleTurquesa}>Primeros 50 socios</Text>
              </View>

              {/* <View style={[
                styles.radioButton, 
                { borderColor: themeColors.border },
                selectedPlan === 'launch' && styles.radioButtonSelected
              ]}>
                {selectedPlan === 'launch' && <View style={styles.radioInnerDot} />}
              </View> */}
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.strikethroughPrice}>$199</Text>
              <Text style={[styles.amountPrice, { color: themeColors.text }]}>
                $139 <Text style={[styles.periodPrice, { color: themeColors.textSecondary }]}>MXN / mes</Text>
              </Text>
            </View>
            <Text style={[styles.planLegalText, { color: themeColors.textSecondary }]}>
              Precio especial por 3 meses, luego $199 MXN/mes. 
            </Text>
          </TouchableOpacity>

          {/* Opcion 2: Plan Mensual Estándar */}
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setSelectedPlan('standard')}
            style={[
              styles.planCard,
              { backgroundColor: themeColors.cardBg, borderColor: themeColors.border },
              selectedPlan === 'standard' && styles.planCardSelected
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleBox}>
                <Text style={[styles.planTitle, { color: selectedPlan === 'standard' ? COLORS.turquesa : themeColors.text }]}>
                  Plan Premium
                </Text>
                <Text style={[styles.planSubtitle, { color: themeColors.textSecondary }]}>Suscripción por 12 meses</Text>
              </View>

              {/* <View style={[
                styles.radioButton, 
                { borderColor: themeColors.border },
                selectedPlan === 'standard' && styles.radioButtonSelected
              ]}>
                {selectedPlan === 'standard' && <View style={styles.radioInnerDot} />}
              </View> */}
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.strikethroughPrice}>$2,388</Text>
              <Text style={[styles.amountPrice, { color: themeColors.text }]}>
                $1,999 <Text style={[styles.periodPrice, { color: themeColors.textSecondary }]}>MXN / año</Text>
              </Text>
            </View>
            <Text style={[styles.planLegalText, { color: themeColors.textSecondary }]}>
              Suscripción anual. Ahorras 2 meses.
            </Text>
          </TouchableOpacity>
        </View>

          {/* Botón CTA Principal */}
        <TouchableOpacity 
          style={[styles.ctaButton, { backgroundColor: COLORS.turquesa }]} 
          onPress={handleSimularPago}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>
            {selectedPlan === 'launch' ? 'Obtener Plan Líder de Lanzamiento' : 'Obtener Plan Premium Anual'}
          </Text>
        </TouchableOpacity>


        {/* Tabla Comparativa de Funciones */}
        <View style={styles.tableContainer}>
          <Text style={[styles.tableTitle, { color: themeColors.text }]}>
            Funciones Incluidas en la App
          </Text>

          {/* Encabezado de la tabla */}
          <View style={[styles.tableHeader, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.colFeatureTitle, { color: themeColors.textSecondary }]}>Función</Text>
            <Text style={[styles.colHeaderTitle, { color: themeColors.textSecondary }]}>Basic</Text>
            <Text style={styles.colHeaderTitlePremium}>Premium</Text>
          </View>

          {/* Filas comparativas */}
          {comparativa.map((item, index) => (
            <View 
              key={index} 
              style={[
                styles.tableRow, 
                index !== comparativa.length - 1 && { borderBottomColor: themeColors.border, borderBottomWidth: StyleSheet.hairlineWidth }
              ]}
            >
              <Text style={[styles.featureName, { color: themeColors.text }]}>
                {item.feature}
              </Text>
              
              {/* Celda Básico */}
              <View style={styles.cellBox}>
                {item.basic ? (
                  <Ionicons name="checkmark-circle" size={18} color="#888888" />
                ) : (
                  <Ionicons name="close-circle-outline" size={18} color="rgba(150,150,150,0.2)" />
                )}
              </View>

              {/* Celda Premium */}
              <View style={styles.cellBox}>
                {item.premier ? (
                  <Ionicons name="diamond-outline" size={20} color={COLORS.turquesa} />
                ) : (
                  <Ionicons name="close-circle-outline" size={18} color="rgba(150,150,150,0.2)" />
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Opción de Salida */}
        <TouchableOpacity 
          style={styles.cancelBtn} 
          onPress={() => onNavigate('home')}
        >
          <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>
            Continuar con Plan Basic sin cargo adicional
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 10,
    paddingBottom: 60,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30, // Reemplazado SPACING.xl
    marginTop: 10, // Reemplazado SPACING.s
  },
  diamondIcon: {
    fontSize: 45,
    marginBottom: 5, // Reemplazado SPACING.xs
  },
  mainTitle: {
    fontSize: 24, // Reemplazado FONT_SIZES.xl
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 5,
  },
  mainSubtitle: {
    fontSize: 16, // Reemplazado FONT_SIZES.m
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10, // Reemplazado SPACING.s
  },
  // NUEVO CONTENEDOR ROW PARA LAS TARJETAS
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  planCard: {
    width: CARD_WIDTH, // Ancho forzado para que quepan las 2
    borderWidth: 1, 
    borderRadius: 12,
    padding: 12, 
    marginBottom: 5,
    justifyContent: 'space-between', // Separa el header del footer dentro de la tarjeta
    position: 'relative',
    minHeight: 150, // Altura mínima para que ambas se vean del mismo tamaño
  },
  planCardSelected: {
    borderColor: COLORS.turquesa,
    backgroundColor: 'rgba(36, 197, 197, 0.04)', 
    shadowColor: COLORS.turquesa,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeLaunch: {
    position: 'absolute',
    top: -10,
    right: -5, // Se desborda ligeramente para darle estilo
    backgroundColor: COLORS.turquesa,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 2,
  },
  badgeLaunchText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff', 
    letterSpacing: 0.5,
  },
  // Reestructurado para que el radio button quede arriba a la izquierda/derecha
  cardHeaderRow: {
    alignItems: 'center', // Centrado en lugar de row para este tamaño tan pequeño
    marginBottom: 10,
  },
  cardTitleBox: {
    alignItems: 'center', // Textos centrados
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  planSubtitleTurquesa: {
    fontSize: 10,
    color: COLORS.turquesa,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  planSubtitle: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  radioButtonSelected: {
    borderColor: COLORS.turquesa,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.turquesa,
  },
  priceContainer: {
    alignItems: 'center', // Precios centrados en la tarjeta
    marginBottom: 5,
  },
  strikethroughPrice: {
    fontSize: 12,
    color: 'rgba(150,150,150,0.8)',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  amountPrice: {
    fontSize: 22,
    fontWeight: '800',
  },
  periodPrice: {
    fontSize: 10,
    fontWeight: 'normal',
  },
  planLegalText: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  tableContainer: {
    marginBottom: 30, // Eliminados bordes y padding horizontal
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 5,
  },
  colFeatureTitle: {
    flex: 2,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  colHeaderTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  colHeaderTitlePremium: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    color: COLORS.turquesa,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureName: {
    flex: 2,
    fontSize: 12,
    fontWeight: '500',
  },
  cellBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButton: {
    paddingVertical: 15, // Reemplazado SPACING.m
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20, // Reemplazado SPACING.m
    shadowColor: COLORS.turquesa,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 16, // Reemplazado FONT_SIZES.m
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    padding: 10, // Reemplazado SPACING.s
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14, // Reemplazado FONT_SIZES.s
    textDecorationLine: 'underline',
  },
});
