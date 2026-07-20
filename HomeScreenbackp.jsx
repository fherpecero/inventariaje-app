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
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, 
  serverTimestamp, query, where, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { hasAccessToFeature, calculateEffectiveTier, getTrialInfo } from '../utils/tierUtils';
import FeatureLocked from '../components/FeatureLocked';
import ModalRegistroEscaner from '../components/ModalRegistroEscaner';
import DatePickerField from '../components/DatePickerField';
import { LinearGradient } from 'expo-linear-gradient';
import DatePickerField from '../components/DatePickerField';

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

const COLORS = {
  turquesa: '#24c5c5',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
  naranja: '#FF9800',
  morado: '#7e2b8d',
  grey: '#565656',
};

const FONT_SIZES = {
  titulo: 40,
  subtitulo: 20,
  normal: 16,
  pequeño: 14,
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
  // Extraemos variables del contexto y renombramos loading para evitar colisiones
  const { user, cuenta, cuentaId, loading: loadingAuth } = useContext(AuthContext);
  
  // Estados de interfaz y datos
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState({
    totalEnExistencia: 0,
    productosSinStock: 0,
    ventasDelMes: 0,
    ultimasOperaciones: [],
  });
  
  // Estado local para los loaders de esta pantalla en específico
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [canUseAnalytics, setCanUseAnalytics] = useState(false);
  const [canUseClientes, setCanUseClientes] = useState(false);
  const [effectiveTier, setEffectiveTier] = useState('basic');
  const [trialInfo, setTrialInfo] = useState(null);
  const [canUseAlertas, setCanUseAlertas] = useState(false);
  // Estados para eventos de escáner
  const [modalEventoVisible, setModalEventoVisible] = useState(false);
  const [eventoActivo, setEventoActivo] = useState(null);

  //===========================================
  // CREDITOS PENDIENTES
  //===========================================
  const [creditosPendientes, setCreditosPendientes] = useState([]);
  const [loadingCreditos, setLoadingCreditos] = useState(false);
  const [modalEditarCreditoVisible, setModalEditarCreditoVisible] = useState(false);
  const [creditoEditandoId, setCreditoEditandoId] = useState(null);
  const [creditoEditando, setCreditoEditando] = useState(null);
  const [productosDelCredito, setProductosDelCredito] = useState([]);

  // ==========================================
  // REFERENCIA: Evitar fugas de memoria (Declarado una sola vez)
  // ==========================================
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  
  // ==========================================
  // HELPER: Cargar info de Trial manualmente si se requiere
  // ==========================================
  const cargarTrialInfo = async () => {
    try {
      if (!cuenta) return;
      const trial = await getTrialInfo(cuenta);
      if (isMountedRef.current) setTrialInfo(trial);
    } catch (error) {
      console.error('Error cargando trial info:', error);
    }
  };

  
  // ==========================================
  // FUNCIÓN: Cargar productos de un crédito
  // ==========================================
  const cargarProductosDelCredito = async (ventasIds) => {
    if (!ventasIds || ventasIds.length === 0) {
      setProductosDelCredito([]);
      return;
    }

    try {
      const salidaRef = collection(
        db,
        'cuentas',
        cuentaId.toString(),
        'salidas'
      );

      const productos = [];
      for (const ventaId of ventasIds) {
        try {
          const ventaDoc = doc(salidaRef, ventaId);
          const ventaSnap = await getDoc(ventaDoc);
          if (ventaSnap.exists()) {
            const data = ventaSnap.data();
            productos.push({
              nombre: data.producto,
              cantidad: data.cantidad,
            });
          }
        } catch (err) {
          console.error('Error cargando venta:', ventaId);
        }
      }
      setProductosDelCredito(productos);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProductosDelCredito([]);
    }
  };

  // ==========================================
  // EFECTO 1: Calcular el Tier y Trial
  // ==========================================
  useEffect(() => {
    if (!user || !cuenta || !cuentaId) return;
    
    // Calcular tier efectivo
    let tierFinal = cuenta?.tier || 'basic';
    
    if (cuenta?.premiumTrialActive && cuenta?.trialStartDate) {
      const ahora = new Date();
      const inicio = new Date(cuenta.trialStartDate);
      const diferenciaDias = (ahora - inicio) / (1000 * 60 * 60 * 24);
      
      if (diferenciaDias >= 30) {
        // Trial expiró: actualizar documento usando cuentaId como string
        updateDoc(doc(db, 'cuentas', String(cuentaId)), {
          premiumTrialActive: false,
          tier: 'basic'
        }).catch(err => console.error('Error actualizando trial en DB:', err));
        
        tierFinal = 'basic';
      } else {
        tierFinal = 'premium';
      }
      
      // Calcular trial info restante
      const endDate = new Date(inicio);
      endDate.setDate(endDate.getDate() + 30);
      const daysRemaining = Math.ceil((endDate - ahora) / (1000 * 60 * 60 * 24));
      
      setTrialInfo({
        isActive: diferenciaDias < 30,
        daysRemaining: Math.max(0, daysRemaining),
        expiresAt: endDate,
        startDate: inicio
      });
    }
  
    setEffectiveTier(tierFinal);
  }, [user, cuenta, cuentaId]);

  // ==========================================
  // EFECTO 2: Cargar Estadísticas (Protegido con Freno de Mano)
  // ==========================================
  useEffect(() => {
    // 🛑 1. EL FRENO: Si Firebase Auth sigue cargando, nos detenemos.
    if (loadingAuth) {
      console.log("⏳ Esperando Auth antes de cargar estadísticas...");
      return;
    }
    
    // 🛑 2. Si no hay usuario o cuentaId, abortamos.
    if (!user || !cuentaId) return;

    // ✅ 3. LÓGICA PRINCIPAL
    const cargarEstadisticas = async () => {
      if (!isMountedRef.current) return;
      
      try {
        setLoadingStats(true);
        console.log('📊 Cargando estadísticas para:', { userId: user.uid, cuentaId });
        
        // ========================================
        // 1. OBTENER INVENTARIO
        // ========================================
        const docRef = doc(
          db,
          'cuentas',
          String(cuentaId), // ✅ CORREGIDO: Usamos String(cuentaId) para evitar crasheos
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
          String(cuentaId),
          'salidas'
        );

        const salidasSnap = await getDocs(salidasRef);

        let ventasDelMes = 0;
        const ultimasOperaciones = [];

        salidasSnap.forEach((doc) => {
          const data = doc.data();

          if (data.tipoPago !== 'crd') {

          
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
            }
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

        console.log('✅ Estadísticas cargadas exitosamente.');

      } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
        if (isMountedRef.current) {
          Alert.alert('Error', 'No se pudieron cargar las estadísticas');
        }
      } finally {
        if (isMountedRef.current) {
          setLoadingStats(false); // ✅ CORREGIDO: Ajustado al estado de loading correcto
        }
      }
    };
         cargarEstadisticas();

  // 👇 Dependemos de loadingAuth para que se dispare cuando Firebase termine
  }, [user, cuentaId, loadingAuth]); 

    // ==========================================
    // EFECTO 3: Cargar evento activo
    // ==========================================
    useEffect(() => {
      if (!user || !cuentaId) return;

      const cargarEventoActivo = async () => {
        try {
          const escanerRef = collection(db, 'cuentas', String(cuentaId), 'escaneres');
          const q = query(escanerRef, where('estado', '==', 'activo'));
          const escanerSnap = await getDocs(q);

          // Buscar el evento con estado 'activo'
          let eventoAct = null;

          if (!escanerSnap.empty) {
            const doc = escanerSnap.docs[0];
            const data = doc.data();

             // ✅ AQUÍ está la clave: capturar el ID
              eventoAct = {
                ...data,
                id: doc.id  // ← Este ID es crítico
              };
              
              console.log('🔍 Evento completo con ID:', eventoAct);
            }

          if (isMountedRef.current) {
            setEventoActivo(eventoAct);
            if (eventoAct) {
              console.log('💻 Evento activo completo:', eventoAct.evento);
              // Guardar en AsyncStorage para SalidaScreen
              await AsyncStorage.setItem('escanerActual', JSON.stringify(eventoAct));
            }
          }
        } catch (error) {
          console.error('❌ Error cargando evento activo:', error);
        }
      };

      cargarEventoActivo();
    }, [user, cuentaId]);

      const cerrarMenu = () => {
    setMenuVisible(false);
  };

    // ==========================================
    // EFECTO 4: Cargar Créditos Pendientes (Tiempo Real)
    // ==========================================
    useEffect(() => {
      // 🛑 FRENO: Si no hay usuario, cuenta o apenas está cargando Auth, abortamos
      if (loadingAuth || !user || !cuentaId) return;

      if (isMountedRef.current) setLoadingCreditos(true);

      try {
        const creditosRef = collection(db, 'cuentas', String(cuentaId), 'creditos');
        
        // Query simple: solo filtrar por estado
        const q = query(creditosRef, where('estado', '==', 'pendiente'));
        
        // ✅ onSnapshot en lugar de getDocs (Tiempo Real)
        const unsubscribeCreditos = onSnapshot(
          q, 
          (snapshot) => {
            let creditos = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            
            // Ordenar en JavaScript por fechaPTP (ascendente = próximos primero)
            creditos.sort((a, b) => {
              const fechaA = a.fechaPTP?.seconds || 0;
              const fechaB = b.fechaPTP?.seconds || 0;
              return fechaA - fechaB;
            });
            
            if (isMountedRef.current) {
              setCreditosPendientes(creditos);
              setLoadingCreditos(false);
            }
            console.log('✅ Créditos en tiempo real actualizados:', creditos.length);
          },
          (error) => {
            // 🔇 Silenciador para que no truene la app al cerrar sesión
            console.log('🔇 Snapshot de créditos silenciado:', error.code);
            if (isMountedRef.current) setLoadingCreditos(false);
          }
        );

        // ✅ APAGADOR: Destruye el listener si cambias de usuario o cierras sesión
        return () => {
          unsubscribeCreditos();
        };

      } catch (error) {
        console.error('❌ Error configurando listener de créditos:', error);
        if (isMountedRef.current) setLoadingCreditos(false);
      }
    }, [cuentaId, user, loadingAuth]); // Dependencias correctas

  const handleNavigation = (screen) => {
    console.log('Navegando a:', screen);
    cerrarMenu();
    onNavigate(screen);
  };

  if (loadingAuth || loadingStats) {
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
        {/* Fila principal de contenido */}
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>INVENTARIAJE APP</Text>
            <Text style={styles.headerSubtitle}>by FherLaRush</Text>
          </View>
          
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.menuIcon}>≡</Text>
          </TouchableOpacity>
        </View>

        {/* ESTA LÍNEA ES TU BORDER-BOTTOM GRADIENTE */}
        <LinearGradient
          colors={['rgba(68, 194, 194, 1)', 'rgba(122, 122, 236, 0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0.27, 0.90]}
          style={styles.headerBorderGradient}
        />
      </View>

      {/* CONTENT */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* BIENVENIDA */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeSubtitle, { color: themeColors.text }]}>
            Te damos la bienvenida
          </Text>
          <Text style={styles.welcomeTitle}>
              {cuenta?.nombre?.split(' ')[0]}
            </Text>
        </View>

        {/* SECCIÓN: Info de Trial (si está activo) */}
        {trialInfo?.isActive && (
          <View style={{
            backgroundColor: COLORS.blanco,
            borderLeftWidth: 4,
            borderLeftColor: COLORS.turquesa,
            padding: 12,
            borderRadius: 6,
            marginBottom: 15,
          }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
              💎 Free Premium Version- {trialInfo.daysRemaining} días restantes
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Disfruta de las funciones premium hasta el {trialInfo.expiresAt.toLocaleDateString()}
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

        {/* SECCIÓN 2: EVENTO DE ESCÁNER || PREMIUM */}
        {effectiveTier === 'premium' && (
        <View style={styles.scannerSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            💻 Evento de Escáner
          </Text>

          {eventoActivo ? (
            // Card de evento activo
            <View style={[styles.eventoCard, { backgroundColor: themeColors.bgSecondary }]}>
              <View style={styles.eventoHeader}>
                <Text style={[styles.eventoTitle, { color: themeColors.text }]}>
                  {eventoActivo.evento}
                </Text>
                <Text style={styles.eventoStatus}>🟢 Activo</Text>
              </View>

              <View style={styles.eventoDetails}>
                <View style={styles.eventoDetailRow}>
                  <Text style={[styles.eventoLabel, { color: themeColors.textSecondary }]}>
                    Escaneos:
                  </Text>
                  <Text style={[styles.eventoValue, { color: themeColors.text }]}>
                    {eventoActivo.escaneos} personas
                  </Text>
                </View>

                <View style={styles.eventoDetailRow}>
                  <Text style={[styles.eventoLabel, { color: themeColors.textSecondary }]}>
                    Total Ingreso:
                  </Text>
                  <Text style={styles.eventoValueMoney}>
                    ${eventoActivo.ventaTotal?.toFixed(2) || '0.00'}
                  </Text>
                </View>

                <View style={styles.eventoDetailRow}>
                  <Text style={[styles.eventoLabel, { color: themeColors.textSecondary }]}>
                    Fecha:
                  </Text>
                  <Text style={[styles.eventoValue, { color: themeColors.text }]}>
                    {eventoActivo.fecha}
                  </Text>
                </View>
              </View>

              <View style={styles.eventoButtons}>
                <TouchableOpacity
                  style={[styles.eventoBtnEdit, { backgroundColor: COLORS.turquesa }]}
                  onPress={() => setModalEventoVisible(true)}
                >
                  <Text style={styles.eventoBtnText}>✏️ Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventoBtnFinish, { backgroundColor: COLORS.verde }]}
                  onPress={() => {
                    Alert.alert('Finalizar Evento', 
                      `¿Finalizar "${eventoActivo.evento}"?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Finalizar',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              // Actualizar estado a finalizado
                              const eventoRef = doc(db, 'cuentas', String(cuentaId), 'escaneres', eventoActivo.id);
                              await updateDoc(eventoRef, { estado: 'finalizado', updatedAt: new Date().toISOString() });
                              
                              // Limpiar AsyncStorage
                              await AsyncStorage.removeItem('escanerActual');
                              
                              setEventoActivo(null);
                              Alert.alert('✅ Éxito', 'Evento finalizado correctamente');
                            } catch (error) {
                              Alert.alert('Error', 'No se pudo finalizar el evento');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.eventoBtnText}>💾 Finalizar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Botón para crear nuevo evento
            <TouchableOpacity
              style={[styles.eventoBtnCreate, { backgroundColor: themeColors.bgSecondary }]}
              onPress={() => setModalEventoVisible(true)}
            >
              <View>
                <Text style={[styles.eventoBtnCreateText, { color: themeColors.text }]}>
                  Crear Evento de Escáner
                </Text>
                <Text style={[styles.eventoBtnCreateSubtext, { color: themeColors.textSecondary }]}>
                  Registrar evento de escaner
                </Text>
              </View>
              <Text style={styles.dashboardArrow}>→</Text>
            </TouchableOpacity>
          )}
        </View>
        )}
        <View style={{ height: SPACING.bottom_padding }} />
        

        {/* Card: Créditos Pendientes | PREMIUM */}
        {effectiveTier === 'premium' && (
          <TouchableOpacity onPress={() => onNavigate('clientes')}
           activeOpacity={0.7}
           style={{ marginBottom: 80 }} 
        >
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            💳 Créditos Pendientes
          </Text>

          {/* CARD ABRE AQUÍ */}
          <View style={styles.creditoCard}>          
            {loadingCreditos ? (
              <ActivityIndicator color="#ffffff" />
            ) : creditosPendientes.length === 0 ? (
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              No tienes creditos pendientes
            </Text>
          ) : (
            <View>
              {creditosPendientes.slice(0, 3).map((credito) => (
                <View
                  key={credito.id}
                  style={[
                    styles.creditoItem,
                    { borderBottomColor: darkMode ? '#444' : '#f0f0f0' }
                  ]}
                >
                  {/* Info del crédito */}
                  <View style={styles.creditoInfo}>
                    <Text style={[styles.creditoNombre, { color: themeColors.text }]}>
                      {credito.clienteNombre}
                    </Text>
                    <Text style={[styles.creditoFecha, { color: themeColors.textSecondary }]}>
                      Promesa de pago: {new Date(credito.fechaPTP.seconds * 1000).toLocaleDateString('es-MX')}
                    </Text>
                  </View>
                  
                  {/* Monto  */}
                  <Text style={styles.creditoMonto}>
                    ${credito.monto.toFixed(2)}
                  </Text>
                </View>
              ))}
              
              {creditosPendientes.length > 3 && (
                <Text style={[styles.masCreditos, { color: themeColors.turquesa }]}>
                  +{creditosPendientes.length - 3} más
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    )}
        
      </ScrollView>

      {/* MODAL EVENTO */}
      <ModalRegistroEscaner
        visible={modalEventoVisible}
        onClose={() => setModalEventoVisible(false)}
        onSuccess={async (nuevoEvento) => {
          console.log('📌 Evento creado con ID:', nuevoEvento.id);
          setEventoActivo(nuevoEvento);
          // ✅ GUARDAR EN ASYNCSTORAGE CON EL ID
          await AsyncStorage.setItem('escanerActual', JSON.stringify(nuevoEvento));
        }}
        cuentaId={cuentaId}
        eventoEdicion={eventoActivo}
      />

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
                      onPress={() => setModalEventoVisible(true)}
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
    backgroundColor: COLORS.blanco,
    //borderBottomColor: COLORS.turquesa,
    //borderBottomWidth: 2,
    //paddingHorizontal: SPACING.content_padding,
    //paddingVertical: SPACING.header_padding,
    paddingTop: 60,
    //flexDirection: 'row',
    //justifyContent: 'space-between',
    //alignItems: 'flex-end',
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
  headerTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    color: COLORS.grey,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.pequeño,
    fontStyle: 'italic',
    //color: 'rgba(255,255,255,0.8)',
    color: COLORS.grey,
  },
  menuBtn: {
    padding: 10,
  },
  menuIcon: {
    fontSize: 40,
    color: COLORS.grey,
    fontWeight: '500',
  },

  // CONTENT
  content: {
    flex: 1,
    padding: SPACING.content_padding,
  },
  welcomeSection: {
    marginTop: 20,
    marginBottom: 25,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.titulo,
    fontWeight: '700',
    //marginBottom: 5,
    color: COLORS.turquesa,
    fontStyle: 'italic'
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.normal,
    color: '#565656',
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

  // SCANNER SECTION
  scannerSection: {
    marginBottom: 20,
  },
  eventoCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.turquesa,
    marginBottom: 1,
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
  //CREDITOS 
  cardTitleSecondary: {
  fontSize: 16,
  fontWeight: '700',
  color: '#000',
  },
  creditoCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: COLORS.blanco,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.turquesa,
    marginBottom: 12,
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
    color: 'COLORS:rojito',
    marginLeft: 10,
  },
  masCreditos: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});