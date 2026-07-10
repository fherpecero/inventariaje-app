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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { AuthContext } from '../context/AuthContext';

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

const SPACING = 10;

export default function SettingsScreen({
  onNavigate,
  darkMode,
  themeColors,
  onDarkModeChange,
}) {
  const { logout } = useContext(AuthContext);

  const [usuario, setUsuario] = useState({
    nombre: 'Usuario',
    email: 'usuario@inventariaje.com',
  });

  const [notificaciones, setNotificaciones] = useState(true);
  const [idioma, setIdioma] = useState('es');
  const [editingNombre, setEditingNombre] = useState(false);
  const [nombreTemporal, setNombreTemporal] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar usuario de Firestore
      if (auth.currentUser) {
        const userDocRef = doc(db, 'usuarios', auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUsuario({
            nombre: userData.nombre || 'Usuario',
            email: userData.email || auth.currentUser.email,
          });
        }
      }

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

  const guardarUsuario = async (newUsuario) => {
    try {
      const userDocRef = doc(db, 'usuarios', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        nombre: newUsuario.nombre,
      });
      setUsuario(newUsuario);
    } catch (error) {
      console.error('Error guardando usuario:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil');
    }
  };

  const editarNombre = () => {
    setNombreTemporal(usuario.nombre);
    setEditingNombre(true);
  };

  const guardarNombre = () => {
    if (nombreTemporal.trim().length === 0) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    const newUsuario = { ...usuario, nombre: nombreTemporal.trim() };
    guardarUsuario(newUsuario);
    setEditingNombre(false);
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

  const cambiarIdioma = async (nuevoIdioma) => {
    setIdioma(nuevoIdioma);

    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.idioma = nuevoIdioma;
      await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Error guardando idioma:', error);
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.bg }]}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.bg }]}>
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: themeColors.header }]}>
          <TouchableOpacity onPress={() => onNavigate('home')}>
            <Text style={styles.backBtn}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>⚙️ Configuranza</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* CONTENT */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 1. PERFIL DE USUARIO */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              👤 Mi Cuenta
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: themeColors.bgSecondary,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {usuario.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.userInfoContainer}>
                {editingNombre ? (
                  <View style={styles.editingContainer}>
                    <TextInput
                      style={[
                        styles.editInput,
                        {
                          color: themeColors.text,
                          borderColor: themeColors.border,
                          backgroundColor: themeColors.input,
                        },
                      ]}
                      value={nombreTemporal}
                      onChangeText={setNombreTemporal}
                      placeholder="Nombre"
                      placeholderTextColor={themeColors.textSecondary}
                      autoFocus
                    />
                    <View style={styles.editButtons}>
                      <TouchableOpacity
                        style={styles.editSaveBtn}
                        onPress={guardarNombre}
                      >
                        <Text style={styles.editSaveBtnText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editCancelBtn}
                        onPress={() => setEditingNombre(false)}
                      >
                        <Text style={styles.editCancelBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.userName, { color: themeColors.text }]}>
                      {usuario.nombre}
                    </Text>
                    <Text
                      style={[styles.userEmail, { color: themeColors.textSecondary }]}
                    >
                      {usuario.email}
                    </Text>
                    <TouchableOpacity onPress={editarNombre} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>✏️ Editar nombre</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 2. GESTIONAR MIEMBROS (EQUIPO) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              👥 Usuarios
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: themeColors.bgSecondary,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => onNavigate('miembros')}
              >
                <View style={styles.menuContent}>
                  <Text style={styles.menuItemIcon}>👥</Text>

                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuItemText, { color: themeColors.text }]}>
                      Gestionar Usuarios
                    </Text>
                    <Text
                      style={[styles.menuItemSubtext, { color: themeColors.textSecondary }]}
                    >
                      Invita a los miembros de tu inventario
                    </Text>
                  </View>
                </View>

                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>
            </View>
          </View>

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
                    Cambiar a modo oscuro
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

            {/* Idioma */}
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
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 4. ESTADO DE FUNCIONALIDADES */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              📋 Estado de Funcionalidades
            </Text>

            {/* ✅ COMPLETADAS */}
            <View style={styles.featureGroup}>
              <Text style={[styles.featureGroupTitle, { color: themeColors.text }]}>
                ✅ Completadas
              </Text>

              <View
                style={[
                  styles.featureBox,
                  styles.featureCompleted,
                  {
                    backgroundColor: themeColors.bgSecondary,
                    borderColor: '#4CAF50',
                  },
                ]}
              >
                <View style={styles.itemsContainer}>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Registro de entradas y salidas
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Catálogo de Productos
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Autenticación Multi-usuario
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Dashboard con Métricas simples
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Estructura Multi-cuenta en Firestore
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Migración Realtime DB → Firestore
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Menu de existencias y articulos sin stock
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ Gestión de usuarios (crear usuarios adicionales)
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    ✓ 🌚 Modo Oscuro
                  </Text>
                </View>

                <Text style={[styles.featureVersion, { color: themeColors.text }]}>
                  v1.1.2
                </Text>
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
                    🏷️ Descuento por producto (checkout)
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    📥 Registro de ingresos por scanner
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    🎟️ Registro de eventos (scanner party)
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    💸 Gastos y Viaticos (costos por restock y eventos)
                  </Text>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    📊 Analytics & Reportes (ingresos & egresos/profits)
                  </Text>
                </View>

                <Text style={[styles.featureProgreso, { color: themeColors.text }]}>
                  20% completado - v1.4.0
                </Text>
              </View>
            </View>

            {/* 🎯 PRÓXIMAS */}
            <View style={styles.featureGroup}>
              <Text style={[styles.featureGroupTitle, { color: themeColors.text }]}>
                🎯 Próximas (FASE 4+)
              </Text>

              <View
                style={[
                  styles.featureBox,
                  {
                    backgroundColor: themeColors.bgSecondary,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <View style={styles.itemsContainer}>
                  <Text style={[styles.item, { color: themeColors.text }]}>
                    📜 Historial Completo de operaciones
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
          </View>

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
                📱 Versión Actual: v1.3.1
              </Text>
              <Text style={[styles.versionDesc, { color: themeColors.textSecondary }]}>
                Compilada: {new Date().toLocaleDateString('es-MX')}
              </Text>
              <Text style={[styles.versionDesc, { color: themeColors.textSecondary }]}>
                Última actualización: Multi-usuario + Gestión de Miembros
              </Text>
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 6. CERRAR SESIÓN */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.dangerBtn} onPress={cerrarSesion}>
              <Text style={styles.dangerBtnText}>🚪 Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* HEADER */
  header: {
    paddingHorizontal: SPACING,
    paddingVertical: SPACING,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  backBtn: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    color: COLORS.blanco,
  },
  title: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.blanco,
  },

  /* CONTENT */
  content: {
    flex: 1,
    padding: SPACING,
  },

  /* SECCIONES */
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    marginBottom: 10,
  },

  /* USUARIO CARD */
  card: {
    borderRadius: 12,
    padding: SPACING,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.turquesa,
    borderWidth: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  userInfoContainer: {
    flex: 1,
  },
  editingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  editSaveBtn: {
    backgroundColor: COLORS.verde,
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editSaveBtnText: {
    fontSize: 18,
    color: COLORS.blanco,
    fontWeight: '700',
  },
  editCancelBtn: {
    backgroundColor: COLORS.rojo,
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editCancelBtnText: {
    fontSize: 18,
    color: COLORS.blanco,
    fontWeight: '700',
  },
  userName: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    marginBottom: 3,
  },
  userEmail: {
    fontSize: FONT_SIZES.pequeño,
    marginBottom: 8,
  },
  editBtn: {
    backgroundColor: COLORS.turquesa,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  editBtnText: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    color: COLORS.blanco,
  },

  /* MENU ITEM */
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 0,
  },
  menuContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemIcon: {
    fontSize: 24,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemSubtext: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  menuItemArrow: {
    fontSize: 18,
    color: '#999',
    marginLeft: 10,
  },

  /* SETTING ITEMS */
  settingItem: {
    borderRadius: 12,
    padding: SPACING,
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
    fontSize: 24,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: FONT_SIZES.pequeño,
  },

  /* IDIOMA */
  idiomaSection: {
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  idiomaBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  idiomaBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  idiomaBtnText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
  },

  /* FUNCIONALIDADES */
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
    borderWidth: 2,
  },
  featureCompleted: {
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
  },
  featureDeveloping: {
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800',
  },
  itemsContainer: {
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
  },
  featureProgreso: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    color: '#FF9800',
  },

  /* INFORMACIÓN */
  versionInfo: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  versionTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    marginBottom: 8,
    color: COLORS.turquesa,
  },
  versionDesc: {
    fontSize: FONT_SIZES.pequeño,
    marginBottom: 4,
  },

  /* DANGER ZONE */
  dangerBtn: {
    backgroundColor: COLORS.rojo,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerBtnText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    color: COLORS.blanco,
  },
});