import React, { useState, useEffect, useRef, useContext } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import ModalRegistroEscaner from '../components/ModalRegistroEscaner';
import ModalExchange from '../components/ModalExchange';
import ModalFeedback from '../components/ModalFeedback';

// ICONS
import MenuIcon from '../assets/icons/IconMenu.svg';


LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

// ==========================================
// CONSTANTES Y THEME
// ==========================================
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

export default function HomeScreen({ onNavigate, darkMode, themeColors }) {
  // ==========================================
  // ESTADOS Y CONTEXTOS
  // ==========================================
  const { user, userData, cuenta, cuentaId, loading: loadingAuth } = useContext(AuthContext);
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

  // ESTADOS Y EFECTO: Buzón de Intercambios
  const [peticionesBuzon, setPeticionesBuzon] = useState([]);
  const [modalBuzonVisible, setModalBuzonVisible] = useState(false);

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
  // EFECTO 2: Cargar Estadísticas
  // ==========================================
  useEffect(() => {
    if (loadingAuth) return;
    if (!user || !cuentaId) return;

    const cargarEstadisticas = async () => {
      if (!isMountedRef.current) return;
      
      try {
        setLoadingStats(true);
        
        // 1. INVENTARIO
        const docRef = doc(db, 'cuentas', String(cuentaId), 'inventarios', 'vital_health_principal');
        const docSnap = await getDoc(docRef);
        const productos = docSnap.data()?.productos || {};
        
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
          if (cantidad === 0) productosSinStock += 1;
        });

        // 2. VENTAS DEL MES
        const ahora = new Date();
        const primerDiaDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const ultimoDiaDelMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

        const salidasRef = collection(db, 'cuentas', String(cuentaId), 'salidas');
        
        // 🛡️ LÓGICA INTELIGENTE DE ROLES (FASE 4)
        let salidasQuery = salidasRef; // Por defecto (Admin) carga la colección completa
        
        if (userData?.rol !== 'admin') {
          // Si es 'user', aplicamos el filtro mágico para traer solo sus tickets
          salidasQuery = query(salidasRef, where('creadoPorUid', '==', user.uid));
        }

        // Ejecutamos la consulta usando la variable que preparamos (salidasQuery)
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
              
              // Sumar a la caja SOLO si NO es crédito
              if (data.tipoPago !== 'crd') {
                ventasDelMes += total;
              }

              // Registrar TODO en el historial
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
          setStats({
            totalEnExistencia,
            productosSinStock,
            ventasDelMes: parseFloat(ventasDelMes.toFixed(2)),
            ultimasOperaciones: ultimasOperaciones,
          });
        }
      } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
      } finally {
        if (isMountedRef.current) setLoadingStats(false);
      }
    };

    cargarEstadisticas();
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

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>INVENTARIAJE</Text>
            <Text style={styles.headerSubtitle}>by FherLaRush</Text>
          </View>

          {/* Lado Derecho: Controles (Campana + Menú) */}
          <View style={styles.headerRightControls}>
            
            {/* 🔔 CAMPANA DE NOTIFICACIONES */}
            <TouchableOpacity
              style={[
                styles.bellButton,
                peticionesBuzon.length > 0 ? styles.bellButtonActive : styles.bellButtonInactive
              ]}
              onPress={() => setModalBuzonVisible(true)}
            >
              <Ionicons 
                name={peticionesBuzon.length > 0 ? "notifications" : "notifications-outline"} 
                size={22} 
                color={peticionesBuzon.length > 0 ? COLORS.blanco : COLORS.grey} 
              />
              {/* Badge (Puntito rojo) */}
              {peticionesBuzon.length > 0 && (
                <View style={styles.bellBadge} />
              )}
            </TouchableOpacity>
          
          {/* MENÚ HAMBURGUESA */}
            <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
              <MenuIcon width={36} height={36} />
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
          <Text style={[styles.welcomeSubtitle, { color: themeColors.text }]}>
            Te damos la bienvenida
          </Text>
          <Text style={styles.welcomeTitle}>
            {userData?.nombre || 'Usuario'}
          </Text>
        </View>

        {/* INFO DE TRIAL */}
        {trialInfo?.isActive && (
          <View style={styles.trialCard}>
            <Text style={styles.trialTitle}>
              💎 Free Premium Version - {trialInfo.daysRemaining} días restantes
            </Text>
            <Text style={styles.trialSubtitle}>
              Disfruta de las funciones premium hasta el {trialInfo.expiresAt.toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* DASHBOARD PRINCIPAL */}
        <View style={styles.dashboardSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>📊 INICIO</Text>

          <TouchableOpacity
            style={[styles.dashboardBtn, { backgroundColor: themeColors.bgSecondary }]}
            onPress={() => handleNavigation('existencias')}
            activeOpacity={0.8}
          >
            <View style={styles.dashboardBtnContent}>
              <Text style={styles.dashboardIcon}>📦</Text>
              <View style={styles.dashboardBtnText}>
                <Text style={[styles.dashboardLabel, { color: themeColors.text }]}>Total en Existencia</Text>
                <Text style={styles.dashboardValue}>{stats.totalEnExistencia} unidades</Text>
              </View>
            </View>
            <Text style={styles.dashboardArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dashboardBtn, styles.dashboardBtnWarning, { backgroundColor: themeColors.bgSecondary }]}
            onPress={() => handleNavigation('sin-stock')}
            activeOpacity={0.8}
          >
            <View style={styles.dashboardBtnContent}>
              <Text style={styles.dashboardIcon}>⚠️</Text>
              <View style={styles.dashboardBtnText}>
                <Text style={[styles.dashboardLabel, { color: themeColors.text }]}>Productos sin Stock</Text>
                <Text style={styles.dashboardValueWarning}>{stats.productosSinStock} productos</Text>
              </View>
            </View>
            <Text style={styles.dashboardArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dashboardBtn, { backgroundColor: themeColors.bgSecondary }]}
            onPress={() => handleNavigation('analytics')}
            activeOpacity={0.8}
          >
            <View style={styles.dashboardBtnContent}>
              <Text style={styles.dashboardIcon}>💰</Text>
              <View style={styles.dashboardBtnText}>
                <Text style={[styles.dashboardLabel, { color: themeColors.text }]}>Ventas del Mes</Text>
                <Text style={styles.dashboardValue}>${stats.ventasDelMes || '0.00'}</Text>
              </View>
            </View>
            <Text style={styles.dashboardArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* SECCIÓN 2: EVENTO DE ESCÁNER (PREMIUM) */}
        {effectiveTier === 'premium' && (
        <View style={styles.scannerSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>💻 Evento de Escáner</Text>

          {eventoActivo ? (
            <View style={[styles.eventoCard, { backgroundColor: themeColors.bgSecondary }]}>
              <View style={styles.eventoHeader}>
                <Text style={[styles.eventoTitle, { color: themeColors.text }]}>{eventoActivo.evento}</Text>
                <Text style={styles.eventoStatus}>🟢 Activo</Text>
              </View>

              {/* Cálculos del Escáner en vivo */}
              {(() => {
                const ingresoEscaneos = (eventoActivo.escaneos || 0) * (eventoActivo.montoCobrado || 0);
                const ventasProductos = eventoActivo.ventaTotal || 0;
                const totalGlobal = ingresoEscaneos + ventasProductos;

                return (
                  <View style={styles.eventoDetails}>
                    <View style={styles.eventoDetailRow}>
                      <Text style={[styles.eventoLabel, { color: themeColors.textSecondary }]}>Venta escaner:</Text>
                      <Text style={[styles.eventoValue, { color: themeColors.text }]}>${ingresoEscaneos.toFixed(2)}</Text>
                    </View>

                    <View style={styles.eventoDetailRow}>
                      <Text style={[styles.eventoLabel, { color: themeColors.textSecondary }]}>Escaneos:</Text>
                      <Text style={[styles.eventoValue, { color: themeColors.text }]}>{eventoActivo.escaneos} px</Text>
                    </View>  

                    {/* // == logica compleja, desarrollo despues: traer al card el total de ventas del evento */}
                    {/* <View style={styles.eventoDetailRow}>
                      <Text style={[styles.eventoLabel, { color: themeColors.textSecondary }]}>Ventas:</Text>
                      <Text style={[styles.eventoValue, { color: themeColors.text }]}>${ventasProductos.toFixed(2)}</Text>
                    </View>

                    <View style={styles.eventoDetailRow}>
                      <Text style={[styles.eventoLabel, { color: themeColors.textSecondary, fontWeight: 'bold' }]}>TOTAL EVENTO:</Text>
                      <Text style={styles.eventoValueMoney}>${totalGlobal.toFixed(2)}</Text>
                    </View> */}
                  </View>
                );
              })()}

              <View style={styles.eventoButtons}>
                <TouchableOpacity style={[styles.eventoBtnEdit, { backgroundColor: COLORS.turquesa }]} onPress={() => setModalEventoVisible(true)}>
                  <Text style={styles.eventoBtnText}>✏️ Editar</Text>
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

                            // 1. Actualizar estado del evento a 'finalizado'
                            const eventoRef = doc(db, 'cuentas', String(cuentaId), 'escaneres', eventoActivo.id);
                            await updateDoc(eventoRef, { estado: 'finalizado', updatedAt: ahora.toISOString() });
                            
                            // 2. CREAR TICKET DE CAJA
                            if (ingresoEscaneos > 0) {
                              const salidasRef = collection(db, 'cuentas', String(cuentaId), 'salidas');
                              await addDoc(salidasRef, {
                                tipo: 'ingreso_escaner', // Lo marcamos para que sepas de dónde vino
                                tipoPago: 'efectivo', 
                                producto: `Escaner: ${eventoActivo.evento}`,
                                cantidad: eventoActivo.escaneos || 0,
                                total: ingresoEscaneos,
                                timestamp: ahora.toISOString(),
                                usuario: user?.email || 'App'
                              });
                            }

                            // 3. Limpiar el evento de la memoria del teléfono
                            await AsyncStorage.removeItem('escanerActual');
                            setEventoActivo(null);
                            Alert.alert('✅ Éxito', 'Evento finalizado, ingresos registrados.');
                            
                            // 4. Refrescar estadísticas y MATAR el loader
                            console.log('4️⃣ Recargando estadísticas de pantalla...');
                            setLoadingStats(true); // Encendemos loader temporal
                            
                            // Forzamos la recarga si existe la función, si no, solo apagamos el loader
                            if (typeof cargarEstadisticas === 'function') {
                                await cargarEstadisticas(); 
                                // Nota: cargarEstadisticas normalmente tiene su propio setLoadingStats(false) al final
                            } else {
                                setLoadingStats(false); 
                            }
                            console.log('🏁 --- CIERRE DE EVENTO COMPLETADO ---');
                            
                          } catch (error) {
                            console.error('❌ ERROR DURANTE EL CIERRE DE EVENTO:', error);
                            setLoadingStats(false); // 🛡️ SEGURO: Apagar spinner si algo explota
                            Alert.alert('Error', 'No se pudo finalizar el evento de manera correcta.');
                          }
                        }
                      }
                    ]);
                  }}
                >
                  <Text style={styles.eventoBtnText}>💾 Finalizar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.eventoBtnCreate, { backgroundColor: themeColors.bgSecondary }]} onPress={() => setModalEventoVisible(true)}>
              <View>
                <Text style={[styles.eventoBtnCreateText, { color: themeColors.text }]}>Crear Evento de Escáner</Text>
                <Text style={[styles.eventoBtnCreateSubtext, { color: themeColors.textSecondary }]}>Registro de Scanner Party</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        )}

        {/* SECCIÓN 3: CRÉDITOS PENDIENTES (PREMIUM) */}
        {effectiveTier === 'premium' && (
          <TouchableOpacity 
            onPress={() => handleNavigation('clientes')}
            activeOpacity={0.7}
            style={{ marginBottom: 80 }} 
          >
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>💳 Créditos Pendientes</Text>

            <View style={styles.creditoCard}>          
              {loadingCreditos ? (
                <ActivityIndicator color={COLORS.turquesa} />
              ) : creditosPendientes.length === 0 ? (
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  No tienes creditos pendientes
                </Text>
              ) : (
                <View>
                  {creditosPendientes.slice(0, 3).map((credito) => (
                    <View key={credito.id} style={[styles.creditoItem, { borderBottomColor: darkMode ? '#444' : '#f0f0f0' }]}>
                      <View style={styles.creditoInfo}>
                        <Text style={[styles.creditoNombre, { color: themeColors.text }]}>{credito.clienteNombre}</Text>
                        <Text style={[styles.creditoFecha, { color: themeColors.textSecondary }]}>
                          Promesa de pago: {new Date(credito.fechaPTP.seconds * 1000).toLocaleDateString('es-MX')}
                        </Text>
                      </View>
                      <Text style={styles.creditoMonto}>${credito.monto.toFixed(2)}</Text>
                    </View>
                  ))}
                  {creditosPendientes.length > 3 && (
                    <Text style={[styles.masCreditos, { color: themeColors.turquesa }]}>+{creditosPendientes.length - 3} más</Text>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* MODAL REGISTRO DE ESCÁNER */}
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

      {/* MODAL BUZÓN DE INTERCAMBIOS */}
      <ModalExchange
        visible={modalBuzonVisible}
        onClose={() => setModalBuzonVisible(false)}
        peticiones={peticionesBuzon}
        miCuentaId={cuentaId}
        miEmail={user?.email}
      />

      {/* MODAL MENU LATERAL */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={cerrarMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={cerrarMenu}>
          <Pressable style={styles.menuPressable} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.menuModal, { backgroundColor: themeColors.bgSecondary }]}>
              
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menú</Text>
                <TouchableOpacity onPress={cerrarMenu}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('Configuranza')}>
                <Text style={styles.menuItemIcon}>⚙️</Text>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>Configuranza</Text>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>

              <View style={[styles.menuSeparator, { backgroundColor: themeColors.border }]} />

              <View style={styles.menuFeatureSection}>
                <Text style={[styles.menuFeatureTitle, { color: themeColors.textSecondary }]}>Premium Features</Text>

                {effectiveTier === 'premium' ? (
                  <>
                    <TouchableOpacity style={styles.menuFeatureItem} onPress={() => { cerrarMenu(); setModalEventoVisible(true); }}>
                      <Text style={styles.menuItemIcon}>💻</Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.text }]}>Escáner</Text></View>
                      <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuFeatureItem} onPress={() => handleNavigation('analytics')}>
                      <Text style={styles.menuItemIcon}>📊</Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.text }]}>Analytics</Text></View>
                      <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuFeatureItem} onPress={() => handleNavigation('clientes')}>
                      <Text style={styles.menuItemIcon}>👥</Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.text }]}>Clientes</Text></View>
                      <Text style={styles.menuItemArrow}>→</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}>💻</Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>Escáner</Text></View>
                      <Text style={[styles.menuFeatureLockIcon]}>🔒</Text>
                    </View>

                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}>📊</Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>Analytics</Text></View>
                      <Text style={[styles.menuFeatureLockIcon]}>🔒</Text>
                    </View>

                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}>👥</Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>Clientes</Text></View>
                      <Text style={[styles.menuFeatureLockIcon]}>🔒</Text>
                    </View>

                    <View style={[styles.menuFeatureItemLocked, { backgroundColor: themeColors.border }]}>
                      <Text style={styles.menuItemIcon}>💳</Text>
                      <View style={{ flex: 1 }}><Text style={[styles.menuItemText, { color: themeColors.textSecondary, opacity: 0.6 }]}>Créditos</Text></View>
                      <Text style={[styles.menuFeatureLockIcon]}>🔒</Text>
                    </View>

                    <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: COLORS.morado }]} onPress={() => handleNavigation('planes')}>
                      <Text style={styles.upgradeBtnText}>⬆️ Upgrade a Premium</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={[styles.menuSeparator, { backgroundColor: themeColors.border }]} />

              <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('logout')}>
                <Text style={styles.menuItemIcon}>🚪</Text>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>Cerrar Sesión</Text>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>

              <View style={[styles.menuSeparator, { backgroundColor: themeColors.border }]} />

              {/* Botón de Feedback */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false); // Cerramos el menú primero
                  
                  // ⏱️ Retraso mágico de 350 milisegundos para dejar que el menú desaparezca
                  setTimeout(() => {
                    setModalFeedbackVisible(true);
                  }, 350);
                }}
              >
                <Text style={styles.menuItemIcon}>💡</Text>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>
                  Enviar Feedback
                </Text>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>
              
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL DE FEEDBACK */}
      <ModalFeedback
        visible={modalFeedbackVisible}
        onClose={() => setModalFeedbackVisible(false)}
        usuarioEmail={user?.email}
        cuentaId={cuentaId}
      />
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
    backgroundColor: COLORS.blanco,
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
    marginRight: 15, // Un poco más de margen para separar del menú
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 3,
    position: 'relative'
  },
  bellButtonInactive: { 
    backgroundColor: COLORS.blanco, 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  bellButtonActive: { 
    backgroundColor: COLORS.morado 
  },
  bellBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 10, 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: COLORS.rojo, 
    borderWidth: 1.5, 
    borderColor: COLORS.morado 
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
    color: COLORS.grey,
  },
  menuBtn: {
    padding: 0,
  },
  menuIcon: {
    fontSize: 40,
    color: COLORS.grey,
    fontWeight: '500',
  },
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
    color: COLORS.turquesa,
    fontStyle: 'italic',
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.normal,
    color: '#565656',
  },
  trialCard: {
    backgroundColor: COLORS.blanco,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.turquesa,
    padding: 12,
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
    color: '#666',
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
    //backgroundColor: COLORS.turquesa,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: 15,
    paddingTop: 20,
  },
  menuTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.grey,
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
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
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
    color: COLORS.rojo,
    marginLeft: 10,
  },
  masCreditos: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});