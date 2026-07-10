import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useContext } from 'react';
import { getTimestamp } from '../utils/utils';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  LogBox,
} from 'react-native';

import { collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, query, where  } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import ModalRegistroEscaner from '../components/ModalRegistroEscaner';
import { hasAccessToFeature, calculateEffectiveTier, getTrialInfo } from '../utils/tierUtils';
import FeatureLocked from '../components/FeatureLocked';

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

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
      header: COLORS.turquesa,
      border: '#e0e0e0',
      input: COLORS.blanco,
      cardBg: COLORS.blanco,
    };
  }
};

export default function HomeScreen({ onNavigate, darkMode, themeColors }) {
  const { user, cuenta } = useContext(AuthContext);
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState({
    totalEnExistencia: 0,
    productosSinStock: 0,
    ventasDelMes: 0,
    ultimasOperaciones: [],
  });
  const [loading, setLoading] = useState(true);
  const [modalEscanerVisible, setModalEscanerVisible] = useState(false);
  const [escanerActual, setEscanerActual] = useState(null);
  const [loadingEscaner, setLoadingEscaner] = useState(false);
  const [canUseScanner, setCanUseScanner] = useState(false);
  const [canUseAnalytics, setCanUseAnalytics] = useState(false);
  const [canUseClientes, setCanUseClientes] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState('basic');
  const [trialInfo, setTrialInfo] = useState(null);
  const [canUseAlertas, setCanUseAlertas] = useState(false);


  useEffect(() => {
    if (cuenta) {
    cargarEscanerActual();
    cargarAccesoAFeatures(); 
    }
  }, [cuenta]);

  useEffect(() => {
    cargarTierEfectivo();
  }, [user]);

  const cargarTierEfectivo = async () => {
    if (!user || !cuenta) return;
    try {
      const tier = await calculateEffectiveTier(user.uid, cuenta);
      const trial = await getTrialInfo(user.uid);
      
      setEffectiveTier(tier);
      setTrialInfo(trial);
    } catch (error) {
      console.error('❌ Error cargando tier:', error);
    }
  };

  const cargarEscanerActual = async () => {
  try {
    // 1️⃣ CONSULTAR FIRESTORE: obtener el evento escáner activo
    const escanerRef = collection(db, 'cuentas', cuenta.toString(), 'escaneres');
    const q = query(escanerRef, where('estado', '==', 'activo'));
    const escanerSnap = await getDocs(q);

    if (!escanerSnap.empty) {
      const firestoreData = escanerSnap.docs[0].data();
      const docId = escanerSnap.docs[0].id;

      const escanerData = {
        evento: firestoreData.evento,
        fechaFormato: firestoreData.fecha,        // ← fecha → fechaFormato
        fecha: firestoreData.fechaISO,            // ← fechaISO → fecha
        invitados: firestoreData.personas || 0,   // ← personas → invitados
        monto: firestoreData.montoCobrado || 0,   // ← montoCobrado → monto
        cantidad: firestoreData.cantidad || 0,
        ventaTotal: firestoreData.ventaTotal || 0,
        id: firestoreData.id,
        docId: docId,
      };
       

      // 2️⃣ GUARDAR EN ASYNCSTORAGE como cache
      await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerData));
      setEscanerActual(escanerData);
      console.log('✅ Escáner cargado desde Firestore:', escanerData.evento);
    } else {
      console.log('ℹ️ No hay escáner activo');
      setEscanerActual(null);
    }
  } catch (error) {
    console.error('❌ Error cargando escáner:', error);
  }
};

  const cargarAccesoAFeatures = async () => {
    try {
      const tieneScanner = await hasAccessToFeature('scanner');
      const tieneAnalytics = await hasAccessToFeature('analytics');
      const tieneClientes = await hasAccessToFeature('clientes');
      const tieneAlertas = await hasAccessToFeature('alertas');

      setCanUseScanner(tieneScanner);
      setCanUseAnalytics(tieneAnalytics);
      setCanUseClientes(tieneClientes);
      setCanUseAlertas(tieneAlertas);

      console.log('✅ Acceso a features cargado');
    } catch (error) {
      console.error('❌ Error cargando features:', error);
    }
  };

  const handleConfirmarEscaner = async (datosEscaner) => {
    try {
      const escanerGuardado = await AsyncStorage.getItem('escanerActual');
      
      if (escanerGuardado) {
        const escanerActivo = JSON.parse(escanerGuardado);

        if (datosEscaner.evento === escanerActivo.evento) {

           // ✅ AGREGAR: Actualizar Firestore
            const escanerRef = doc(db, 'cuentas', cuenta.toString(), 'escaneres', escanerActivo.docId);
            await updateDoc(escanerRef, {
              evento: datosEscaner.evento,
              fecha: datosEscaner.fechaFormato,
              fechaISO: datosEscaner.fecha,
              personas: datosEscaner.invitados || 0,
              montoCobrado: datosEscaner.monto || 0,
            });

             const escanerActualizado = {
            ...datosEscaner,
            id: escanerActivo.id,
            cantidad: escanerActivo.cantidad,
            ventaTotal: escanerActivo.ventaTotal,
          };

          await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerActualizado));
          setEscanerActual(escanerActualizado);
          setModalEscanerVisible(false);
          
          Alert.alert('✅ Evento Actualizado');
          return;
        } else {
          Alert.alert(
            '⚠️ Escáner Activo',
            `Ya tienes un evento activo:\n\n"${escanerActivo.evento}"\n\nDebes finalizarlo antes de crear uno nuevo.`,
            [
              { text: 'Ir al evento', onPress: () => setModalEscanerVisible(false) },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
          return;
        }
      }

      setLoadingEscaner(true);

      const escanerId = `${datosEscaner.evento.replace(/\s+/g, '-').toLowerCase()}-${new Date().getTime()}`;
      const escanerConId = {
        ...datosEscaner,
        id: escanerId,
      };

      await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerConId));

      const escanerRef = collection(
        db,
        'cuentas',
        cuenta.toString(),
        'escaneres'
      );

      const docRef = await addDoc(escanerRef, {
        id: escanerId,
        evento: datosEscaner.evento,
        fecha: datosEscaner.fechaFormato,
        fechaISO: datosEscaner.fecha,
        personas: datosEscaner.invitados || 0,
        montoCobrado: datosEscaner.monto || 0,
        cantidad: 0,
        ventaTotal: 0,
        estado: 'activo',
        timestamp: new Date().toISOString(),
      });

      setEscanerActual(escanerConId);
      
      console.log('🔵 DEBUG - Estado actualizado a:', escanerConId.evento);

      Alert.alert(
        '✅ Evento Registrado',
        `Evento: ${datosEscaner.evento}\nFecha: ${datosEscaner.fechaFormato}\nVenta Total: $${datosEscaner.ventaTotal}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setModalEscanerVisible(false);
            },
          },
        ]
      );

    } catch (error) {
      console.error('❌ Error guardando escáner:', error);
      Alert.alert('Error', 'No se pudo guardar: ' + error.message);
    } finally {
      setLoadingEscaner(false);
    }
  };

  const handleFinalizarEscaner = async () => {
    if (!escanerActual) return;

    Alert.alert(
      '💻 Finalizar Evento',
      `¿Cerrar "${escanerActual.evento}"?\n\nVentas: ${escanerActual.cantidad || 0}\nTotal: $${escanerActual.ventaTotal || 0}`,
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Terminar',
          onPress: async () => {
            try {
              setLoadingEscaner(true);

              const finalizadosRef = collection(
                db,
                'cuentas',
                cuenta.toString(),
                'escaneres_finalizados'
              );

              const escanerFinalizado = {
                evento: escanerActual.evento,
                fecha: escanerActual.fechaFormato,
                fechaISO: escanerActual.fecha,
                personas: escanerActual.invitados || 0,
                montoCobrado: escanerActual.monto || 0,
                cantidadVentas: escanerActual.cantidad || 0,
                totalVentas: escanerActual.ventaTotal || 0,
                horaFin: new Date().toISOString(),
                estado: 'finalizado',
                finalizadoEn: new Date().toISOString(),
              };

              console.log('📝 Guardando evento finalizado:', escanerFinalizado);

              const docRef = await addDoc(finalizadosRef, escanerFinalizado);
              console.log('✅ Evento guardado:', docRef.id);

              await AsyncStorage.removeItem('escanerActual');
              setEscanerActual(null);

              Alert.alert(
                '✅ Evento Finalizado',
                `"${escanerActual.evento}" guardado en Analytics`
              );

            } catch (error) {
              console.error('❌ Error:', error.message);
              Alert.alert('Error', error.message);
            } finally {
              setLoadingEscaner(false);
            }
          },
        },
      ]
    );
  };

    const finalizadosRef = collection(
    db,
    'cuentas',
    cuenta.toString(),
    'escaneres_finalizados'
  );

  try {
  const docRef = await addDoc(finalizadosRef, escanerFinalizado);
  console.log('✅ Evento guardado:', docRef.id);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }


  // ✅ ACTUALIZAR el documento original a finalizado
  const escanerRef = doc(db, 'cuentas', cuenta.toString(), 'escaneres', escanerActual.id);
  await updateDoc(escanerRef, {
    estado: 'finalizado',
    finalizadoEn: new Date().toISOString(),
  });

  await AsyncStorage.removeItem('escanerActual');
  setEscanerActual(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user && cuenta) {
      cargarEstadisticas();
    }
  }, [user, cuenta]);

  const cargarEstadisticas = async () => {
    if (!isMountedRef.current) return;
    try {
      if (isMountedRef.current) setLoading(true);

      console.log('📊 Cargando estadísticas para:', { userId: user.uid, cuentaId: cuenta });

      // ========================================
      // 1. OBTENER INVENTARIO
      // ========================================
      const docRef = doc(
        db,
        'cuentas',
        cuenta.toString(),
        'inventarios',
        'vital_health_principal'
      );
      const docSnap = await getDoc(docRef);

      const productos = docSnap.data()?.productos || {};
      
      console.log('📦 Productos encontrados:', Object.keys(productos).length);

      const catalogoRef = collection(db, 'catalogoGlobal');
      const catalogoSnap = await getDocs(catalogoRef);

      const inventarioMap = {};
      Object.keys(productos).forEach((codigo) => {
        inventarioMap[codigo] = productos[codigo].cantidad || 0;
      });

      let totalEnExistencia = 0;
      let productosSinStock = 0;

      catalogoSnap.forEach((doc) => {
        const cantidad = inventarioMap[doc.id] || 0;
        totalEnExistencia += cantidad;

        if (cantidad === 0) {
          productosSinStock += 1;
        }
      });

      console.log('✅ Inventario cargado:', totalEnExistencia, 'unidades');
      console.log('⚠️ Productos sin stock:', productosSinStock, '/ 32');

      // ========================================
      // 2. CALCULAR VENTAS DEL MES EN CURSO
      // ========================================
      const ahora = new Date();
      const primerDiaDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const ultimoDiaDelMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

      console.log('📅 Rango de mes:', {
        desde: primerDiaDelMes.toISOString(),
        hasta: ultimoDiaDelMes.toISOString(),
      });

      const salidasRef = collection(
        db,
        'cuentas',
        cuenta.toString(),
        'salidas'
      );

      const salidasSnap = await getDocs(salidasRef);

      let ventasDelMes = 0;
      const ultimasOperaciones = [];

      salidasSnap.forEach((doc) => {
        const data = doc.data();
        const timestampStr = data.timestamp;

        if (timestampStr) {
          const timestampDate = new Date(timestampStr);

          if (
            timestampDate >= primerDiaDelMes &&
            timestampDate <= ultimoDiaDelMes
          ) {
            const total = parseFloat(data.total) || 0;
            ventasDelMes += total;

            ultimasOperaciones.push({
              producto: data.producto,
              cantidad: data.cantidad,
              total: total,
              timestamp: timestampStr,
              tipo: 'salida',
            });

            console.log('🛒 Venta contabilizada:', {
              fecha: timestampStr,
              total: total,
              acumulado: ventasDelMes,
            });
          }
        }
      });

      ultimasOperaciones.sort((a, b) => {
        const fechaA = new Date(a.timestamp);
        const fechaB = new Date(b.timestamp);
        return fechaB - fechaA;
      });

      console.log('💰 Ventas del mes (TOTAL):', ventasDelMes.toFixed(2));

      if (isMountedRef.current) {
        setStats({
          totalEnExistencia,
          productosSinStock,
          ventasDelMes: parseFloat(ventasDelMes.toFixed(2)),
          ultimasOperaciones: ultimasOperaciones,
        });
      }

      console.log('✅ Estadísticas cargadas:', {
        totalEnExistencia,
        productosSinStock,
        ventasDelMes: ventasDelMes.toFixed(2),
      });
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'No se pudieron cargar las estadísticas');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
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
      <View style={[styles.container, { backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.turquesa} />
        <Text style={[styles.loadingText, { color: themeColors.text }]}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
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
          <Text style={[styles.welcomeTitle, { color: themeColors.text }]}>
            Bienvenido 👋
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: themeColors.textSecondary }]}>
            Gestiona tu inventario y ventas VH 🌱
          </Text>
        </View>

        {/* SECCIÓN: Info de Trial (si está activo) */}
        {trialInfo?.isActive && (
          <View style={{
            backgroundColor: '#FFE4B5',
            borderLeftWidth: 4,
            borderLeftColor: '#FF9800',
            padding: 12,
            borderRadius: 6,
            marginBottom: 15,
          }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
              🎁 Trial Premium - {trialInfo.daysRemaining} días restantes
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Expira el {trialInfo.expiresAt.toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* SECCIÓN 1: INICIO - Dashboard Stats */}
        <View style={styles.dashboardSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            📊 INICIO
          </Text>

          {/* Botón Total Existencias */}
          <TouchableOpacity
            style={[
              styles.dashboardBtn,
              { backgroundColor: themeColors.bgSecondary },
            ]}
            onPress={() => handleNavigation('existencias')}
            activeOpacity={0.8}
          >
            <View style={styles.dashboardBtnContent}>
              <Text style={styles.dashboardIcon}>📦</Text>
              <View style={styles.dashboardBtnText}>
                <Text
                  style={[styles.dashboardLabel, { color: themeColors.text }]}
                >
                  Total en Existencia
                </Text>
                <Text style={styles.dashboardValue}>
                  {stats.totalEnExistencia} unidades
                </Text>
              </View>
            </View>
            <Text style={styles.dashboardArrow}>→</Text>
          </TouchableOpacity>

          {/* Botón Productos sin Stock */}
          <TouchableOpacity
            style={[
              styles.dashboardBtn,
              styles.dashboardBtnWarning,
              { backgroundColor: themeColors.bgSecondary },
            ]}
            onPress={() => handleNavigation('sin-stock')}
            activeOpacity={0.8}
          >
            <View style={styles.dashboardBtnContent}>
              <Text style={styles.dashboardIcon}>⚠️</Text>
              <View style={styles.dashboardBtnText}>
                <Text
                  style={[styles.dashboardLabel, { color: themeColors.text }]}
                >
                  Productos sin Stock
                </Text>
                <Text style={styles.dashboardValueWarning}>
                  {stats.productosSinStock} productos
                </Text>
              </View>
            </View>
            <Text style={styles.dashboardArrow}>→</Text>
          </TouchableOpacity>

          {/* Botón Ventas del Mes */}
          <TouchableOpacity
            style={[
              styles.dashboardBtn,
              { backgroundColor: themeColors.bgSecondary },
            ]}
            onPress={() => handleNavigation('analytics')}
            activeOpacity={0.8}
          >
            <View style={styles.dashboardBtnContent}>
              <Text style={styles.dashboardIcon}>💰</Text>
              <View style={styles.dashboardBtnText}>
                <Text
                  style={[styles.dashboardLabel, { color: themeColors.text }]}
                >
                  Ventas del Mes
                </Text>
                <Text style={styles.dashboardValue}>
                  ${stats.ventasDelMes || '0.00'}
                </Text>
              </View>
            </View>
            <Text style={styles.dashboardArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* SECCIÓN 2: ESCÁNER */}
        <View style={styles.escanerSection}>
          {canUseScanner && (
            <TouchableOpacity
              style={[styles.escanerBtn, { borderColor: COLORS.morado }]}
              onPress={() => setModalEscanerVisible(true)}
            >
              <Text style={styles.escanerBtnText}>💻 Nuevo Escáner</Text>
            </TouchableOpacity>
          )}
  
          {escanerActual && (
            <View style={[styles.escanerActualCard, { backgroundColor: themeColors.bgSecondary }]}>
              <View style={styles.escanerCardHeader}>
                <View>
                  <Text style={[styles.escanerCardTitle, { color: themeColors.text }]}>
                    ✅ Escáner Activo
                  </Text>
                  <Text style={[styles.escanerCardEvent, { color: themeColors.text }]}>
                    {escanerActual.evento}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalEscanerVisible(true)}
                  style={styles.escanerCardEdit}
                >
                  <Text style={styles.escanerCardEditText}>✏️ Editar</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.escanerCardDetails}>
                <View style={styles.escanerDetail}>
                  <Text style={[styles.escanerDetailLabel, { color: themeColors.textSecondary }]}>
                    Fecha
                  </Text>
                  <Text style={[styles.escanerDetailValue, { color: themeColors.text }]}>
                    {escanerActual.fechaFormato}
                  </Text>
                </View>
                <View style={styles.escanerDetail}>
                  <Text style={[styles.escanerDetailLabel, { color: themeColors.textSecondary }]}>
                    Cantidad
                  </Text>
                  <Text style={[styles.escanerDetailValue, { color: themeColors.text }]}>
                    {escanerActual.cantidad} escaneos
                  </Text>
                </View>
              </View>

              {/* BOTONES DEL ESCÁNER */}
              <View style={styles.escanerCardButtons}>
                {canUseScanner && (
                  <TouchableOpacity
                    style={styles.finalizarBtn}
                    onPress={handleFinalizarEscaner}
                    disabled={loadingEscaner}
                  >
                    <Text style={styles.finalizarBtnText}>
                      {loadingEscaner ? '⏳' : '✅'} Finalizar Evento
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        <ModalRegistroEscaner
          visible={modalEscanerVisible}
          onClose={() => setModalEscanerVisible(false)}
          onConfirmar={handleConfirmarEscaner}
          themeColors={themeColors}
          darkMode={darkMode}
          eventoInicial={escanerActual}
        />

        <View style={{ height: SPACING.bottom_padding }} />
      </ScrollView>

      {/* MODAL MENU HAMBURGUESA */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={cerrarMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={cerrarMenu}>
          <Pressable
            style={styles.menuPressable}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.menuModal,
                { backgroundColor: themeColors.bgSecondary },
              ]}
            >
              {/* Header Menu */}
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menú</Text>
                <TouchableOpacity onPress={cerrarMenu}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Menu Item: Configuranza */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigation('Configuranza')}
              >
                <Text style={styles.menuItemIcon}>⚙️</Text>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>
                  Configuranza
                </Text>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>

              {/* SEPARADOR */}
              <View style={[styles.menuSeparator, { backgroundColor: themeColors.border }]} />

              {/* PREMIUM FEATURES SECTION */}
              <View style={styles.menuFeatureSection}>
                <Text style={[styles.menuFeatureTitle, { color: themeColors.textSecondary }]}>
                  Premium Features
                </Text>

                {/* Si es PREMIUM: mostrar botones activos */}
                {effectiveTier === 'premium' ? (
                  <>
                    {/* Escáner */}
                    <TouchableOpacity
                      style={styles.menuFeatureItem}
                      onPress={() => handleNavigation('escaner')}
                    >
                      <Text style={styles.menuItemIcon}>💻</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuItemText, { color: themeColors.text }]}>
                          Escáner
                        </Text>
                      </View>
                      <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>

                    {/* Analytics */}
                    <TouchableOpacity
                      style={styles.menuFeatureItem}
                      onPress={() => handleNavigation('analytics')}
                    >
                      <Text style={styles.menuItemIcon}>📊</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuItemText, { color: themeColors.text }]}>
                          Analytics
                        </Text>
                      </View>
                      <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>

                    {/* Clientes */}
                    <TouchableOpacity
                      style={styles.menuFeatureItem}
                      onPress={() => handleNavigation('clientes')}
                    >
                      <Text style={styles.menuItemIcon}>👥</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuItemText, { color: themeColors.text }]}>
                          Clientes
                        </Text>
                      </View>
                      <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>

                    {/* Créditos */}
                    <TouchableOpacity
                      style={styles.menuFeatureItem}
                      onPress={() => handleNavigation('creditos')}
                    >
                      <Text style={styles.menuItemIcon}>💳</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuItemText, { color: themeColors.text }]}>
                          Créditos
                        </Text>
                      </View>
                      <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* Si es BASIC: mostrar placeholders bloqueados */
                  <>
                    {/* Escáner Bloqueado */}
                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}>💻</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>
                          Escáner
                        </Text>
                      </View>
                      <Text style={[styles.menuFeatureLockIcon]}>🔒</Text>
                    </View>

                    {/* Analytics Bloqueado */}
                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}>📊</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>
                          Analytics
                        </Text>
                      </View>
                      <Text style={[styles.menuFeatureLockIcon]}>🔒</Text>
                    </View>

                    {/* Clientes Bloqueado */}
                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}>👥</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>
                          Clientes
                        </Text>
                      </View>
                      <Text style={[styles.menuFeatureLockIcon]}>🔒</Text>
                    </View>

                    {/* Créditos Bloqueado */}
                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}>💳</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>
                          Créditos
                        </Text>
                      </View>
                      <Text style={[styles.menuFeatureLockIcon]}>🔒</Text>
                    </View>

                    {/* Botón Upgrade */}
                    <TouchableOpacity
                      style={[styles.upgradeBtn, { backgroundColor: COLORS.morado }]}
                      onPress={() => handleNavigation('planes')}
                    >
                      <Text style={styles.upgradeBtnText}>⬆️ Upgrade a Premium</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* SEPARADOR */}
              <View style={[styles.menuSeparator, { backgroundColor: themeColors.border }]} />

              {/* Menu Item: Cerrar Sesión */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigation('logout')}
              >
                <Text style={styles.menuItemIcon}>🚪</Text>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>
                  Cerrar Sesión
                </Text>
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
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.blanco,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.pequeño,
    fontStyle: 'italic',
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
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.normal,
  },

  // DASHBOARD
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

  // ESCÁNER SECTION
  escanerSection: {
    marginBottom: 30,
  },
  escanerBtn: {
    backgroundColor: COLORS.morado,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: COLORS.morado,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  escanerBtnText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    color: COLORS.blanco,
  },

  // ESCÁNER ACTIVO CARD
  escanerActualCard: {
    backgroundColor: COLORS.blanco,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.turquesa,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  escanerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  escanerCardTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    marginBottom: 4,
  },
  escanerCardEvent: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '600',
    color: COLORS.turquesa,
  },
  escanerCardEdit: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  escanerCardEditText: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    color: COLORS.morado,
  },

  // DETALLES DEL ESCÁNER
  escanerCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
  },
  escanerDetail: {
    alignItems: 'center',
    flex: 1,
  },
  escanerDetailLabel: {
    fontSize: FONT_SIZES.pequeño,
    marginBottom: 4,
    fontWeight: '500',
  },
  escanerDetailValue: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
  },

  // BOTONES DEL ESCÁNER
  escanerCardButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  finalizarBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.verde,
    borderRadius: 8,
    alignItems: 'center',
  },
  finalizarBtnText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
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

  // MENU SEPARADOR
  menuSeparator: {
    height: 1,
    backgroundColor: COLORS.gris,
    marginVertical: 0,
  },

  // MENU PREMIUM FEATURES SECTION
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

  // UPGRADE BUTTON
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
});

removed from homescreen /////// AHORITA LO PONEMOS

import ModalRegistroEscaner from '../components/ModalRegistroEscaner';

const [modalEscanerVisible, setModalEscanerVisible] = useState(false);
  const [escanerActual, setEscanerActual] = useState(null);
  const [loadingEscaner, setLoadingEscaner] = useState(false);
  const [canUseScanner, setCanUseScanner] = useState(false);

    useEffect(() => {
    if (cuenta) {
    cargarEscanerActual();
    cargarAccesoAFeatures(); 
    }
  }, [cuenta]);

    const cargarEscanerActual = async () => {
  try {
    // 1️⃣ CONSULTAR FIRESTORE: obtener el evento escáner activo
    const escanerRef = collection(db, 'cuentas', cuenta.toString(), 'escaneres');
    const q = query(escanerRef, where('estado', '==', 'activo'));
    const escanerSnap = await getDocs(q);

    if (!escanerSnap.empty) {
      const firestoreData = escanerSnap.docs[0].data();
      const docId = escanerSnap.docs[0].id;

      const escanerData = {
        evento: firestoreData.evento,
        fechaFormato: firestoreData.fecha,        // ← fecha → fechaFormato
        fecha: firestoreData.fechaISO,            // ← fechaISO → fecha
        invitados: firestoreData.personas || 0,   // ← personas → invitados
        monto: firestoreData.montoCobrado || 0,   // ← montoCobrado → monto
        cantidad: firestoreData.cantidad || 0,
        ventaTotal: firestoreData.ventaTotal || 0,
        id: firestoreData.id,
        docId: docId,
      };
       

      // 2️⃣ GUARDAR EN ASYNCSTORAGE como cache
      await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerData));
      setEscanerActual(escanerData);
      console.log('✅ Escáner cargado desde Firestore:', escanerData.evento);
    } else {
      console.log('ℹ️ No hay escáner activo');
      setEscanerActual(null);
    }
  } catch (error) {
    console.error('❌ Error cargando escáner:', error);
  }
};

// HomeScreen.jsx - handleConfirmarEscaner CORRECTO

    const handleConfirmarEscaner = async (datosEscaner) => {
      try {
        const escanerGuardado = await AsyncStorage.getItem('escanerActual');
        
        // ✅ CASO 1: EDITAR evento existente
        if (escanerGuardado) {
          const escanerActivo = JSON.parse(escanerGuardado);

          if (datosEscaner.evento === escanerActivo.evento) {
            // Mantener: cantidad, ventaTotal, id, docId
            const escanerActualizado = {
              ...datosEscaner,           // Nuevos datos: fecha, monto, invitados
              id: escanerActivo.id,       // Mantener ID original
              docId: escanerActivo.docId, // Mantener docId para Firestore
              cantidad: escanerActivo.cantidad,       // ✅ MANTENER
              ventaTotal: escanerActivo.ventaTotal,   // ✅ MANTENER
            };

            // Actualizar Firestore
            if (escanerActivo.docId) {
              const escanerRef = doc(db, 'cuentas', cuenta.toString(), 'escaneres', escanerActivo.docId);
              await updateDoc(escanerRef, {
                evento: datosEscaner.evento,
                fecha: datosEscaner.fechaFormato,
                fechaISO: datosEscaner.fecha,
                personas: datosEscaner.invitados || 0,
                montoCobrado: datosEscaner.monto || 0,
              });
            }

            // Actualizar AsyncStorage
            await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerActualizado));
            setEscanerActual(escanerActualizado);
            setModalEscanerVisible(false);
            
            Alert.alert('✅ Evento Actualizado');
            return;
          } else {
            // Hay otro evento activo
            Alert.alert('⚠️ Escáner Activo', `Ya tienes "${escanerActivo.evento}" activo`);
            return;
          }
        }

        // ✅ CASO 2: CREAR evento nuevo
        setLoadingEscaner(true);
        
        const escanerId = `${datosEscaner.evento.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
        
        // Guardar en Firestore PRIMERO (para obtener docId)
        const escanerRef = collection(db, 'cuentas', cuenta.toString(), 'escaneres');
        const docRef = await addDoc(escanerRef, {
          id: escanerId,
          evento: datosEscaner.evento,
          fecha: datosEscaner.fechaFormato,
          fechaISO: datosEscaner.fecha,
          personas: datosEscaner.invitados || 0,
          montoCobrado: datosEscaner.monto || 0,
          cantidad: 0,        // Inicia en 0
          ventaTotal: 0,      // Inicia en 0
          estado: 'activo',
          timestamp: new Date().toISOString(),
        });

        // Crear objeto con docId para referencias futuras
        const escanerConId = {
          ...datosEscaner,
          id: escanerId,
          docId: docRef.id,   // ← CRÍTICO: guardar docId de Firestore
          cantidad: 0,
          ventaTotal: 0,
        };

        // Guardar en AsyncStorage
        await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerConId));
        setEscanerActual(escanerConId);
        setModalEscanerVisible(false);
        
        Alert.alert('✅ Evento Registrado');

      } catch (error) {
        console.error('❌ Error:', error);
        Alert.alert('Error', error.message);
      } finally {
        setLoadingEscaner(false);
      }
    };

  const handleFinalizarEscaner = async () => {
    if (!escanerActual) return;

    Alert.alert(
      '💻 Finalizar Evento',
      `¿Cerrar "${escanerActual.evento}"?\n\nVentas: ${escanerActual.cantidad || 0}\nTotal: $${escanerActual.ventaTotal || 0}`,
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Terminar',
          onPress: async () => {
            try {
              setLoadingEscaner(true);

              const finalizadosRef = collection(
                db,
                'cuentas',
                cuenta.toString(),
                'escaneres_finalizados'
              );

              const escanerFinalizado = {
                evento: escanerActual.evento,
                fecha: escanerActual.fechaFormato,
                fechaISO: escanerActual.fecha,
                personas: escanerActual.invitados || 0,
                montoCobrado: escanerActual.monto || 0,
                cantidadVentas: escanerActual.cantidad || 0,
                totalVentas: escanerActual.ventaTotal || 0,
                horaFin: new Date().toISOString(),
                estado: 'finalizado',
                finalizadoEn: new Date().toISOString(),
              };

              console.log('📝 Guardando evento finalizado:', escanerFinalizado);

              const docRef = await addDoc(finalizadosRef, escanerFinalizado);
              console.log('✅ Evento guardado:', docRef.id);

              await AsyncStorage.removeItem('escanerActual');
              setEscanerActual(null);

              // ✅ ACTUALIZAR el documento original a finalizado
              const escanerRef = doc(db, 'cuentas', cuenta.toString(), 'escaneres', escanerActual.docId);
              await updateDoc(escanerRef, {
                estado: 'finalizado',
                finalizadoEn: new Date().toISOString(),
              });

              await AsyncStorage.removeItem('escanerActual');
              setEscanerActual(null);

              Alert.alert(
                '✅ Evento Finalizado',
                `"${escanerActual.evento}" guardado en Analytics`
              );

            } catch (error) {
              console.error('❌ Error:', error.message);
              Alert.alert('Error', error.message);
            } finally {
              setLoadingEscaner(false);
            }
          },
        },
      ]
    );
  };

    const finalizadosRef = collection(
    db,
    'cuentas',
    cuenta.toString(),
    'escaneres_finalizados'
  );

          {/* SECCIÓN 2: ESCÁNER */}
        <View style={styles.escanerSection}>
          {canUseScanner && (
            <TouchableOpacity
              style={[styles.escanerBtn, { borderColor: COLORS.morado }]}
              onPress={() => setModalEscanerVisible(true)}
            >
              <Text style={styles.escanerBtnText}>💻 Nuevo Escáner</Text>
            </TouchableOpacity>
          )}
  
          {escanerActual && (
            <View style={[styles.escanerActualCard, { backgroundColor: themeColors.bgSecondary }]}>
              {/* HEADER */}
              <View style={styles.escanerCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.escanerCardTitle, { color: themeColors.text }]}>
                    ✅ Escáner Activo
                  </Text>
                  <Text style={[styles.escanerCardEvent, { color: themeColors.text }]}>
                    {escanerActual.evento}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setModalEscanerVisible(true)}>
                  <Text style={styles.escanerCardEditText}>✏️ Editar</Text>
                </TouchableOpacity>
              </View>

              {/* DATOS */}
              <View style={styles.escanerCardDetails}>
                <View style={styles.escanerDetail}>
                  <Text style={[styles.escanerDetailLabel, { color: themeColors.textSecondary }]}>
                    Invitados
                  </Text>
                  <Text style={[styles.escanerDetailValue, { color: themeColors.text }]}>
                    {escanerActual.invitados || 0}
                  </Text>
                </View>
                <View style={styles.escanerDetail}>
                  <Text style={[styles.escanerDetailLabel, { color: themeColors.textSecondary }]}>
                    Escaneos
                  </Text>
                  <Text style={[styles.escanerDetailValue, { color: themeColors.text }]}>
                    {escanerActual.cantidad || 0}
                  </Text>
                </View>
              </View>

              {/* BOTÓN FINALIZAR DENTRO */}
              <TouchableOpacity
                style={styles.finalizarBtn}
                onPress={handleFinalizarEscaner}
                disabled={loadingEscaner}
              >
                <Text style={styles.finalizarBtnText}>
                  {loadingEscaner ? '⏳' : '✅'} Finalizar Evento
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ModalRegistroEscaner
          visible={modalEscanerVisible}
          onClose={() => setModalEscanerVisible(false)}
          onConfirmar={handleConfirmarEscaner}
          themeColors={themeColors}
          darkMode={darkMode}
          eventoInicial={escanerActual}
        />


          // ESCÁNER SECTION
  escanerSection: {
    marginBottom: 30,
  },
  escanerBtn: {
    backgroundColor: COLORS.morado,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: COLORS.morado,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  escanerBtnText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    color: COLORS.blanco,
  },

  // ESCÁNER ACTIVO CARD
  escanerActualCard: {
    backgroundColor: COLORS.blanco,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.turquesa,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  escanerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  escanerCardTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    marginBottom: 4,
  },
  escanerCardEvent: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '600',
    color: COLORS.turquesa,
  },
  escanerCardEdit: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  escanerCardEditText: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    color: COLORS.morado,
  },

  // DETALLES DEL ESCÁNER
  escanerCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
  },
  escanerDetail: {
    alignItems: 'center',
    flex: 1,
  },
  escanerDetailLabel: {
    fontSize: FONT_SIZES.pequeño,
    marginBottom: 4,
    fontWeight: '500',
  },
  escanerDetailValue: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
  },

  // BOTONES DEL ESCÁNER
  escanerCardButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  finalizarBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.verde,
    borderRadius: 8,
    alignItems: 'center',
  },
  finalizarBtnText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    color: COLORS.blanco,
  },



  modalregistroescaner

  import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

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

/**
 * COMPONENTE: ModalRegistroEscaner
 * 
 * ¿QUÉ HACE?
 * Modal para registrar un evento de escaneo:
 * - Nombre del evento (texto libre)
 * - Fecha (calendario)
 * - Monto por escaneo ($)
 * - Cantidad de escaneos (+/-)
 * - Venta total (cantidad × monto)
 * 
 * ¿QUÉ DEVUELVE?
 * Objeto: { evento, fecha, fechaFormato, monto, cantidad, ventaTotal }
 */

export default function ModalRegistroEscaner({
  visible,
  onClose,
  onConfirmar,
  themeColors,
  darkMode,
  eventoInicial,
}) {
  const [evento, setEvento] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [monto, setMonto] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [invitados, setInvitados] = useState(0);
  const [loading, setLoading] = useState(false);

  // useEffect(() => {. CAMBIO 1: ModalRegistroEscaner.jsx
//BORRA TODO este useEffect (líneas ~47-64):
  //   if (eventoInicial && visible) {
  //     // Si hay evento inicial (está editando), precarga los datos
  //     console.log('✏️ Precargando evento:', eventoInicial.evento);
  //     setEvento(eventoInicial.evento);
  //     setFecha(new Date(eventoInicial.fecha));
  //     setMonto(eventoInicial.monto.toString());
  //     setCantidad(eventoInicial.cantidad || 0);
  //     setInvitados(eventoInicial.invitados || 0);
  //   } else if (!visible) {
  //     // Si se cierra el modal, limpiar
  //     setEvento('');
  //     setFecha(new Date());
  //     setMonto('0');
  //     setCantidad(0);
  //     setInvitados(0);
  //   }
  // }, [visible, eventoInicial]);

  /**
   * FUNCIÓN: Calcular venta total
   * Formula: cantidad × monto
   */
  const calcularVentaTotal = () => {
    const montoNum = parseFloat(monto) || 0;
    return (cantidad * montoNum).toFixed(2);
  };

  /**
   * FUNCIÓN: Aumentar cantidad
   */
  const aumentarCantidad = () => {
    setCantidad(cantidad + 1);
  };

  /**
   * FUNCIÓN: Disminuir cantidad
   */
  const disminuirCantidad = () => {
    if (cantidad > 1) {
      setCantidad(cantidad - 1);
    }
  };

  /**
   * FUNCIÓN: Aumentar invitados
   */
  const aumentarInvitados = () => {
    setInvitados(invitados + 1);
  };

  /**
   * FUNCIÓN: Disminuir invitados
   */
  const disminuirInvitados = () => {
    if (invitados > 0) {
      setInvitados(invitados - 1);
    }
  };

  /**
   * FUNCIÓN: Validar y guardar
   */
  const handleConfirmar = async () => {
    // Validaciones
    if (!evento.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del evento');
      return;
    }

    if (!monto || parseFloat(monto) <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido');
      return;
    }

    if (cantidad < 0) {
      Alert.alert('Error', 'La cantidad no puede ser menor a 0');
      return;
    }

    try {
      setLoading(true);

      const ventaTotal = calcularVentaTotal();
      const fechaFormato = fecha.toLocaleDateString('es-MX');

      // Objeto que devolvemos
      const datosEscaner = {
        evento: evento.trim(),
        fecha: fecha.toISOString(),
        fechaFormato: fechaFormato,
        monto: parseFloat(monto),
        cantidad: cantidad,
        ventaTotal: parseFloat(ventaTotal),
        invitados: invitados,
      };

      console.log('✅ Escáner registrado:', datosEscaner);

      // Llamar al callback
      if (onConfirmar) {
        onConfirmar(datosEscaner);
      }

      // Limpiar formulario
      setEvento('');
      setFecha(new Date());
      setMonto('');
      setCantidad(1);
      setInvitados(0);

      // Cerrar modal
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('❌ Error registrando escáner:', error);
      Alert.alert('Error', 'Error al registrar el escáner');
    } finally {
      setLoading(false);
    }
  };

  // Formato de fecha para mostrar
  const fechaFormato = fecha.toLocaleDateString('es-MX');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* OVERLAY */}
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        {/* CONTENIDO MODAL */}
        <Pressable
          style={[
            styles.modalContent,
            {
              backgroundColor: themeColors.bgSecondary || COLORS.blanco,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>
              📱 Registro de Escáner
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* FORMULARIO */}
          <View style={styles.form}>
            {/* CAMPO 1: Evento */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>
                📋 Evento / Nombre
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: darkMode ? '#2a2a2a' : COLORS.blanco,
                    color: themeColors.text,
                    borderColor: COLORS.turquesa,
                  },
                ]}
                placeholder="Ej: Scanner Party Lola"
                placeholderTextColor={darkMode ? '#888' : '#ccc'}
                value={evento}
                onChangeText={setEvento}
                editable={!loading}
              />
            </View>

            {/* CAMPO 2: Fecha (CLICKEABLE) */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>
                📅 Fecha
              </Text>
              
              {/* Fecha clickeable - abre el picker */}
              <TouchableOpacity
                style={[styles.fechaDisplay, { backgroundColor: darkMode ? '#2a2a2a' : COLORS.gris }]}
                onPress={() => setShowDatePicker(true)}
                disabled={loading}
              >
                <Text style={[styles.fechaDisplayText, { color: themeColors.text }]}>
                  {fechaFormato}
                </Text>
              </TouchableOpacity>

              {/* Date Picker */}
              {showDatePicker && (
                <DateTimePicker
                  value={fecha}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onValueChange={(selectedDate) => {
                    if (selectedDate) {
                      setFecha(selectedDate);
                    }
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    console.log('📅 Fecha seleccionada:', selectedDate.toLocaleDateString('es-MX'));
                  }}
                  onDismiss={() => setShowDatePicker(false)}
                  locale="es-MX"
                />
              )}
            </View>

            {/* CAMPO 3: Monto */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>
                💵 Monto por Escaneo ($)
              </Text>
              <View style={styles.inputMonto}>
                <Text style={[styles.montoPrefix, { color: themeColors.text }]}>
                  $
                </Text>
                <TextInput
                  style={[
                    styles.inputMontoField,
                    {
                      backgroundColor: darkMode ? '#2a2a2a' : COLORS.blanco,
                      color: themeColors.text,
                      borderColor: COLORS.turquesa,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={darkMode ? '#888' : '#ccc'}
                  value={monto}
                  onChangeText={setMonto}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>
            </View>

            {/* CAMPO 4: Cantidad de Escaneos */}
            <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>
                💻 Escaneos
            </Text>
            <View style={styles.fieldControles}>
                <TouchableOpacity 
                style={styles.fieldBtn}
                onPress={() => setCantidad(Math.max(0, cantidad - 1))}
                >
                <Text style={styles.fieldBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.fieldValue, { color: themeColors.text }]}>
                {cantidad}
                </Text>
                <TouchableOpacity 
                style={styles.fieldBtn}
                onPress={() => setCantidad(cantidad + 1)}
                >
                <Text style={styles.fieldBtnText}>+</Text>
                </TouchableOpacity>
            </View>
            </View>

            {/* CAMPO 5: Invitados (OPCIONAL) */}
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: themeColors.text }]}>
                👥 Invitados
              </Text>

              <View style={styles.fieldControles}>
                <TouchableOpacity
                  style={styles.fieldBtn}
                  onPress={() => setInvitados(Math.max(0, invitados - 1))}
                  disabled={loading || invitados <= 0}
                >
                  <Text style={styles.fieldBtnText}>−</Text>
                </TouchableOpacity>

                <Text style={[styles.fieldValue, { color: themeColors.text }]}>
                    {invitados}
                    </Text>
                    <TouchableOpacity 
                    style={styles.fieldBtn}
                    onPress={() => setInvitados(invitados + 1)}
                    >
                    <Text style={styles.fieldBtnText}>+</Text>
                    </TouchableOpacity>
                </View>
                </View>

            {/* RESUMEN: Venta Total */}
            <View style={[styles.resumenBox, { backgroundColor: darkMode ? '#2a2a2a' : '#fff3e0' }]}>
              <Text style={[styles.resumenLabel, { color: themeColors.text }]}>
                💰 Venta Total
              </Text>
              <Text style={styles.resumenValue}>
                ${calcularVentaTotal()}
              </Text>
            </View>
          </View>

          {/* BOTONES */}
          <View style={styles.botones}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmarBtn, loading && styles.disabledBtn]}
              onPress={handleConfirmar}
              disabled={loading}
            >
              <Text style={styles.confirmarBtnText}>
                {loading ? '⏳' : '✅'} Registrar Escáner
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.turquesa,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.rojo,
  },

  // FORMULARIO
  form: {
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  // INPUT TEXTO
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
  },

  // FECHA (CLICKEABLE)
  fechaDisplay: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.turquesa,
  },
  fechaDisplayText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // MONTO
  inputMonto: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.turquesa,
    borderRadius: 8,
    paddingLeft: 12,
  },
  montoPrefix: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  inputMontoField: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.turquesa,
    padding: 12,
    fontSize: 14,
  },

  // CANTIDAD
  cantidadControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  cantidadBtn: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: COLORS.turquesa,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantidadBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  cantidadDisplay: {
    width: 80,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.turquesa,
  },
  cantidadValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // RESUMEN
  resumenBox: {
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.naranja,
    marginBottom: 15,
  },
  resumenLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  resumenValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.naranja,
    marginBottom: 4,
  },
  resumenFormula: {
    fontSize: 11,
  },

  // BOTONES
  botones: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.rojito,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 110,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  confirmarBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.verde,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 140,
  },
  confirmarBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  disabledBtn: {
    opacity: 0.5,
  },

  fieldRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  marginVertical: 8,
  backgroundColor: '#f9f9f9',
  borderRadius: 8,
},

fieldLabel: {
  fontSize: 16,
  fontWeight: '600',
  flex: 1,
},

fieldControles: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},

fieldBtn: {
  width: 24,
  height: 24,
  borderRadius: 6,
  backgroundColor: '#1a9ea1',
  justifyContent: 'center',
  alignItems: 'center',
},

fieldBtnText: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#fff',
},

fieldValue: {
  fontSize: 14,
  fontWeight: '700',
  minWidth: 30,
  textAlign: 'center',
  color: '#000',
},
});