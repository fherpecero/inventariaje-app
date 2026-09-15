import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  LogBox,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { InventarioContext } from '../context/InventarioContext';
import { getProductosActivos } from '../context/productCatalog';
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES } from '../context/theme';
import { Ionicons, FontAwesome6, Entypo, FontAwesome, Feather, Fontisto, MaterialCommunityIcons, Foundation } from '@expo/vector-icons';

//COMPONENTS
import ModalRegistroEscaner from '../components/ModalRegistroEscaner';
import ModalExchange from '../components/ModalExchange';
import ModalFeedback from '../components/ModalFeedback';

// ICONS
import MenuIcon from '../assets/icons/IconMenu.svg';

// IMGS
import ImgExistencia from '../assets/img/img_existencia.png';
import ImgVenta from '../assets/img/img_venta.png';

export default function HomeScreen({ onNavigate, darkMode, themeColors }) {
  // ==========================================
  // ESTADOS Y CONTEXTOS
  // ==========================================
  const { user, userData, cuenta, cuentaId, loading: loadingAuth } = useContext(AuthContext);
  const { inventarioGlobal } = useContext(InventarioContext);
  const isMountedRef = useRef(true);
  
  // Interfaz y Loaders
  const [menuVisible, setMenuVisible] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [modalFeedbackVisible, setModalFeedbackVisible] = useState(false);
  
  // Datos del Dashboard
  const [stats, setStats] = useState({
    totalEnExistencia: 0,
    productosSinStock: 0,
    ventasDelMes: 0,
    ultimasOperaciones: [],
  });
  const [creditosPendientes, setCreditosPendientes] = useState([]);
  const [loadingCreditos, setLoadingCreditos] = useState(false);

  // Escáner
  const [modalEventoVisible, setModalEventoVisible] = useState(false);
  const [eventoActivo, setEventoActivo] = useState(null);

  // Suscripción y Accesos
  const [effectiveTier, setEffectiveTier] = useState('basic');
  const [trialInfo, setTrialInfo] = useState(null);

  // Notificaciones
  const [generalNotificationsModal, setGeneralNotificationsModal] = useState(false);
  const [peticionesBuzon, setPeticionesBuzon] = useState([]);
  const [modalBuzonVisible, setModalBuzonVisible] = useState(false);
  const [conteoAlertasStock, setConteoAlertasStock] = useState(0);

  const [avisosApp, setAvisosApp] = useState([]);

  // ==========================================
  // EFECTO: Escuchar Avisos Globales de la App
  // ==========================================
  useEffect(() => {
    // Escuchamos una colección pública donde tú (el admin) pondrás los anuncios
    const avisosRef = collection(db, 'avisos_globales');
    
    const q = query(avisosRef, where('activo', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const avisos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (isMountedRef.current) setAvisosApp(avisos);
    }, (error) => {
      console.log("🔇 Error leyendo avisos globales:", error.code);
    });

    return () => unsubscribe();
  }, []);

  // ==========================================
  // 🧮 CEREBRO DEL CENTRO DE NOTIFICACIONES
  // ==========================================
  
  // 1. CRÉDITOS: Calculamos créditos que vencen mañana, hoy, o ya vencieron
  const creditosPorVencer = creditosPendientes.filter(credito => {
    if (!credito.fechaPTP) return false;
    const fechaPromesa = credito.fechaPTP.seconds ? new Date(credito.fechaPTP.seconds * 1000) : new Date(credito.fechaPTP);
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    fechaPromesa.setHours(0,0,0,0);
    return ((fechaPromesa - hoy) / (1000 * 60 * 60 * 24)) <= 1; 
  });
  const conteoCreditosAlertas = creditosPorVencer.length;

  // 2. TRIAL VERSION: Avisar cuando falten 5 días o menos
  let alertaTrial = null;
  if (trialInfo?.isActive) {
    // 🛡️ Aseguramos que sea un número entero perfecto (ej. 5.01 se vuelve 5)
    const diasFaltantes = Math.round(Number(trialInfo.daysRemaining));
    
    // Mejor UX: Prende la campana si faltan 5 días o menos y la mantiene hasta que pague
    if (diasFaltantes <= 5 && diasFaltantes > 0) {
      alertaTrial = {
        dias: diasFaltantes,
        mensaje: diasFaltantes === 1 
          ? '¡Último día de Premium gratis! Actualiza ahora para no perder acceso.' 
          : `Tu prueba Premium expira en ${diasFaltantes} días. Actualiza tu plan pronto.`
      };
    }
  }

  // 3. SUMA TOTAL (Para encender la campanita)
  const totalNotificaciones = 
    peticionesBuzon.length + 
    (conteoAlertasStock || 0) + 
    conteoCreditosAlertas + 
    (alertaTrial ? 1 : 0) + 
    avisosApp.length;

  const hayNotificaciones = totalNotificaciones > 0;

  useEffect(() => {
    if (loadingAuth || !user || !cuentaId) return;

    // Escuchamos donde YO soy el receptor (paraCuentaId) y el estado es 'pendiente'
    const peticionesRef = collection(db, 'intercambios_pendientes');
    const q = query(
      peticionesRef, 
      where('paraCuentaId', '==', String(cuentaId)), 
      where('estado', '==', 'pendiente')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const peticiones = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (isMountedRef.current) setPeticionesBuzon(peticiones);
    });

    return () => unsubscribe();
  }, [cuentaId, user, loadingAuth]);

  // ==========================================
  // EFECTOS DE CICLO DE VIDA
  // ==========================================
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ==========================================
  // EFECTO 1: Calcular el Tier y Trial
  // ==========================================
  useEffect(() => {
    if (!user || !cuenta || !cuentaId) return;
    
    let tierFinal = cuenta?.tier || 'basic';
    
    if (cuenta?.premiumTrialActive && cuenta?.trialStartDate) {
      const ahora = new Date();
      const inicio = new Date(cuenta.trialStartDate);
      const diferenciaDias = (ahora - inicio) / (1000 * 60 * 60 * 24);
      
      if (diferenciaDias >= 30) {
        updateDoc(doc(db, 'cuentas', String(cuentaId)), {
          premiumTrialActive: false,
          tier: 'basic'
        }).catch(err => console.error('Error actualizando trial en DB:', err));
        
        tierFinal = 'basic';
      } else {
        tierFinal = 'premium';
      }
      
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
  // 🚀 MOTOR 1: CÁLCULO DE MÉTRICAS EN TIEMPO REAL (0ms Latencia)
  // ==========================================
  useEffect(() => {
    if (!inventarioGlobal || inventarioGlobal.length === 0) return;

    let totalEnExistencia = 0;
    let productosSinStock = 0;
    let bajoStock = 0;

    // Iteramos directamente sobre el inventario que ya fue procesado por el Contexto
    inventarioGlobal.forEach((prod) => {
      // 🧠 prod.cantidad ya incluye las piezas regulares + bonos influencer
      const cantidadReal = prod.cantidad || 0;
      const limiteConfigurado = prod.limiteStock || 0;

      if (cantidadReal > 0) totalEnExistencia += cantidadReal;
      if (cantidadReal <= 0) productosSinStock += 1;
      
      // Lógica intacta para Alertas de Bajo Stock
      if (limiteConfigurado > 0 && cantidadReal > 0 && cantidadReal <= limiteConfigurado) {
        bajoStock += 1;
      }
    });

    // Actualizamos estado conservando las ventas intactas
    if (isMountedRef.current) {
      setStats(prev => ({
        ...prev,
        totalEnExistencia,
        productosSinStock,
        bajoStock
      }));

      // Si tienes un estado para la campanita de notificaciones, se alimenta aquí mismo
      if (typeof setConteoAlertasStock === 'function') {
        setConteoAlertasStock(bajoStock);
      }
    }
  }, [inventarioGlobal]);
  
  // ==========================================
  // 📊 MOTOR 2: VENTAS DEL MES (INTACTO Y PROTEGIDO)
  // ==========================================
  useEffect(() => {
    if (loadingAuth || !user || !cuentaId) return;

    const cargarVentas = async () => {
      if (!isMountedRef.current) return;
      
      try {
        setLoadingStats(true);

        const ahora = new Date();
        const primerDiaDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const ultimoDiaDelMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

        const salidasRef = collection(db, 'cuentas', String(cuentaId), 'salidas');
        
        // 🛡️ Lógica Inteligente de Roles
        let salidasQuery = salidasRef; 
        if (userData?.rol !== 'admin') {
          salidasQuery = query(salidasRef, where('creadoPorUid', '==', user.uid));
        }

        const salidasSnap = await getDocs(salidasQuery);

        let ventasDelMes = 0;
        const ultimasOperaciones = [];

        salidasSnap.forEach((doc) => {
          const data = doc.data();
          const timestampStr = data.timestamp;

          if (timestampStr) {
            const timestampDate = new Date(timestampStr);

            if (timestampDate >= primerDiaDelMes && timestampDate <= ultimoDiaDelMes) {
              const total = parseFloat(data.total) || 0;
              
              if (data.tipoPago !== 'crd') {
                ventasDelMes += total;
              }

              ultimasOperaciones.push({
                producto: data.producto,
                cantidad: data.cantidad,
                total: total,
                timestamp: timestampStr,
                tipo: data.tipoPago === 'crd' ? 'crédito' : 'salida',
              });
            }
          }
        });

        ultimasOperaciones.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (isMountedRef.current) {
          setStats(prev => ({
            ...prev,
            ventasDelMes: parseFloat(ventasDelMes.toFixed(2)),
            ultimasOperaciones: ultimasOperaciones,
          }));
        }
      } catch (error) {
        console.error('❌ Error cargando ventas:', error);
      } finally {
        if (isMountedRef.current) setLoadingStats(false);
      }
    };

    cargarVentas();
  }, [user, cuentaId, loadingAuth]);

  // ==========================================
  // EFECTO 3: Cargar evento activo del Escáner
  // ==========================================
  useEffect(() => {
    if (!user || !cuentaId) return;

    const cargarEventoActivo = async () => {
      try {
        const escanerRef = collection(db, 'cuentas', String(cuentaId), 'escaneres');

        let q;
        if (userData?.rol === 'admin') {
          // Admin busca cualquier escáner que esté activo en la cuenta
          q = query(escanerRef, where('estado', '==', 'activo'));
        } else {
          // User busca SOLO los escáneres activos que ÉL MISMO creó
          q = query(
            escanerRef, 
            where('estado', '==', 'activo'),
            where('creadoPorUid', '==', user.uid) // 👈 El filtro mágico
          );
        }

        const escanerSnap = await getDocs(q);

        let eventoAct = null;

        if (!escanerSnap.empty) {
          const doc = escanerSnap.docs[0];
          eventoAct = { ...doc.data(), id: doc.id };
        }

        if (isMountedRef.current) {
          setEventoActivo(eventoAct);
          if (eventoAct) {
            await AsyncStorage.setItem('escanerActual', JSON.stringify(eventoAct));
          }
        }
      } catch (error) {
        console.error('❌ Error cargando evento activo:', error);
      }
    };

    cargarEventoActivo();
  }, [user, cuentaId, userData?.rol]);

  // ==========================================
  // EFECTO 4: Cargar Créditos Pendientes (Tiempo Real)
  // ==========================================
  useEffect(() => {
    if (loadingAuth || !user || !cuentaId) return;
    if (isMountedRef.current) setLoadingCreditos(true);

    try {
      const creditosRef = collection(db, 'cuentas', String(cuentaId), 'creditos');
      const q = query(creditosRef, where('estado', '==', 'pendiente'));
      
      const unsubscribeCreditos = onSnapshot(
        q, 
        (snapshot) => {
          let creditos = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          creditos.sort((a, b) => (a.fechaPTP?.seconds || 0) - (b.fechaPTP?.seconds || 0));
          
          if (isMountedRef.current) {
            setCreditosPendientes(creditos);
            setLoadingCreditos(false);
          }
        },
        (error) => {
          console.log('🔇 Snapshot de créditos silenciado:', error.code);
          if (isMountedRef.current) setLoadingCreditos(false);
        }
      );

      return () => unsubscribeCreditos();
    } catch (error) {
      console.error('❌ Error configurando listener de créditos:', error);
      if (isMountedRef.current) setLoadingCreditos(false);
    }
  }, [cuentaId, user, loadingAuth]);

  // ==========================================
  // ACCIONES Y NAVEGACIÓN
  // ==========================================
  const cerrarMenu = () => setMenuVisible(false);

  const handleNavigation = (screen) => {
    cerrarMenu();
    onNavigate(screen);
  };

  const handleMenuNavigation = (accion, requierePremium) => {
    // 1. Cerramos el menú siempre para una sensación ágil
    setMenuVisible(false); 

    // 2. Evaluamos si es un feature bloqueado (¡Ahora respetando los súper poderes!)
    if (requierePremium && !hasPremiumPowers) {
      // 🎣 ¡Carnada exitosa! Lo mandamos directo a comprar
      onNavigate('upgrade'); 
    } else {
      // 3. Ejecutar acción (con un micro-retraso para que el menú termine de cerrarse)
      setTimeout(() => {
        if (accion === 'escaner') setModalEventoVisible(true);
        else if (accion === 'feedback') setModalFeedbackVisible(true);
        else onNavigate(accion);
      }, 300);
    }
  };


  // ==========================================
  // RENDER PANTALLAS DE CARGA
  // ==========================================
  if (loadingAuth || loadingStats) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.turquesa} />
        <Text style={[styles.loadingText, { color: themeColors.text }]}>Cargando...</Text>
      </View>
    );
  }

  const hasPremiumPowers = effectiveTier === 'premium' || effectiveTier === 'special_k';

  const formatFechaPTPLocal = (fechaPTP) => {
    if (!fechaPTP) return 'N/A';
    if (typeof fechaPTP === 'object' && typeof fechaPTP.seconds === 'number') {
      return new Date(fechaPTP.seconds * 1000).toLocaleDateString('es-MX');
    }
    if (typeof fechaPTP === 'string') {
      const [año, mes, dia] = fechaPTP.split('-');
      if (año && mes && dia) return `${dia}/${mes}/${año}`;
    }
    return 'N/A';
  };

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: themeColors.header || themeColors.bg }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>INVENTARIAJE</Text>
            <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>by FherLaRush</Text>
          </View>

          {/* Lado Derecho: Controles (Campana + Menú) */}
          <View style={styles.headerRightControls}>
            
            {/* 🔔 CAMPANA DE NOTIFICACIONES */}
            <TouchableOpacity
              style={[
                styles.bellButton,
                hayNotificaciones 
                  ? styles.bellButtonActive 
                  : [styles.bellButtonInactive, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]
              ]}
              onPress={() => setGeneralNotificationsModal(true)} 
            >
              <Ionicons 
                name={hayNotificaciones ? "notifications" : "notifications-outline"} 
                size={22} 
                color={hayNotificaciones ? COLORS.blanco : themeColors.textSecondary} 
              />
              {hayNotificaciones && <View style={styles.bellBadge} />}
            </TouchableOpacity>
          
            {/* MENÚ HAMBURGUESA (Cambiado a Ionicons para que respete el Dark Mode) */}
            <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
              <Ionicons name="menu" size={32} color={themeColors.text} />
            </TouchableOpacity>

          </View>
        </View>

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
          <Text style={[styles.welcomeSubtitle, { color: themeColors.text }]}>Te damos la bienvenida</Text>
          <Text style={styles.welcomeTitle}>{userData?.nombre || 'Usuario'}</Text>
          <Text style={[styles.welcomeSubtitle, { color: themeColors.textSecondary }]}>Gestiona tu inventario y ventas</Text>
        </View>

        {/* INFO DE TRIAL */}
        {trialInfo?.isActive && (
          <View style={[styles.trialCard, { backgroundColor: themeColors.cardBg }]}>
            <Text style={[styles.trialTitle, { color: themeColors.text }]}>
              💎 Free Premium Version - {trialInfo.daysRemaining} días restantes
            </Text>
            <Text style={[styles.trialSubtitle, { color: themeColors.textSecondary }]}>
              Disfruta de las funciones premium hasta el {trialInfo.expiresAt.toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* DASHBOARD PRINCIPAL */}
        <View style={styles.dashboardSection}>

          <TouchableOpacity
            style={[styles.dashboardBtn, { backgroundColor: COLORS.turquesa, marginTop: 30 }]}
            onPress={() => handleNavigation('existencias')}
            activeOpacity={0.8}
          >
            <View style={styles.dashboardBtnContent}>
              <View style={styles.dashboardBtnText}>
                <Text style={[styles.dashboardLabelExistencia, { color: '#1b4848' }]}>Total{"\n"}en existencia</Text>
                <Text style={styles.dashboardValueExistencia}>{stats.totalEnExistencia} unidades</Text>
              </View>
            </View>
            <Image source={ImgExistencia} style={styles.ImagenExistencia} />
            <View style={styles.dashboardBtnTextBtn}>
                <Text style={styles.dashboardArrow}>→</Text>
            </View>
          </TouchableOpacity>

          {/* STOCK */}
          <View style={styles.dashboardRow}>
            <View style={styles.dashboardColumn}>
                <TouchableOpacity
                  style={[styles.dashboardBtn, styles.dashboardBtnStocks, { backgroundColor: themeColors.cardBg }]}
                  onPress={() => handleNavigation('bajo-stock')}
                  activeOpacity={0.8}
                >
                  <View style={styles.dashboardBtnContent}>
                    <View style={styles.dashboardBtnText}>
                      <Text style={[styles.dashboardLabelBajoStock, { color: darkMode ? '#F97316' : '#E6672E' }]}>Bajo Stock</Text>
                      <Text style={[styles.dashboardValueStocks, { color: themeColors.text }]}>{stats.bajoStock} productos</Text>
                    </View>
                  </View>
                  <View style={styles.dashboardBtnTextBtn}>
                  <Text style={[styles.dashboardArrow, { color: COLORS.turquesa, borderColor: COLORS.turquesa }]}>→</Text>
                  </View>
                </TouchableOpacity>
            </View>

            <View style={styles.dashboardColumn}>
                <TouchableOpacity
                  style={[styles.dashboardBtn, styles.dashboardBtnStocks, { backgroundColor: themeColors.cardBg }]}
                  onPress={() => handleNavigation('sin-stock')}
                  activeOpacity={0.8}
                >
                  <View style={styles.dashboardBtnContent}>
                    <View style={styles.dashboardColumn}>
                      <Text style={[styles.dashboardLabelSinStock, { color: darkMode ? '#EF4444' : '#991B1B' }]}>Sin Stock</Text>
                      <Text style={[styles.dashboardValueStocks, { color: themeColors.text }]}>{stats.productosSinStock} productos</Text>
                    </View>
                  </View>
                  <View style={styles.dashboardBtnTextBtn}>
                  <Text style={[styles.dashboardArrow, { color: COLORS.turquesa, borderColor: COLORS.turquesa }]}>→</Text>
                  </View>
                </TouchableOpacity>
            </View>
          </View>
          {/* VENTAS DEL MES */}
          <TouchableOpacity
            style={[styles.dashboardBtn, styles.dashboardBtnVentas]}
            onPress={() => hasPremiumPowers ? handleNavigation('analytics') : handleNavigation('upgrade')}
            activeOpacity={hasPremiumPowers ? 0.8 : 1}
          >
            <View style={styles.dashboardBtnContent}>
              <View style={[styles.dashboardBtnText, { height: 125, paddingTop: 10,}]}>
                <Text style={[styles.dashboardLabelVentas, {  }]}>
                    Ventas
                    {"\n"}del Mes</Text>
                <Text style={styles.dashboardValueExistencia}>Ganancias en el mes</Text>
              </View>
            </View>
            <Image source={ImgVenta} style={styles.ImagenVenta} />
            <Text style={styles.dashboardValueVenta}>${stats.ventasDelMes || '0.00'}</Text>
            <View style={styles.dashboardBtnTextBtn}>
              <Text style={styles.dashboardArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SECCIÓN 2: EVENTO DE ESCÁNER */}
        <View style={styles.scannerSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            <FontAwesome6 name="heart-pulse" size={22} color="red" /> Evento de Escáner
          </Text>

          {eventoActivo ? (
            <View style={[styles.eventoCard, { backgroundColor: themeColors.bgSecondary }]}>
              <View style={styles.eventoHeader}>
                <Text style={[styles.eventoTitle, { color: themeColors.text }]}>{eventoActivo.evento}</Text>
                <Text style={styles.eventoStatus}>Activo</Text>
              </View>

              {/* Cálculos del Escáner en vivo */}
              {(() => {
                const ingresoEscaneos = (eventoActivo.escaneos || 0) * (eventoActivo.montoCobrado || 0);
                return (
                  <View style={styles.eventoDetails}>
                    <View style={styles.eventoDetailRow}>
                      <Text style={[styles.eventoLabel, { color: themeColors.textSecondary }]}>Venta escaner:</Text>
                      <Text style={[styles.eventoValue, { color: themeColors.text }]}>${ingresoEscaneos.toFixed(2)}</Text>
                    </View>

                    <View style={styles.eventoDetailRow}>
                      <Text style={[styles.eventoLabel, { color: themeColors.textSecondary }]}>Escaneos:</Text>
                      <Text style={[styles.eventoValue, { color: themeColors.text }]}>{eventoActivo.escaneos} x</Text>
                    </View>  
                  </View>
                );
              })()}

              <View style={styles.eventoButtons}>
                <TouchableOpacity style={[styles.eventoBtnEdit, { backgroundColor: COLORS.turquesa }]} onPress={() => setModalEventoVisible(true)}>
                  <Text style={styles.eventoBtnText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventoBtnFinish, { backgroundColor: COLORS.verde }]}
                  onPress={() => {
                    Alert.alert('Finalizar Evento', `Cerrar "${eventoActivo.evento}"?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Finalizar',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const ahora = new Date();
                            const ingresoEscaneos = (eventoActivo.escaneos || 0) * (eventoActivo.montoCobrado || 0);

                            const eventoRef = doc(db, 'cuentas', String(cuentaId), 'escaneres', eventoActivo.id);
                            await updateDoc(eventoRef, { estado: 'finalizado', updatedAt: ahora.toISOString() });
                            
                            if (ingresoEscaneos > 0) {
                              const salidasRef = collection(db, 'cuentas', String(cuentaId), 'salidas');
                              await addDoc(salidasRef, {
                                tipo: 'ingreso_escaner', 
                                tipoPago: 'efectivo', 
                                producto: `Escaner: ${eventoActivo.evento}`,
                                cantidad: eventoActivo.escaneos || 0,
                                total: ingresoEscaneos,
                                timestamp: ahora.toISOString(),
                                usuario: user?.email || 'App',
                                creadoPorUid: user.uid,
                                escanerId: eventoActivo.id,
                                nombreEvento: eventoActivo.evento,
                                escanerInvitados: eventoActivo.personas || 0,
                                escanerMonto: eventoActivo.montoCobrado || 0,
                              });
                            }

                            await AsyncStorage.removeItem('escanerActual');
                            setEventoActivo(null);
                            Alert.alert('✅ Éxito', 'Evento finalizado, ingresos registrados.');
                            
                            setLoadingStats(true); 
                            if (typeof cargarEstadisticas === 'function') {
                                await cargarEstadisticas(); 
                            } else {
                                setLoadingStats(false); 
                            }
                          } catch (error) {
                            setLoadingStats(false); 
                            Alert.alert('Error', 'No se pudo finalizar el evento de manera correcta.');
                          }
                        }
                      }
                    ]);
                  }}
                >
                  <Text style={styles.eventoBtnText}>Finalizar y Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.eventoBtnCreate, { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.border }]} onPress={() => setModalEventoVisible(true)}>
              <View>
                <Text style={[styles.eventoBtnCreateText, { color: themeColors.text }]}>Crear Evento de Escáner</Text>
                <Text style={[styles.eventoBtnCreateSubtext, { color: themeColors.textSecondary }]}>Registro de Scanner Party</Text>
              </View>
              <View style={styles.dashboardBtnTextBtn}>
                <Text style={[styles.dashboardArrow, { color: COLORS.turquesa, borderColor: COLORS.turquesa }]}>→</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        
        {/* SECCIÓN 3: CRÉDITOS PENDIENTES */}
        {hasPremiumPowers && (
          <TouchableOpacity 
            onPress={() => handleNavigation('clientes')}
            activeOpacity={0.7}
            style={{ marginBottom: 80 }} 
          >
            {/* 🚀 FIX: Ícono y texto separados */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <FontAwesome name="credit-card-alt" size={22} color="darkblue" />
              <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 0, marginLeft: 8 }]}>
                Créditos Pendientes
              </Text>
            </View>

            <View style={[styles.creditoCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>          
              {loadingCreditos ? (
                <ActivityIndicator color={COLORS.turquesa} />
              ) : creditosPendientes.length === 0 ? (
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  No tienes creditos pendientes
                </Text>
              ) : (
                <View>
                  {creditosPendientes.slice(0, 3).map((credito) => (
                    <View key={credito.id} style={[styles.creditoItem, { borderBottomColor: themeColors.border }]}>
                      <View style={styles.creditoInfo}>
                        <Text style={[styles.creditoNombre, { color: themeColors.text }]}>{credito.clienteNombre}</Text>
                        <Text style={[styles.creditoFecha, { color: themeColors.textSecondary }]}>
                          Promesa de pago: {formatFechaPTPLocal(credito.fechaPTP)}
                        </Text>
                      </View>
                      <Text style={styles.creditoMonto}>${credito.monto.toFixed(2)}</Text>
                    </View>
                  ))}
                  {creditosPendientes.length > 3 && (
                    <Text style={[styles.masCreditos, { color: COLORS.turquesa }]}>+{creditosPendientes.length - 3} más</Text>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ========================================== */}
      {/* 🔔 MODALES Y OVERLAYS */}
      {/* ========================================== */}

      <ModalRegistroEscaner
        visible={modalEventoVisible}
        onClose={() => setModalEventoVisible(false)}
        onSuccess={async (nuevoEvento) => {
          setEventoActivo(nuevoEvento);
          await AsyncStorage.setItem('escanerActual', JSON.stringify(nuevoEvento));
        }}
        cuentaId={cuentaId}
        eventoEdicion={eventoActivo}
      />

      <ModalExchange
        visible={modalBuzonVisible}
        onClose={() => setModalBuzonVisible(false)}
        peticiones={peticionesBuzon}
        miCuentaId={cuentaId}
        miEmail={user?.email}
      />

      {/* CENTRO DE NOTIFICACIONES */}
      <Modal
        visible={generalNotificationsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setGeneralNotificationsModal(false)}
      >
        <TouchableOpacity 
          style={GLOBAL_STYLES.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setGeneralNotificationsModal(false)}
        >
          <View style={[GLOBAL_STYLES.modalContent, { backgroundColor: themeColors.bg, marginTop: '20%', maxHeight: '80%' }]}>
            <Text style={[GLOBAL_STYLES.textPrimary, { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: themeColors.text }]}>
              Centro de Notificaciones
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* 1. AVISOS APP */}
              {avisosApp.map(aviso => (
                <View key={aviso.id} style={[styles.notificationOptionBtn, { 
                    backgroundColor: darkMode ? 'rgba(29, 78, 216, 0.15)' : '#EFF6FF', 
                    borderColor: darkMode ? '#1E3A8A' : '#BFDBFE' 
                }]}>
                  <Text style={{ fontSize: 24, marginRight: 15 }}>📢</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: darkMode ? '#60A5FA' : '#1D4ED8' }}>{aviso.titulo}</Text>
                    <Text style={{ fontSize: 13, color: darkMode ? '#93C5FD' : '#1D4ED8' }}>{aviso.mensaje}</Text>
                  </View>
                </View>
              ))}

              {/* 2. TRIAL */}
              {!!alertaTrial && (
                <TouchableOpacity 
                  style={[styles.notificationOptionBtn, { 
                      backgroundColor: darkMode ? 'rgba(161, 98, 7, 0.15)' : '#FEF9C3', 
                      borderColor: darkMode ? '#713F12' : '#FDE047' 
                  }]}
                  onPress={() => {
                    setGeneralNotificationsModal(false);
                    onNavigate('upgrade');
                  }}
                >
                  <Text style={{ fontSize: 24, marginRight: 15 }}>⏳</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: darkMode ? '#FDE047' : '#A16207' }}>Atención con tu Plan</Text>
                    <Text style={{ fontSize: 13, color: darkMode ? '#FEF08A' : '#A16207' }}>{alertaTrial.mensaje}</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: darkMode ? '#FDE047' : '#A16207' }}>›</Text>
                </TouchableOpacity>
              )}

              {/* 3. INTERCAMBIOS */}
              {peticionesBuzon.length > 0 && (
                <TouchableOpacity 
                  style={[styles.notificationOptionBtn, { 
                      backgroundColor: darkMode ? 'rgba(2, 132, 199, 0.15)' : '#E0F2FE',
                      borderColor: darkMode ? '#0369A1' : '#E0F2FE'
                  }]}
                  onPress={() => {
                    setGeneralNotificationsModal(false);
                    setTimeout(() => setModalBuzonVisible(true), 150);
                  }}
                >
                  <View style={{ marginRight: 15, justifyContent: 'center' }}>
                    <FontAwesome6 name="arrows-rotate" size={24} color={themeColors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: themeColors.text }}>Intercambios Pendientes</Text>
                    <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>Tienes {peticionesBuzon.length} solicitudes.</Text>
                  </View>
                  <View style={styles.badgeMini}><Text style={styles.badgeMiniText}>{peticionesBuzon.length}</Text></View>
                </TouchableOpacity>
              )}

              {/* 4. STOCK */}
              {conteoAlertasStock > 0 && (
                <TouchableOpacity 
                  style={[styles.notificationOptionBtn, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}
                  onPress={() => {
                    setGeneralNotificationsModal(false);
                    onNavigate('alertas'); 
                  }}
                >
                  <View style={{ marginRight: 15, justifyContent: 'center' }}>
                    <FontAwesome6 name="box-archive" size={24} color="brown" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: themeColors.text }}>Alertas de Bajo Stock</Text>
                    <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>{conteoAlertasStock} productos requieren restock.</Text>
                  </View>
                  <View style={[styles.badgeMini, { backgroundColor: '#E6672E' }]}><Text style={styles.badgeMiniText}>{conteoAlertasStock}</Text></View>
                </TouchableOpacity>
              )}

              {/* 5. CRÉDITOS */}
              {conteoCreditosAlertas > 0 && hasPremiumPowers && (
                <TouchableOpacity 
                  style={[styles.notificationOptionBtn, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}
                  onPress={() => {
                    setGeneralNotificationsModal(false);
                    onNavigate('clientes');
                  }}
                >
                  <View style={{ marginRight: 15, justifyContent: 'center' }}>
                    <FontAwesome name="credit-card-alt" size={22} color="darkblue" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: themeColors.text }}>Cobros por Vencer</Text>
                    <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>{conteoCreditosAlertas} crédito(s) vencen pronto.</Text>
                  </View>
                  <View style={[styles.badgeMini, { backgroundColor: '#E6672E' }]}><Text style={styles.badgeMiniText}>{conteoCreditosAlertas}</Text></View>
                </TouchableOpacity>
              )}

              {!hayNotificaciones && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>✨</Text>
                  <Text style={{ textAlign: 'center', color: themeColors.textSecondary }}>Estás al día. No tienes notificaciones pendientes.</Text>
                </View>
              )}

            </ScrollView>

            <TouchableOpacity 
              style={[GLOBAL_STYLES.btnPrimary, { marginTop: 20 }]}
              onPress={() => setGeneralNotificationsModal(false)}
            >
              <Text style={GLOBAL_STYLES.btnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL MENU LATERAL */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={cerrarMenu}>
        <Pressable style={styles.modalOverlay} onPress={cerrarMenu}>
          <Pressable style={styles.menuPressable} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.menuModal, { backgroundColor: themeColors.bgSecondary }]}>
              
              <View style={styles.menuHeader}>
                <Text style={[styles.menuTitle, { color: themeColors.text }]}>Menú</Text>
                <TouchableOpacity onPress={cerrarMenu}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('Configuración')}>
                <Text style={styles.menuItemIcon}><Fontisto name="player-settings" size={24} color={themeColors.textSecondary} /></Text>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>Configuración</Text>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>

              <View style={[styles.menuSeparator, { backgroundColor: themeColors.border }]} />

              <View style={styles.menuFeatureSection}>
                <Text style={[styles.menuFeatureTitle, { color: themeColors.textSecondary }]}>Premium Features</Text>

                {hasPremiumPowers ? (
                  <>
                    <TouchableOpacity style={styles.menuFeatureItem} onPress={() => handleNavigation('analytics')}>
                      <Text style={styles.menuItemIcon}><MaterialCommunityIcons name="google-analytics" size={24} color={themeColors.textSecondary} /></Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.text }]}>Analytics</Text></View>
                      <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuFeatureItem} onPress={() => handleNavigation('clientes')}>
                      <Text style={styles.menuItemIcon}><Fontisto name="persons" size={24} color={themeColors.textSecondary} /></Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.text }]}>Clientes</Text></View>
                      <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}><MaterialCommunityIcons name="google-analytics" size={24} color={themeColors.textSecondary} /></Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>Analytics</Text></View>
                      <Text style={styles.menuFeatureLockIcon}><Ionicons name="diamond" size={18} color={COLORS.turquesa} /></Text>
                    </View>

                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}><Fontisto name="persons" size={24} color={themeColors.textSecondary} /></Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>Clientes</Text></View>
                      <Text style={styles.menuFeatureLockIcon}><Ionicons name="diamond" size={18} color={COLORS.turquesa} /></Text>
                    </View>

                    <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: themeColors.cardBg, borderColor: COLORS.turquesa, borderWidth: 1 }]} onPress={() => handleNavigation('upgrade')}>
                      <Text style={[styles.BtnText, { textDecorationLine: 'underline', color: COLORS.turquesa, fontWeight: 'bold' }]}>Upgrade a Premium</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={[styles.menuSeparator, { backgroundColor: themeColors.border }]} />

              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setTimeout(() => setModalFeedbackVisible(true), 350); }}>
                <Text style={styles.menuItemIcon}><Foundation name="lightbulb" size={24} color={themeColors.textSecondary} /></Text>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>Enviar Feedback</Text>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('ayuda')}>
                <Text style={styles.menuItemIcon}><Entypo name="book" size={24} color={themeColors.textSecondary} /></Text>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>Guía de Uso</Text>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>
              
              <View style={[styles.menuSeparator, { backgroundColor: themeColors.border }]} />

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('logout')}>
                <Text style={styles.menuItemIcon}><Ionicons name="exit-outline" size={24} color="#F16464" /></Text>
                <Text style={[styles.menuItemText, { color: '#F16464' }]}>Cerrar Sesión</Text>
                <Text style={[styles.menuItemArrow, { color: '#F16464' }]}>→</Text>
              </TouchableOpacity>
              
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ModalFeedback visible={modalFeedbackVisible} onClose={() => setModalFeedbackVisible(false)} usuarioEmail={user?.email} cuentaId={cuentaId} />
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
  header: {
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.content_padding,
    paddingBottom: 20, 
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  bellButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 3,
    position: 'relative'
  },
  bellButtonInactive: { 
    borderWidth: 1, 
  },
  bellButtonActive: { 
    backgroundColor: '#7A7AEC',
  },
  headerBorderGradient: {
    height: 2,
    width: '100%',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.pequeño,
    fontStyle: 'italic',
  },
  menuBtn: {
    padding: 0,
  },
  content: {
    flex: 1,
    padding: SPACING.content_padding,
  },
  welcomeSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.titulo,
    fontWeight: '700',
    color: COLORS.turquesa,
    fontStyle: 'italic',
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.normal,
    fontStyle: 'italic',
  },
  trialCard: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  trialTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trialSubtitle: {
    fontSize: 12,
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
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardBtnStocks: {
    borderWidth: 1,
    borderColor: COLORS.turquesa,
  },
  dashboardBtnVentas: {
    backgroundColor: COLORS.lila,
  },
  dashboardBtnContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardBtnText: {
    flex: 1,
    
  },
  dashboardLabelExistencia: {
    fontFamily: 'Poppins',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 4,
  },
  dashboardLabelSinStock: {
    fontFamily: 'Poppins',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 21,
    marginBottom: 0,
  },
  dashboardLabelBajoStock: {
    fontFamily: 'Poppins',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 21,
    marginBottom: 0,
  },
  dashboardLabelVentas: {
    fontSize: 38,
    fontWeight: '800',
    color: '#7A7AEC',
    lineHeight: 36,
    marginBottom: 4,
  },
  dashboardValueExistencia: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '600',
    color: '#1b4848',
    marginBottom: 'auto',
  },
  dashboardValueStocks: {
    fontFamily: 'Roboto',
    fontSize: 16,
    fontWeight: '700',
  },
  dashboardValueVenta: {
    fontFamily: 'Roboto',
    fontSize: 30,
    fontWeight: '600',
    paddingTop: 10,
  },
  dashboardBtnTextBtn: {
    position: 'absolute',
    right: 15,
    bottom: 15,
  },
  dashboardArrow: {
    width: 'auto',
    fontSize: 20,
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '700',
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 50,
    paddingHorizontal: 6,
    paddingBottom: 5,
    opacity: 0.5,
  },
  dashboardRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  dashboardColumn: {
    flex: 1,
    paddingHorizontal: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  ImagenExistencia: {
    position: 'absolute',
    top: -50,
    right: 20,
    width: 130,
  },
  ImagenVenta: {
    position: 'absolute',
    right: 0,
    top: 0,
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
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: 15,
    paddingTop: 60,
  },
  menuTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 28,
    color: COLORS.turquesa,
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
    marginVertical: 0,
    backgroundColor: COLORS.gris,
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
    alignItems: 'center',
  },
  scannerSection: {
    marginBottom: 20,
  },
  eventoCard: {
    borderRadius: 12,
    padding: 16,
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
    textTransform: 'uppercase',
    fontWeight: '700',
    flex: 1,
  },
  eventoStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.verde,
    borderWidth: 1,
    borderColor: COLORS.verde,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    borderWidth: 1,
    marginBottom: 12,
  },
  eventoBtnCreateText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
  },
  eventoBtnCreateSubtext: {
    fontSize: FONT_SIZES.pequeño,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  creditoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
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
    color: COLORS.rojo,
    marginLeft: 10,
  },
  masCreditos: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  notificationOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  badgeMini: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeMiniText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});