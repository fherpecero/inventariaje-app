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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { AuthContext } from '../context/AuthContext';
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES } from '../context/theme';
import { calculateEffectiveTier } from '../utils/tierUtils';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';

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
      setModalEditVisible(false); 
      Alert.alert('✅ Éxito', 'Nombre actualizado correctamente');
    } else {
      Alert.alert('Error', 'No se pudo guardar: ' + res.error);
    }
  };

  // 💳 REDIRECCIÓN A GOOGLE PLAY / SUSCRIPCIONES (En desarrollo)
  const handleManageSubscription = () => {
    Alert.alert(
      'Suscripción y Planes',
      'La gestión automatizada de planes y pagos estará disponible muy pronto con nuestra pasarela oficial. Por ahora, si necesitas modificar tu suscripción, contáctanos directamente.',
      [{ text: 'Entendido', style: 'default' }]
    );
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
     <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.turquesa} />
      </View>
    );
  }

  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      <ScreenHeader
        title="Configuración"
        onPress={() => onNavigate('home')}
        themeColors={themeColors}
      />

      {/* CONTENT */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 1. PERFIL DE USUARIO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            <FontAwesome6 name="user-gear" size={18} color={themeColors.text} 
            /> Mi Cuenta
          </Text>

          {/* TARJETA 3 COLUMNAS: Minimalista Adaptado */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={abrirModalEdicion}
            style={[
              GLOBAL_STYLES.cardStandard, 
              { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.border }
            ]}
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
            <View style={GLOBAL_STYLES.cardStandardTextContainer}>
              <Text style={[GLOBAL_STYLES.cardStandardValue, { color: themeColors.text}]} numberOfLines={1}>
                {userData?.nombre || 'Usuario'}
              </Text>
              <Text style={[GLOBAL_STYLES.cardStandardTitle, { marginBottom: 4 }]} numberOfLines={1}>
                {userData?.email || 'Sin correo'}
              </Text>
              
              {/* 🛡️ ROL */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {userData?.rol === 'admin' ? (
                  <>
                    <FontAwesome6 name="crown" size={14} color={COLORS.turquesa} />
                    <Text style={{ fontSize: FONT_SIZES.pequeño, fontWeight: '700', color: COLORS.turquesa }}>
                      Admin
                    </Text>
                  </>
                ) : (
                  <>
                    <FontAwesome6 name="user" size={14} color={COLORS.morado} />
                    <Text style={{ fontSize: FONT_SIZES.pequeño, fontWeight: '700', color: COLORS.morado }}>
                      Usuario
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* COLUMNA 3: DETALLES DE CUENTA Y TIER */}
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={[styles.accountId, { color: themeColors.textSecondary }]}>
                ID: {cuentaId || '---'}
              </Text>
              <Text style={{ fontSize: 20, marginBottom: 2 }}>
                {effectiveTier === 'premium' ? '💎' : '🪩'}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: effectiveTier === 'premium' ? COLORS.turquesa : themeColors.textSecondary }}>
                {effectiveTier === 'premium' ? 'PREMIUM' : 'BASIC'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 💳 BOTÓN DE PAUSAR / ADMINISTRAR SUSCRIPCIÓN (Solo visible para Admin) */}
          {userData?.rol === 'admin' && (
            <View style={styles.subscriptionContainer}>
              <TouchableOpacity 
                style={styles.btnManageSub}
                activeOpacity={0.8}
                onPress={handleManageSubscription}
              >
                <Ionicons name="logo-google-playstore" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.btnManageSubText}>Administrar Suscripción</Text>
              </TouchableOpacity>
              <Text style={[styles.subHint, { color: themeColors.textSecondary }]}>
                Pausa o cancela tu suscripción en Google Play. Mantendrás el acceso al plan Basic.
              </Text>
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. GESTIONAR USUARIOS (SOLO ADMINS) - USANDO CARD STANDARD */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {userData?.rol === 'admin' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              <FontAwesome6 name="users" size={18} color={themeColors.text} 
              /> Usuarios
            </Text>

            <TouchableOpacity 
              style={[GLOBAL_STYLES.cardStandard, { backgroundColor: themeColors.bgSecondary }]} 
              onPress={() => onNavigate('miembros')}
              activeOpacity={0.7}
            >
              <View style={GLOBAL_STYLES.cardStandardContent}>
                <FontAwesome6 name="user-plus" size={18} color={themeColors.textSecondary} style={GLOBAL_STYLES.cardStandardIcon} />
                <View style={GLOBAL_STYLES.cardStandardTextContainer}>
                  <Text style={GLOBAL_STYLES.cardStandardTitle}>Invita o administra socios</Text>
                  <Text style={[GLOBAL_STYLES.cardStandardValue, { color: themeColors.text, fontSize: 16 }]}>Gestionar Usuarios</Text>
                </View>
              </View>
              <Text style={GLOBAL_STYLES.cardStandardArrow}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. PREFERENCIAS - USANDO CARD STANDARD */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            <Ionicons name="settings" size={18} color="black" 
            /> Preferencias
          </Text>

          {/* Dark Mode */}
          <View style={[GLOBAL_STYLES.cardStandard, { backgroundColor: themeColors.bgSecondary }]}>
            <View style={GLOBAL_STYLES.cardStandardContent}>
              <Text style={GLOBAL_STYLES.cardStandardIcon}>
                <Ionicons name="moon-outline" size={18} color="black" /></Text>
              <View style={GLOBAL_STYLES.cardStandardTextContainer}>
                <Text style={GLOBAL_STYLES.cardStandardTitle}>Cambiar el tema visual</Text>
                <Text style={[GLOBAL_STYLES.cardStandardValue, { color: themeColors.text, fontSize: 16 }]}>
                  Modo Oscuro</Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={onDarkModeChange}
              trackColor={{ false: '#ddd', true: COLORS.turquesa }}
              thumbColor={darkMode ? COLORS.turquesa : '#f4f3f4'}
            />
          </View>

          {/* Alertas */}
          <TouchableOpacity
            style={[GLOBAL_STYLES.cardStandard, { backgroundColor: themeColors.bgSecondary }]}
            onPress={() => { effectiveTier === 'premium' ? onNavigate('alertas') : onNavigate('upgrade'); }}
            activeOpacity={0.7}
          >
            <View style={GLOBAL_STYLES.cardStandardContent}>
              <Text style={GLOBAL_STYLES.cardStandardIcon}><Ionicons name="notifications-outline" size={18} color="black" /></Text>
              <View style={GLOBAL_STYLES.cardStandardTextContainer}>
                <Text style={GLOBAL_STYLES.cardStandardTitle}>Configurar límites y avisos</Text>
                <Text style={[GLOBAL_STYLES.cardStandardValue, { color: themeColors.text, fontSize: 16 }]}>Alertas de Inventario</Text>
              </View>
            </View>
            <Text style={GLOBAL_STYLES.cardStandardArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4. ESTADO DE FUNCIONALIDADES */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>📋 Funcionalidades</Text> */}

          {/* EN DESARROLLO */}
          {/* <View style={[styles.featureBox, styles.featureDeveloping, { backgroundColor: themeColors.bgSecondary, borderColor: '#E2E8F0' }]}>
            <Text style={styles.featureGroupTitle}>🔨 En Desarrollo</Text>
            <Text style={[styles.item, { color: themeColors.text }]}>🎨 Mejora de UX</Text>
            <Text style={[styles.item, { color: themeColors.text }]}>🍏 Desarrollo para iOS</Text>
            <Text style={[styles.item, { color: themeColors.text }]}>🇺🇸 Idiomas</Text>
            <Text style={styles.featureProgreso}>30% completado - v2.6.0</Text>
          </View> */}

          {/* COMPLETADAS */}
          {/* <View style={[styles.featureBox, styles.featureCompleted, { backgroundColor: themeColors.bgSecondary, borderColor: '#E2E8F0' }]}>
            <Text style={styles.featureGroupTitle}>✅ Completadas</Text>
            <Text style={styles.featureVersion}>Fase 1 a 4</Text>
            <Text style={[styles.item, { color: themeColors.text }]}>✓ Dashboard, Inventario y Base de Datos RT</Text>
            <Text style={[styles.item, { color: themeColors.text }]}>✓ Multiusuario y Tiers (Basic/Premium)</Text>
            <Text style={[styles.item, { color: themeColors.text }]}>✓ Scanner Party y Ventas a Crédito</Text>
            <Text style={[styles.item, { color: themeColors.text }]}>✓ Intercambios y Bono Influencer</Text>
            <Text style={[styles.item, { color: themeColors.text }]}>✓ Reportes Analytics avanzados y CSV</Text>
          </View>
        </View> */}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 5. INFORMACIÓN */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <View style={GLOBAL_STYLES.cardStandardTextContainer}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            <FontAwesome6 name="circle-info" size={18} color="black"
            /> Información</Text>
          <View style={[styles.featureBox, { backgroundColor: themeColors.bgSecondary, borderColor: '#E2E8F0' }]}>
            <Text style={[styles.versionTitle, { color: COLORS.turquesa }]}>Versión Actual: v2.5.1</Text>
            <Text style={[styles.versionDesc, { color: themeColors.textSecondary }]}>Compilada: 01/09/2026</Text>
            <Text style={[styles.versionDesc, { color: themeColors.textSecondary }]}>Última actualización: Minimalist UI, Bug fixes, Offline mode.</Text>
          </View>
        </View>

        {/* CERRAR SESIÓN */}
        <View style={styles.section}>
          <TouchableOpacity style={GLOBAL_STYLES.btnDanger} onPress={cerrarSesion}>
            <Text style={GLOBAL_STYLES.btnText}><Ionicons name="log-out" size={18} color="white" 
            /> Cerrar Sesión</Text>
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
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Editar Nombre</Text>
            
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
                  <Text style={GLOBAL_STYLES.btnText}><Ionicons name="save-outline" size={18} color="white" 
                  /> Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// 📐 STYLESHEET ESTRUCTURAL (LIMPIADO Y MINIMALISTA)
const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: SPACING.content_padding,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    marginBottom: 12,
  },

  /* CARD 3 COLUMNAS (Perfil) - Adaptado al Minimalist Look */
  card3Col: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    // Sombra sutil plana
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
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
  colCuenta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0', // Borde interior gris suave
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

  /* GESTIÓN DE SUSCRIPCIÓN */
  subscriptionContainer: {
    marginTop: 5,
  },
  btnManageSub: {
    backgroundColor: COLORS.turquesa,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  btnManageSubText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  subHint: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  /* FUNCIONALIDADES E INFORMACIÓN (Adaptado al Minimalist Look) */
  featureBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  featureCompleted: {
    borderLeftWidth: 4, // Borde izquierdo sutil indicador
    borderLeftColor: '#4CAF50',
  },
  featureDeveloping: {
    borderLeftWidth: 4, // Borde izquierdo sutil indicador
    borderLeftColor: '#FF9800',
  },
  featureGroupTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    color: '#64748B', // Gris profesional
    marginBottom: 8,
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
    marginBottom: 8,
  },
  featureProgreso: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    color: '#FF9800',
    marginTop: 6,
  },
  versionTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    marginBottom: 6,
  },
  versionDesc: {
    fontSize: FONT_SIZES.pequeño,
    marginBottom: 4,
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
});