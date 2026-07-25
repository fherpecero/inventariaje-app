import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { AuthContext } from '../context/AuthContext';
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES } from '../context/theme';
import { calculateEffectiveTier } from '../utils/tierUtils';


export default function SettingsScreen({
  onNavigate,
  darkMode,
  themeColors,
  onDarkModeChange,
}) {
  const { userData, cuenta, cuentaId, actualizarPerfil, logout } = useContext(AuthContext);

  const [notificaciones, setNotificaciones] = useState(true);
  const [idioma, setIdioma] = useState('es');
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [nombreTemporal, setNombreTemporal] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [loadingGuardar, setLoadingGuardar] = useState(false);

  // 💎 Cálculo dinámico del TIER de la cuenta
  const effectiveTier = calculateEffectiveTier(
    cuenta?.tier,
    cuenta?.premiumTrialActive,
    cuenta?.trialStartDate
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar preferencias
      try {
        const savedSettings = await AsyncStorage.getItem('appSettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setNotificaciones(settings.notificaciones !== false);
          setIdioma(settings.idioma || 'es');
        }
      } catch (error) {
        console.warn('AsyncStorage appSettings ignorado');
      }
    } finally {
      setLoading(false);
    }
  };

    const abrirModalEdicion = () => {
    setNombreTemporal(userData?.nombre || '');
    setModalEditVisible(true);
  };

  // ✏️ ACTUALIZACIÓN CENTRALIZADA: Llama a AuthContext
  const handleGuardarNombre = async () => {
    if (!nombreTemporal.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    setLoadingGuardar(true);
    const res = await actualizarPerfil(nombreTemporal);
    setLoadingGuardar(false);

    if (res.success) {
      // ✅ AHORA SÍ: Apagamos el estado correcto del Modal
      setModalEditVisible(false); 
      Alert.alert('✅ Éxito', 'Nombre actualizado correctamente');
    } else {
      Alert.alert('Error', 'No se pudo guardar: ' + res.error);
    }
  };

  const toggleNotificaciones = async () => {
    const newValue = !notificaciones;
    setNotificaciones(newValue);

    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.notificaciones = newValue;
      await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Error guardando notificaciones:', error);
    }
  };

  // const cambiarIdioma = async (nuevoIdioma) => {
  //   setIdioma(nuevoIdioma);

  //   try {
  //     const savedSettings = await AsyncStorage.getItem('appSettings');
  //     const settings = savedSettings ? JSON.parse(savedSettings) : {};
  //     settings.idioma = nuevoIdioma;
  //     await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
  //   } catch (error) {
  //     console.warn('Error guardando idioma:', error);
  //   }
  // };

  const cerrarSesion = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          onPress: async () => {
            try {
              await signOut(auth);
              logout();
              onNavigate('login');
              Alert.alert('Sesión cerrada');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar la sesión: ' + error.message);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
     <SafeAreaView style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.turquesa} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      <ScreenHeader
        title="⚙️ Configuranza"
        onBackPress={() => onNavigate('home')}
        themeColors={themeColors}
      />

        {/* CONTENT */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 1. PERFIL DE USUARIO */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              👤 Mi Cuenta
            </Text>

            <TouchableOpacity
            activeOpacity={0.7}
            onPress={abrirModalEdicion}
            style={[styles.card3Col, { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.border }]}
          >
            {/* COLUMNA 1: AVATAR */}
            <View style={styles.colAvatar}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {userData?.nombre ? userData.nombre.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            </View>

            {/* COLUMNA 2: DETALLES DE USUARIO */}
            <View style={styles.colInfo}>
              <Text style={[styles.userName, { color: themeColors.text }]} numberOfLines={1}>
                {userData?.nombre || 'Usuario'}
              </Text>
              <Text style={[styles.userEmail, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {userData?.email || 'Sin correo'}
              </Text>
              
              {/* 🛡️ TEXTO NORMAL PARA EL ROL (Sin Badge) */}
              <Text style={{ fontSize: FONT_SIZES.pequeño, fontWeight: '700', color: userData?.rol === 'admin' ? COLORS.morado : COLORS.turquesa }}>
                {userData?.rol === 'admin' ? '👑 Admin' : '👥 User'}
              </Text>
            </View>

            {/* COLUMNA 3: DETALLES DE CUENTA Y TIER */}
            <View style={styles.colCuenta}>
              <Text style={[styles.accountId, { color: themeColors.textSecondary }]}>
                ID: {cuentaId || '---'}
              </Text>
              <Text style={styles.tierEmoji}>
                {effectiveTier === 'premium' ? '💎' : '🪩'}
              </Text>
              <Text style={[styles.tierLabel, { color: effectiveTier === 'premium' ? COLORS.turquesa : COLORS.textSecondary }]}>
                {effectiveTier === 'premium' ? 'PREMIUM' : 'BASIC'}
              </Text>
            </View>
            </TouchableOpacity>


          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 2. GESTIONAR USUARIOS (SOLO VISIBLE PARA ADMINS) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {userData?.rol === 'admin' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              👥 Usuarios</Text>
            <View style={[styles.cardSimple, { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.border }]}>
              <TouchableOpacity style={styles.menuItem} onPress={() => onNavigate('miembros')}>
                <View style={styles.menuContent}>
                  <Text style={styles.menuItemIcon}>👥</Text>
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuItemText, { color: themeColors.text }]}>Gestionar Usuarios</Text>
                    <Text style={[styles.menuItemSubtext, { color: themeColors.textSecondary }]}>
                      Invita o administra los socios de tu cuenta
                    </Text>
                  </View>
                </View>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 3. PREFERENCIAS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              🎨 Preferencias
            </Text>

            {/* Dark Mode */}
            <View
              style={[
                styles.settingItem,
                {
                  backgroundColor: themeColors.bgSecondary,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🌚</Text>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                    Modo Oscuro
                  </Text>
                  <Text style={[styles.settingDesc, { color: themeColors.textSecondary }]}>
                    Cambiar el tema visual
                  </Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={onDarkModeChange}
                trackColor={{ false: '#ddd', true: COLORS.turquesa }}
                thumbColor={darkMode ? COLORS.turquesa : '#f4f3f4'}
              />
            </View>

            {/* Notificaciones Push */}
            <View
              style={[
                styles.settingItem,
                {
                  backgroundColor: themeColors.bgSecondary,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📬</Text>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: themeColors.text }]}>
                    Notificaciones Push
                  </Text>
                  <Text style={[styles.settingDesc, { color: themeColors.textSecondary }]}>
                    Alertas de inventario bajo
                  </Text>
                </View>
              </View>
              <Switch
                value={notificaciones}
                onValueChange={toggleNotificaciones}
                trackColor={{ false: '#ddd', true: COLORS.turquesa }}
                thumbColor={notificaciones ? COLORS.turquesa : '#f4f3f4'}
              />
              </View>
            </View>

            {/* Idioma
            <View style={styles.idiomaSection}>
              <Text
                style={[styles.settingLabel, { color: themeColors.text, marginBottom: 10 }]}
              >
                🌍 Idioma
              </Text>
              <View style={styles.idiomaBtns}>
                <TouchableOpacity
                  style={[
                    styles.idiomaBtn,
                    {
                      backgroundColor:
                        idioma === 'es'
                          ? 'rgba(26, 158, 161, 0.1)'
                          : themeColors.bgSecondary,
                      borderColor: idioma === 'es' ? COLORS.turquesa : themeColors.border,
                    },
                  ]}
                  onPress={() => cambiarIdioma('es')}
                >
                  <Text style={[styles.idiomaBtnText, { color: themeColors.text }]}>
                    🇲🇽 Español
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.idiomaBtn,
                    {
                      backgroundColor:
                        idioma === 'en'
                          ? 'rgba(26, 158, 161, 0.1)'
                          : themeColors.bgSecondary,
                      borderColor: idioma === 'en' ? COLORS.turquesa : themeColors.border,
                    },
                  ]}
                  onPress={() => cambiarIdioma('en')}
                >
                  <Text style={[styles.idiomaBtnText, { color: themeColors.text }]}>
                    🇺🇸 English
                  </Text>
                </TouchableOpacity>
              </View>
            </View> */}
          </View>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 4. ESTADO DE FUNCIONALIDADES */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>📋 Estado de Funcionalidades</Text>

          <View style={styles.featureGroup}>
            <Text style={[styles.featureGroupTitle, { color: themeColors.text }]}>✅ Completadas</Text>
            <View style={[styles.featureBox, styles.featureCompleted, { backgroundColor: themeColors.bgSecondary }]}>
               {/* FASE 1-2 */}
              <Text style={[styles.featureVersion, { color: themeColors.text }]}>
                  Fase 1-2 </Text>
              <Text style={[styles.item, { color: themeColors.text }]}>✓ Dashboard de Inicio</Text>
              <Text style={[styles.item, { color: themeColors.text }]}>✓ Control de Inventario y productos</Text>
              <Text style={[styles.item, { color: themeColors.text }]}>✓ Gestión de Cuentas</Text>
              <Text style={[styles.item, { color: themeColors.text }]}>✓ Base de datos en la nube (real time)</Text>

               {/* FASE 3 */}
               <Text style={[styles.featureVersion, { color: themeColors.text }]}>
                  Fase 3 </Text>
               <Text style={[styles.item, { color: themeColors.text }]}>✓ Infraestructura multiusuario</Text>
               <Text style={[styles.item, { color: themeColors.text }]}>✓ Tier management (version basic & premium)</Text>     
                    
                {/* FASE 4 */}
                  <Text style={[styles.featureVersion, { color: themeColors.text }]}>
                  Fase 4 | Funciones Premium
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Registro de Escaner (Scanner Party)
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Ventas a credito
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Modulo de intercambio de productos (socios)
                  </Text>
                </View>
              </View>
            </View>

            {/* 🔨 EN DESARROLLO */}
            <View style={styles.featureGroup}>
              <Text style={[styles.featureGroupTitle, { color: themeColors.text }]}>
                🔨 En Desarrollo
              </Text>

              <View
                style={[
                  styles.featureBox,
                  styles.featureDeveloping,
                  {
                    backgroundColor: themeColors.bgSecondary,
                    borderColor: '#FF9800',
                  },
                ]}
              >
                <View style={styles.itemsContainer}>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    🏷️ Descuento por producto (checkout)/Bono influencer (entradas)
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    📊 Analytics & Reportes (ingresos & egresos/profits)
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    🎨 Rediseño de imagen 
                  </Text>
                </View>

                <Text style={[styles.featureProgreso, { color: themeColors.text }]}>
                  40% completado - v2.3.0
                </Text>
              </View>
            </View>

            {/* 🎯 PRÓXIMAS
            <View style={styles.featureGroup}>
              <Text style={[styles.featureGroupTitle, { color: themeColors.text }]}>
                🎯 Próximas (FASE 5)
              </Text>

              <View
                style={[
                  styles.featureBox,
                  {
                    backgroundColor: themeColors.bgSecondary,
                    borderColor: COLORS.morado,
                  },
                ]}
              >
                <View style={styles.itemsContainer}>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    📜 Historial Completo de operaciones
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    💸 Gastos y Viaticos (costos por restock y eventos)
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ⚠️ Alertas de Restock automáticas
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    💳 Integración de Pagos - Stripe/Mercado Pago
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    🌐 Backoffice Web para administración
                  </Text>
                </View>

                <Text style={[styles.featureVersion, { color: themeColors.text }]}>
                  Planeado
                </Text>
              </View>
            </View>
          </View> */}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 5. INFORMACIÓN */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              ℹ️ Información
            </Text>

            <View
              style={[
                styles.versionInfo,
                {
                  backgroundColor: themeColors.bgSecondary,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <Text style={[styles.versionTitle, { color: themeColors.text }]}>
                📱 Versión Actual: v2.2.1
              </Text>
              <Text style={[styles.versionDesc, { color: themeColors.textSecondary }]}>
                Compilada: '23/07/2026',
              </Text>
              <Text style={[styles.versionDesc, { color: themeColors.textSecondary }]}>
                Última actualización: Escaner + Creditos + Intercambios | Rediseño UX
              </Text>
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 6. CERRAR SESIÓN */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.section}>
          <TouchableOpacity style={GLOBAL_STYLES.btnDanger} onPress={cerrarSesion}>
            <Text style={GLOBAL_STYLES.btnText}>🚪 Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ✏️ MODAL: EDICIÓN RÁPIDA DE NOMBRE */}
      <Modal
        visible={modalEditVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.bgSecondary }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>✏️ Editar Nombre</Text>
            
            <TextInput
              style={[GLOBAL_STYLES.inputBase, { backgroundColor: themeColors.input, color: themeColors.text, borderColor: themeColors.border, marginBottom: 20 }]}
              value={nombreTemporal}
              onChangeText={setNombreTemporal}
              placeholder="Ingresa tu nombre"
              placeholderTextColor={themeColors.textSecondary}
              autoFocus
              editable={!loadingGuardar}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]}
                onPress={() => setModalEditVisible(false)}
                disabled={loadingGuardar}
              >
                <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf]}
                onPress={handleGuardarNombre}
                disabled={loadingGuardar}
              >
                {loadingGuardar ? (
                  <ActivityIndicator color={COLORS.blanco} />
                ) : (
                  <Text style={GLOBAL_STYLES.btnText}>💾 Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    
  );
}

// 📐 STYLESHEET ESTRUCTURAL
const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    marginBottom: 10,
  },
  hintText: {
    fontSize: FONT_SIZES.pequeño,
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
  },

  /* CARD 3 COLUMNAS */
  card3Col: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.turquesa,
  },
  colAvatar: {
    marginRight: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.morado,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  colInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  userName: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: FONT_SIZES.pequeño,
    marginBottom: 6,
  },
  badgeRol: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: COLORS.blanco,
    fontSize: 10,
    fontWeight: '700',
  },
  colCuenta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(150,150,150,0.2)',
    minWidth: 70,
  },
  accountId: {
    fontSize: 10,
    fontWeight: '700',
  },
  tierEmoji: {
    fontSize: 22,
    marginVertical: 2,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* ITEMS Y MENÚS */
  cardSimple: {
    borderRadius: 12,
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  menuContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemIcon: {
    fontSize: 22,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItemSubtext: {
    fontSize: FONT_SIZES.pequeño,
    fontStyle: 'italic',
  },
  menuItemArrow: {
    fontSize: 18,
    color: '#999',
  },

  /* PREFERENCIAS */
  settingItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.turquesa,
    borderWidth: 1,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: FONT_SIZES.pequeño,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '90%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  settingLabel: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: FONT_SIZES.pequeño,
  },
  featureGroup: {
    marginBottom: 16,
  },
  featureGroupTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    marginBottom: 10,
    paddingLeft: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.turquesa,
    paddingVertical: 8,
  },
  featureBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  featureCompleted: {
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  featureDeveloping: {
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800',
    borderColor: '#FF9800',
  },
  item: {
    fontSize: FONT_SIZES.pequeño,
    marginBottom: 6,
    lineHeight: 18,
  },
  featureVersion: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 6,
  },
  featureProgreso: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    color: '#FF9800',
    marginTop: 8,
  },
  /* INFORMACIÓN */
  versionInfo: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 10 },
  versionTitle: { fontSize: FONT_SIZES.normal, fontWeight: '700', marginBottom: 8, color: COLORS.turquesa },
  versionDesc: { fontSize: FONT_SIZES.pequeño, marginBottom: 4 },
});