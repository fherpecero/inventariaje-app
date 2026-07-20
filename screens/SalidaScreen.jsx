import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, ScrollView, FlatList, Modal, Image, Platform,
} from 'react-native';
import { 
  collection, 
  getDocs, doc, getDoc, setDoc, addDoc,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { calculateEffectiveTier } from '../utils/tierUtils';
import { imagenes } from '../productosData';
import DatePickerField from '../components/DatePickerField';
import SearchBar from '../components/SearchBar';
import AutocompleteSearchSocios from '../components/AutocompleteSearchSocios';
import DropdownProductoRecibir from '../components/DropdownProductoRecibir';
import { COLORS, HEADER } from '../context/theme';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'DateTimePicker: `onChange` is deprecated',
  'DateTimePicker: `onChange` is deprecated. Use `onValueChange`'
]);

export default function SalidaScreen({ onNavigate, darkMode, themeColors }) {
  const { user, cuenta, cuentaId } = useContext(AuthContext);
  
  // ==========================================
  // ESTADOS Y REFS (Siempre al inicio del componente)
  // ==========================================
  const isMountedRef = useRef(true);

  // Productos y carrito
  const [allProducts, setAllProducts] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Modal de cantidad (productos)
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [cantidadModal, setCantidadModal] = useState('1');

  // Formulario de venta
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('');
  const [tipoPago, setTipoPago] = useState('efectivo');
  const [cliente, setCliente] = useState('');
  const [escanerActual, setEscanerActual] = useState(null);

  // Modal de crédito
  const [modalCreditoVisible, setModalCreditoVisible] = useState(false);
  const [creditoClienteNombre, setCreditoClienteNombre] = useState('');
  const [creditoFechaPTP, setCreditoFechaPTP] = useState(new Date());
  const [creditoNotas, setCreditoNotas] = useState('');
  const [effectiveTier, setEffectiveTier] = useState('basic');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Intercambio Avanzado
  const [productoRecibir, setProductoRecibir] = useState([]); // Array
  const [modoIntercambio, setModoIntercambio] = useState(false);
  const [socioIntercambio, setSocioIntercambio] = useState(null);
  const [pagoSaldoPor, setPagoSaldoPor] = useState('efectivo'); 
  const [agregandoProductoExtra, setAgregandoProductoExtra] = useState(false);

  // ==========================================
  // EFECTOS DE MONTAJE Y CICLO DE VIDA
  // ==========================================
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => { 
    if (cuenta) cargarEscanerActual();
  }, [cuenta]);

  useEffect(() => {
    if (user && cuenta) cargarProductos();
  }, [user, cuenta]);

  useEffect(() => {
    if (user && cuenta && cuentaId) {
      const tierFinal = calculateEffectiveTier(
        cuenta?.tier,
        cuenta?.premiumTrialActive,
        cuenta?.trialStartDate
      );
      setEffectiveTier(tierFinal);
    }
  }, [user, cuenta, cuentaId]);
  
  // ==========================================
  // LÓGICA DE DATOS
  // ==========================================
  const cargarEscanerActual = async () => {
    try {
      const escanerJSON = await AsyncStorage.getItem('escanerActual');
      if (escanerJSON) {
        setEscanerActual(JSON.parse(escanerJSON));
      } else {
        setEscanerActual(null);
      }
    } catch (error) {
      console.error('⚠️ Error cargando evento activo:', error);
      setEscanerActual(null);
    }
  };

  const cargarProductos = async () => {
    if (!isMountedRef.current) return;
    
    if (isMountedRef.current) setLoadingProducts(true);
    try {
      const catalogoRef = collection(db, 'catalogoGlobal');
      const catalogoSnap = await getDocs(catalogoRef);

      const docRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');
      const docSnap = await getDoc(docRef);
      const productos = docSnap.data()?.productos || {};

      const inventarioMap = {};
      Object.keys(productos).forEach((codigo) => {
        inventarioMap[codigo] = productos[codigo].cantidad || 0;
      });

      const productosCombinados = catalogoSnap.docs
        .map((doc) => {
          const catalogo = doc.data();
          return {
            id: doc.id,
            nombre: catalogo.nombre,
            codigo: catalogo.codigo,
            descripcion: catalogo.descripcion,
            precioCosto: catalogo.precioCostoStandard || 0,
            precioVenta: catalogo.precioVentaStandard || 0,
            cantidad: inventarioMap[doc.id] || 0, 
            categoria: catalogo.categoria,
          };
        })
        .filter((p) => p && p.nombre && p.codigo);

      if (!isMountedRef.current) return;
      setAllProducts(productosCombinados);
      setProductosFiltrados(productosCombinados);
    } catch (error) {
      if (isMountedRef.current) Alert.alert('Error', 'No se pudieron cargar los productos: ' + error.message);
    } finally {
      if (isMountedRef.current) setLoadingProducts(false);
    }
  };

  // ==========================================
  // LOGICA DEL CARRITO Y MODALES
  // ==========================================
  const abrirModalProducto = (producto) => {
    setSelectedProductModal(producto);
    setCantidadModal('1');
    setModalVisible(true);
  };

  const agregarAlCarrito = () => {
    if (!cantidadModal || isNaN(cantidadModal) || parseInt(cantidadModal) <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    const cantidadNum = parseInt(cantidadModal);

    if (cantidadNum > selectedProductModal.cantidad) {
      Alert.alert('Error', `Stock insuficiente. Disponible: ${selectedProductModal.cantidad}`);
      return;
    }

    const itemExistente = carrito.find((item) => item.codigo === selectedProductModal.codigo);

    if (itemExistente) {
      const nuevaCantidad = itemExistente.cantidad + cantidadNum;
      if (nuevaCantidad > selectedProductModal.cantidad) {
        Alert.alert('Error', `Stock insuficiente. Disponible: ${selectedProductModal.cantidad}`);
        return;
      }
      setCarrito(carrito.map((item) => item.codigo === selectedProductModal.codigo ? { ...item, cantidad: nuevaCantidad } : item));
    } else {
      setCarrito([...carrito, { ...selectedProductModal, cantidad: cantidadNum, subtotal: selectedProductModal.precioVenta * cantidadNum }]);
    }
    setModalVisible(false);
    setSelectedProductModal(null);
    setCantidadModal('1');
  };

  const eliminarDelCarrito = (codigo) => {
    setCarrito(carrito.filter((item) => item.codigo !== codigo));
  };

  const actualizarCantidadCarrito = (codigo, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(codigo);
    } else {
      const producto = allProducts.find((p) => p.codigo === codigo);
      if (nuevaCantidad > producto.cantidad) {
        Alert.alert('Error', `Stock insuficiente. Disponible: ${producto.cantidad}`);
        return;
      }
      setCarrito(carrito.map((item) => item.codigo === codigo ? { ...item, cantidad: nuevaCantidad } : item));
    }
  };

  const calcularTotales = () => {
    const subtotal = carrito.reduce((sum, item) => sum + item.precioVenta * item.cantidad, 0);
    const descuento = parseFloat(descuentoPorcentaje) || 0;
    const montoDescuento = (subtotal * descuento) / 100;
    const total = subtotal - montoDescuento;
    return { subtotal, descuento, montoDescuento, total };
  };

  const calcularDiferenciaIntercambio = () => {
    if (carrito.length === 0 || !Array.isArray(productoRecibir) || productoRecibir.length === 0) return 0;
    
    const totalDoy = carrito.reduce((sum, item) => sum + (item.precioVenta * item.cantidad || 0), 0);
    const totalRecibo = productoRecibir.reduce((sum, prod) => sum + (prod?.precioVentaStandard || 0), 0);
    
    return totalDoy - totalRecibo;
  };


  const toggleModoIntercambio = () => {
    if (modoIntercambio) {
      setModoIntercambio(false);
      setSocioIntercambio(null);
      setProductoRecibir([]);
    } else {
      setModoIntercambio(true);
    }
  };


  // ==========================================
  // HELPERS DE INTERCAMBIO
  // ==========================================
  const actualizarInventarioIntercambio = async (cuentaIdTarget, productosSalida, productosEntrada) => {
    const inventarioRef = doc(db, 'cuentas', cuentaIdTarget.toString(), 'inventarios', 'vital_health_principal');
    const docSnap = await getDoc(inventarioRef);
    let productos = docSnap.data()?.productos || {};
    const productosActualizados = { ...productos };

    for (let item of productosSalida) {
      const cantidadActual = productosActualizados[item.id]?.cantidad || 0;
      productosActualizados[item.id] = {
        ...productosActualizados[item.id],
        cantidad: cantidadActual - item.cantidad,
        codigo: item.codigo,
        nombre: item.nombre,
        updatedAt: new Date().toISOString(),
      };
    }

    for (let prod of productosEntrada) {
      const cantidadActual = productosActualizados[prod.codigo]?.cantidad || 0;
      productosActualizados[prod.codigo] = {
        ...productosActualizados[prod.codigo],
        cantidad: cantidadActual + 1,
        codigo: prod.codigo,
        nombre: prod.nombre,
        updatedAt: new Date().toISOString(),
      };
    }

    await setDoc(inventarioRef, { productos: productosActualizados, updatedAt: new Date().toISOString() }, { merge: true });
    return productosActualizados;
  };

  // ==========================================
  // HELPER: Registrar intercambio en analytics (OPTIMIZADO PARA DASHBOARDS)
  // ==========================================
  const registrarIntercambioAnalytics = async (cuentaIdTarget, socioId, socioNombre, 
    esManualSocio, productosEnviados, productosRecibidos, totalEnviado, totalRecibido, 
    diferenciaIntercambio, pagoSaldoPor, usuarioEmail
  ) => {
    const salidaRef = collection(db, 'cuentas', cuentaIdTarget.toString(), 'salidas');
    const tieneSaldoPendiente = pagoSaldoPor === 'pendiente';
    const ahora = new Date();

    // 🧠 MÉTRICAS PRE-CALCULADAS PARA ANALYTICS
    // 1. Volumen de items (para no iterar arrays en el dashboard)
    const cantidadTotalEnviada = productosEnviados.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  const cantidadTotalRecibida = productosRecibidos.reduce((sum, item) => sum + (item.cantidad || 0), 0);

  // 2. Flujo de Caja Real (Separar ingresos de gastos facilita sumar la caja del día)
  let ingresoCaja = 0;
  let gastoCaja = 0;

  if (!tieneSaldoPendiente) {
    if (diferenciaIntercambio > 0) {
      ingresoCaja = diferenciaIntercambio; // Me pagaron la diferencia
    } else if (diferenciaIntercambio < 0) {
      gastoCaja = Math.abs(diferenciaIntercambio); // Yo pagué la diferencia
    }
  }

  // 3. Etiqueta de tiempo (Filtros rápidos de mes/año sin procesar fechas complejas)
  const mesAnio = `${ahora.getMonth() + 1}-${ahora.getFullYear()}`;


    const intercambioDoc = {
      tipo: 'intercambio',
      socioId: socioId,
      socioNombre: socioNombre,
      esManual: esManualSocio,
      productosEnviados: productosEnviados,
      productosRecibidos: productosRecibidos,

      // 📊 CAMPOS APLANADOS PARA ANALYTICS (NUEVO)
      cantidadTotalEnviada: cantidadTotalEnviada,
      cantidadTotalRecibida: cantidadTotalRecibida,
      flujoIngreso: ingresoCaja,
      flujoGasto: gastoCaja,
      mesAnioAnalytics: mesAnio, // Ej: "7-2026"
      
      totalEnviado: totalEnviado,
      totalRecibido: totalRecibido,
      diferencia: diferenciaIntercambio,
      tieneSaldoPendiente: tieneSaldoPendiente,
      montoPendiente: tieneSaldoPendiente ? Math.abs(diferenciaIntercambio) : null,
      tipoPagoSaldo: tieneSaldoPendiente ? 'pendiente' : pagoSaldoPor,
      saldoAFavor: diferenciaIntercambio < 0,
      usuario: usuarioEmail,
      fecha: new Date().toLocaleDateString('es-MX'),
      timestamp: new Date().toISOString(),
    };

    const docRef = await addDoc(salidaRef, intercambioDoc);
    return docRef.id;
  };

  const registrarIntercambio = async () => {
    if (!socioIntercambio) return Alert.alert('Error', 'Selecciona un socio');
    if (carrito.length === 0) return Alert.alert('Error', 'El carrito está vacío');
    if (!productoRecibir || productoRecibir.length === 0) return Alert.alert('Error', 'Selecciona un producto a recibir');

    if (isMountedRef.current) setLoading(true);
    try {
      const diferenciaIntercambio = calcularDiferenciaIntercambio();
      const totalDoy = carrito.reduce((sum, item) => sum + item.precioVenta * item.cantidad, 0);
      const totalRecibo = productoRecibir.reduce((sum, item) => sum + item.precioVentaStandard, 0);

      // ====================================================
      // FLUJO A: Socio MANUAL (No tiene la app, se guarda directo)
      // ====================================================
      if (socioIntercambio.esManual) {
        await actualizarInventarioIntercambio(cuentaId, carrito, productoRecibir);
        await registrarIntercambioAnalytics(
          cuentaId,
          null, // Sin ID
          socioIntercambio.cuentaNombre,
          true,
          carrito.map(item => ({ nombre: item.nombre, codigo: item.codigo, cantidad: item.cantidad, precioUnitario: item.precioVenta, subtotal: item.precioVenta * item.cantidad })),
          productoRecibir.map(prod => ({ nombre: prod.nombre, codigo: prod.codigo, cantidad: 1, precioUnitario: prod.precioVentaStandard })),
          totalDoy, totalRecibo, diferenciaIntercambio, pagoSaldoPor, user.email
        );
        
        Alert.alert('✅ Éxito', 'Intercambio registrado y actualizado en inventario.');
      } 
      // ====================================================
      // FLUJO B: Socio CON APP (Se envía solicitud al buzón)
      // ====================================================
      else {
        const peticionesRef = collection(db, 'intercambios_pendientes');
        
        // Armamos el documento del Buzón Neutral
        const solicitudDoc = {
          estado: 'pendiente', // 'pendiente', 'aceptado', 'rechazado'
          
          // Quién envía (Yo)
          deCuentaId: cuentaId.toString(),
          deCuentaNombre: cuenta.nombre || user.email,
          
          // Quién recibe (El Socio)
          paraCuentaId: socioIntercambio.cuentaId.toString(),
          paraCuentaNombre: socioIntercambio.cuentaNombre,
          
          // Lo que ofrezco vs Lo que pido
          productosOfrecidos: carrito.map(item => ({ nombre: item.nombre, codigo: item.codigo, cantidad: item.cantidad, precioVenta: item.precioVenta })),
          productosSolicitados: productoRecibir.map(prod => ({ nombre: prod.nombre, codigo: prod.codigo, cantidad: 1, precioVenta: prod.precioVentaStandard })),
          
          // Matemática y pagos
          totales: {
            totalOfrecido: totalDoy,
            totalSolicitado: totalRecibo,
            diferencia: diferenciaIntercambio
          },
          pagoSaldoPor: pagoSaldoPor,
          
          // Tracking
          creadoPor: user.email,
          timestamp: new Date().toISOString()
        };

        await addDoc(peticionesRef, solicitudDoc);

        Alert.alert(
          '📨 Solicitud Enviada', 
          `Esperando a que ${socioIntercambio.cuentaNombre} confirme el cambio para actualizar inventarios.`
        );
      }

      // ✅ LIMPIEZA FINAL (Aplica para ambos flujos)
      if (isMountedRef.current) {
        setCarrito([]);
        setDescuentoPorcentaje('');
        setCliente('');
        setTipoPago('efectivo');
        setModoIntercambio(false);
        setSocioIntercambio(null);
        setProductoRecibir([]);
        setPagoSaldoPor('efectivo');
        setLoading(false);
        cargarProductos();
      }

    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert('Error', 'Error al procesar el intercambio: ' + error.message);
        setLoading(false);
      }
    }
  };

  // ==========================================
  // RUTAS DE VENTA Y CRÉDITO
  // ==========================================
  const registrarVenta = async () => {
    if (!isMountedRef.current) return;
    if (carrito.length === 0) return Alert.alert('Error', 'El carrito está vacío');

    if (tipoPago === 'crd') {
      setCreditoClienteNombre(cliente || '');
      setCreditoFechaPTP(new Date());
      setCreditoNotas('');
      setModalCreditoVisible(true);
      return;
    }
    await guardarVentaDirecto();
  };

  const guardarVentaDirecto = async () => {
    if (!isMountedRef.current) return;
    if (isMountedRef.current) setLoading(true);

    try {
      const totales = calcularTotales();
      const ahora = new Date();

      const inventarioRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');
      const docSnap = await getDoc(inventarioRef);
      let productosActuales = docSnap.data()?.productos || {};

      const productosActualizados = { ...productosActuales };
      for (let i = 0; i < carrito.length; i++) {
        const item = carrito[i];
        const cantidadActual = productosActualizados[item.id]?.cantidad || 0;
        productosActualizados[item.id] = {
          ...productosActualizados[item.id],
          cantidad: cantidadActual - item.cantidad,
          codigo: item.codigo,
          nombre: item.nombre,
          updatedAt: ahora.toISOString(),
        };
      }

      await setDoc(inventarioRef, { productos: productosActualizados, updatedAt: ahora.toISOString() }, { merge: true });

      const salidaRef = collection(db, 'cuentas', cuentaId.toString(), 'salidas');
      const escanerJSON = await AsyncStorage.getItem('escanerActual');
      let escanerActualActualizado = escanerJSON ? JSON.parse(escanerJSON) : null;

      for (let i = 0; i < carrito.length; i++) {
        const item = carrito[i];
        const ventaDoc = {
          producto: item.nombre,
          codigo: item.codigo,
          cantidad: item.cantidad,
          precioUnitario: item.precioVenta,
          subtotal: item.precioVenta * item.cantidad,
          descuentoPorcentaje: parseFloat(descuentoPorcentaje) || 0,
          descuentoMonto: totales.montoDescuento / carrito.length,
          total: (item.precioVenta * item.cantidad) - (totales.montoDescuento / carrito.length),
          cliente: cliente || 'Sin cliente',
          tipoPago: tipoPago,
          usuario: user.email,
          fecha: ahora.toLocaleDateString('es-MX'),
          timestamp: ahora.toISOString(),
          escanerId: escanerActualActualizado?.id || null,
          nombreEvento: escanerActualActualizado?.evento || null,
          escanerFecha: escanerActualActualizado?.fechaFormato || null,
          escanerMonto: escanerActualActualizado?.monto || null,
          escanerInvitados: escanerActualActualizado?.invitados || null,
        };
        await addDoc(salidaRef, ventaDoc);
      }

      if (escanerActualActualizado) {
        const escanerActualizadoFinal = {
          ...escanerActualActualizado,
          cantidad: (escanerActualActualizado.cantidad || 0) + carrito.length,
          ventaTotal: (escanerActualActualizado.ventaTotal || 0) + totales.total,
        };
        await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerActualizadoFinal));
        setEscanerActual(escanerActualizadoFinal);
      }

      if (isMountedRef.current) {
        Alert.alert(
          '✅ Venta registrada',
          `Total: $${totales.total.toFixed(2)}\nTipo de pago: ${tipoPago.toUpperCase()}\nCliente: ${cliente || 'Sin cliente'}`,
          [{
              text: 'OK',
              onPress: () => {
                if (isMountedRef.current) {
                  setCarrito([]);
                  setDescuentoPorcentaje('');
                  setCliente('');
                  setTipoPago('efectivo');
                  setLoading(false);
                  cargarProductos();
                }
              },
          }]
        );
      }
    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert('Error', 'Error al registrar venta: ' + error.message);
        setLoading(false);
      }
    }
  };

  const registrarVentaConCredito = async () => {
    if (!creditoClienteNombre.trim()) return Alert.alert('Error', 'Ingresa el nombre del cliente');
    if (isMountedRef.current) setLoading(true);

    try {
      const totales = calcularTotales();
      const ahora = new Date();

      const inventarioRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');
      const docSnap = await getDoc(inventarioRef);
      let productosActuales = docSnap.data()?.productos || {};

      const productosActualizados = { ...productosActuales };
      for (let i = 0; i < carrito.length; i++) {
        const item = carrito[i];
        const cantidadActual = productosActualizados[item.id]?.cantidad || 0;
        productosActualizados[item.id] = {
          ...productosActualizados[item.id],
          cantidad: cantidadActual - item.cantidad,
          codigo: item.codigo,
          nombre: item.nombre,
          updatedAt: ahora.toISOString(),
        };
      }

      await setDoc(inventarioRef, { productos: productosActualizados, updatedAt: ahora.toISOString() }, { merge: true });

      const escanerJSON = await AsyncStorage.getItem('escanerActual');
      let escanerActualActualizado = escanerJSON ? JSON.parse(escanerJSON) : null;
      const salidaRef = collection(db, 'cuentas', cuentaId.toString(), 'salidas');
      const ventasIds = [];

      for (let i = 0; i < carrito.length; i++) {
        const item = carrito[i];
        const ventaDoc = {
          producto: item.nombre,
          codigo: item.codigo,
          cantidad: item.cantidad,
          precioUnitario: item.precioVenta,
          subtotal: item.precioVenta * item.cantidad,
          descuentoPorcentaje: parseFloat(descuentoPorcentaje) || 0,
          descuentoMonto: totales.montoDescuento / carrito.length,
          total: (item.precioVenta * item.cantidad) - (totales.montoDescuento / carrito.length),
          cliente: creditoClienteNombre,
          tipoPago: 'crd',
          usuario: user.email,
          fecha: ahora.toLocaleDateString('es-MX'),
          timestamp: ahora.toISOString(),
          escanerId: escanerActualActualizado?.id || null,
          nombreEvento: escanerActualActualizado?.evento || null,
          escanerFecha: escanerActualActualizado?.fechaFormato || null,
        };

        const docRef = await addDoc(salidaRef, ventaDoc);
        ventasIds.push(docRef.id);
      }

      const creditoRef = collection(db, 'cuentas', cuentaId.toString(), 'creditos');
      const creditoDoc = {
        clienteNombre: creditoClienteNombre,
        monto: totales.total,
        fechaPTP: creditoFechaPTP,
        notas: creditoNotas,
        estado: 'pendiente',
        ventasIds: ventasIds,
        timestamp: ahora,
        creadorEmail: user.email,
      };
      await addDoc(creditoRef, creditoDoc);

      if (escanerActualActualizado) {
        const escanerActualizadoFinal = {
          ...escanerActualActualizado,
          cantidad: (escanerActualActualizado.cantidad || 0) + carrito.length,
          ventaTotal: (escanerActualActualizado.ventaTotal || 0) + totales.total,
        };
        await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerActualizadoFinal));
        setEscanerActual(escanerActualizadoFinal);
      }

      if (isMountedRef.current) {
        Alert.alert(
          '✅ Crédito registrado',
          `Cliente: ${creditoClienteNombre}\nMonto: $${totales.total.toFixed(2)}\nVence: ${creditoFechaPTP.toLocaleDateString('es-MX')}`,
          [{
              text: 'OK',
              onPress: () => {
                if (isMountedRef.current) {
                  setCarrito([]);
                  setDescuentoPorcentaje('');
                  setCliente('');
                  setTipoPago('efectivo');
                  setModalCreditoVisible(false);
                  setLoading(false);
                  cargarProductos();
                }
              },
          }]
        );
      }
    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert('Error', 'Error al registrar crédito: ' + error.message);
        setLoading(false);
      }
    }
  };

  // ==========================================
  // RENDERIZADO VISUAL Y CÁLCULOS UI
  // ==========================================
  const totales = calcularTotales();
  const diff = calcularDiferenciaIntercambio();
  const esDeuda = diff > 0; // 🔥 FIX: Alineado a tu uso en el JSX inferior
  const montoAbsoluto = Math.abs(diff).toFixed(2);

  const renderProductoGrid = ({ item }) => (
    <TouchableOpacity
      style={styles.productoGridCard}
      onPress={() => abrirModalProducto(item)}
      disabled={item.cantidad === 0}
      activeOpacity={item.cantidad === 0 ? 0.5 : 0.7}
    >
      <View style={styles.imagenPlaceholder}>
        {imagenes[item.codigo] ? (
          <Image source={imagenes[item.codigo]} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
        ) : (
          <Text style={styles.imagenPlaceholderText}>📦</Text>
        )}
      </View>
      <Text style={[styles.productoNombre, { color: themeColors.text }]}>{item.nombre}</Text>
      <Text style={styles.productoPrecio}>${item.precioVenta}</Text>
      {item.cantidad === 0 ? (
        <Text style={styles.sinStock}>Sin Stock</Text>
      ) : (
        <Text style={styles.stock}>Stock: {item.cantidad}</Text>
      )}
    </TouchableOpacity>
  );

  const renderCarritoItem = ({ item }) => (
    <View style={styles.carritoItem}>
      <View style={styles.carritoItemInfo}>
        <Text style={styles.carritoItemNombre}>{item.nombre}</Text>
        <Text style={styles.carritoItemPrecio}>
          ${item.precioVenta} × {item.cantidad} = ${(item.precioVenta * item.cantidad).toFixed(2)}
        </Text>
      </View>
      <View style={styles.carritoItemControles}>
        <TouchableOpacity onPress={() => actualizarCantidadCarrito(item.codigo, item.cantidad - 1)}>
          <Text style={styles.btnCantidad}>−</Text>
        </TouchableOpacity>
        <Text style={styles.cantidadCarrito}>{item.cantidad}</Text>
        <TouchableOpacity onPress={() => actualizarCantidadCarrito(item.codigo, item.cantidad + 1)}>
          <Text style={styles.btnCantidad}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => eliminarDelCarrito(item.codigo)} style={styles.btnEliminar}>
          <Text style={styles.btnEliminarText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loadingProducts) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
          <Text style={styles.loaderText}>Cargando productos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* ESCÁNER INDICADOR */}
      {escanerActual && (
        <View style={styles.escanerIndicador}>
          <Text style={styles.escanerIndicadorText}>
            📌 Evento: {escanerActual.evento} | Total: ${escanerActual.ventaTotal || 0}
          </Text>
        </View>
      )}

      {/* HEADER CON ESTILOS DE THEME */}
      <View style={[HEADER.headerContainer, { backgroundColor: themeColors.header }]}>
        <View style={HEADER.headerContent}>
          <Text style={[HEADER.headerTitle, { color: themeColors.text }]}> Ventas</Text>
          <TouchableOpacity 
            onPress={toggleModoIntercambio}
            disabled={effectiveTier !== 'premium'}
            style={[styles.btnIntercambio, modoIntercambio && styles.btnIntercambioActive, effectiveTier !== 'premium' && styles.btnDisabled]}
          >
            <Text style={styles.btnIntercambioText}>🔁</Text>
          </TouchableOpacity>
        </View>
        <LinearGradient
          colors={['rgba(68, 194, 194, 1)', 'rgba(122, 122, 236, 0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0.27, 0.90]}
          style={HEADER.headerBorderGradient}
        />
      </View>

      {/* BANNER INTERCAMBIO */}
      {modoIntercambio && (
        <View style={styles.bannerIntercambio}>
          <Text style={styles.bannerIntercambioText}>⚡ MODO INTERCAMBIO ACTIVO</Text>
        </View>
      )}

      <SearchBar 
        data={allProducts} 
        onSearch={setProductosFiltrados}
        searchKeys={['nombre', 'codigo']}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Grid de productos */}
        <View style={styles.gridContainer}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Selecciona productos y baja hacia el checkout ⬇️</Text>
          <FlatList
            data={productosFiltrados}
            renderItem={renderProductoGrid}
            keyExtractor={(item) => item.codigo}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
          />
        </View>

        {/* Carrito */}
        <View style={styles.carritoContainer}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>🛒 Carrito ({carrito.length} items)</Text>
          {carrito.length === 0 ? (
            <Text style={styles.carritoVacio}>El carrito está vacío</Text>
          ) : (
            <FlatList
              data={carrito}
              renderItem={renderCarritoItem}
              keyExtractor={(item) => item.codigo}
              scrollEnabled={false}
            />
          )}
        </View>

        {modoIntercambio ? (
          <>
            {/* MODO INTERCAMBIO */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Socio:</Text>
              <AutocompleteSearchSocios 
                onSelect={setSocioIntercambio}
                value={socioIntercambio?.cuentaNombre || ''}
              />
            </View>

            {/* Productos a recibir */}
            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.label}>Productos a recibir:</Text>
                
                {/* Botón de "+" para agregar más productos (Solo se muestra si ya hay productos y no estamos buscando uno nuevo) */}
                {(productoRecibir.length > 0 && !agregandoProductoExtra) && (
                  <TouchableOpacity 
                    style={styles.btnAgregarProducto}
                    onPress={() => setAgregandoProductoExtra(true)}
                  >
                    <Text style={{ fontSize: 14, color: COLORS.turquesa, fontWeight: 'bold' }}>+ Agregar otro</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 1. Lista de productos ya seleccionados */}
              {productoRecibir.length > 0 && (
                <View style={styles.productosRecibidosList}>
                  {productoRecibir.map((prod, idx) => (
                    <View key={idx} style={styles.productoRecibidoItem}>
                      <View>
                        {/* Agregué el "1x" visualmente para que coincida con tu card de diferencias */}
                        <Text style={styles.productoRecibidoNombre}>1x {prod.nombre}</Text>
                        <Text style={styles.productoRecibidoPrecio}>${prod.precioVentaStandard}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setProductoRecibir(productoRecibir.filter((_, i) => i !== idx))}>
                        <Text style={{ fontSize: 18, color: COLORS.rojo }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* 2. El buscador se muestra SI NO HAY productos, o SI PICARON el botón "+" */}
              {(productoRecibir.length === 0 || agregandoProductoExtra) && (
                <View style={{ marginTop: productoRecibir.length > 0 ? 10 : 0 }}>
                  <DropdownProductoRecibir 
                    onSelect={(prod) => {
                      // Sumamos el nuevo producto al array existente (...productoRecibir)
                      setProductoRecibir([...productoRecibir, prod]);
                      // Ocultamos el buscador de nuevo
                      setAgregandoProductoExtra(false);
                    }} 
                    value={null} 
                  />
                  
                  {/* Botón rojo pequeño para cancelar la búsqueda extra si se arrepienten */}
                  {agregandoProductoExtra && (
                    <TouchableOpacity onPress={() => setAgregandoProductoExtra(false)} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
                      <Text style={{ color: COLORS.rojo, fontWeight: '600', fontSize: 12 }}>✕ Cancelar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* CARD: DIFERENCIA DE PRECIOS */}
            {carrito.length > 0 && productoRecibir.length > 0 && (
              <View style={styles.diferenciaPreciosCard}>
                <Text style={styles.diferenciaTitulo}>Productos a cambiar</Text>
                <View style={styles.diferenciaCuerpo}>
                  <View style={styles.diferenciasColumna}>
                    <Text style={styles.diferenciaLabel}>ENTREGAR</Text>
                    {carrito.map((item, idx) => (
                      <View key={idx} style={styles.diferenciaProductoRow}>
                        <Text style={styles.diferenciaProductoNombre}>{item.cantidad}x {item.nombre}</Text>
                        <Text style={styles.diferenciaProductoPrecio}>${(item.precioVenta * item.cantidad).toFixed(2)}</Text>
                      </View>
                    ))}
                    <View style={styles.diferenciaTotalRow}>
                      <Text style={styles.diferenciaLabel}>TOTAL:</Text>
                      <Text style={styles.diferenciaTotalValue}>${carrito.reduce((sum, item) => sum + item.precioVenta * item.cantidad, 0).toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={styles.diferenciasFlecha}><Text style={styles.flechaTexto}>⇄</Text></View>

                  <View style={styles.diferenciasColumna}>
                    <Text style={styles.diferenciaLabel}>RECIBIR</Text>
                    {productoRecibir.map((item, idx) => (
                      <View key={idx} style={styles.diferenciaProductoRow}>
                        <Text style={styles.diferenciaProductoNombre}>1x {item.nombre}</Text>
                        <Text style={styles.diferenciaProductoPrecio}>${item.precioVentaStandard.toFixed(2)}</Text>
                      </View>
                    ))}
                    <View style={styles.diferenciaTotalRow}>
                      <Text style={styles.diferenciaLabel}>TOTAL:</Text>
                      <Text style={styles.diferenciaTotalValue}>${productoRecibir.reduce((sum, item) => sum + item.precioVentaStandard, 0).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.menuSeparator, { backgroundColor: themeColors.border }]} />

                {/* BALANCE */}
                <View style={[styles.diferenciaBalance, esDeuda ? styles.diferenciaBalanceDeuda : styles.diferenciaBalanceAFavor]}>
                  <Text style={styles.diferenciaLabel}>BALANCE:</Text>
                  <Text style={[styles.diferenciaBalanceValor, { color: esDeuda ? COLORS.rojo : COLORS.verde }]}>
                    {esDeuda ? `A pagar $${montoAbsoluto}` : `A favor $${montoAbsoluto}`}
                  </Text>
                </View>

                {/* SECCIÓN BALANCE Y FORMA DE LIQUIDAR (MINIMALISTA) */}
                {diff !== 0 && (
                  <View style={styles.pagoSaldoContainer}>
                    <Text style={styles.pagoSaldoLabel}>
                      {esDeuda ? `💳 Saldo en contra: $${montoAbsoluto}` : `💰 Saldo a favor: $${montoAbsoluto}`}
                    </Text>
                    
                    {/* Fila única de Checkboxes horizontales */}
                    <View style={styles.checkboxRow}>
                      
                      {/* Opción 1: Efectivo */}
                      <TouchableOpacity 
                        style={styles.checkboxOption} 
                        onPress={() => setPagoSaldoPor('efectivo')}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={pagoSaldoPor === 'efectivo' ? "radio-button-on" : "radio-button-off"} 
                          size={18} 
                          color={pagoSaldoPor === 'efectivo' ? COLORS.morado : '#999'} 
                        />
                        <Text style={[styles.checkboxText, pagoSaldoPor === 'efectivo' && styles.checkboxTextActive]}>
                          Efectivo
                        </Text>
                      </TouchableOpacity>

                      {/* Opción 2: STP */}
                      <TouchableOpacity 
                        style={styles.checkboxOption} 
                        onPress={() => setPagoSaldoPor('stp')}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={pagoSaldoPor === 'stp' ? "radio-button-on" : "radio-button-off"} 
                          size={18} 
                          color={pagoSaldoPor === 'stp' ? COLORS.morado : '#999'} 
                        />
                        <Text style={[styles.checkboxText, pagoSaldoPor === 'stp' && styles.checkboxTextActive]}>
                          STP
                        </Text>
                      </TouchableOpacity>

                      {/* Opción 3: Pendiente */}
                      <TouchableOpacity 
                        style={styles.checkboxOption} 
                        onPress={() => setPagoSaldoPor('pendiente')}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={pagoSaldoPor === 'pendiente' ? "radio-button-on" : "radio-button-off"} 
                          size={18} 
                          color={pagoSaldoPor === 'pendiente' ? COLORS.morado : '#999'} 
                        />
                        <Text style={[styles.checkboxText, pagoSaldoPor === 'pendiente' && styles.checkboxTextActive]}>
                          Dejar Pendiente
                        </Text>
                      </TouchableOpacity>

                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <>
            {/* MODO VENTA NORMAL */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Cliente (opcional):</Text>
              <TextInput style={styles.input} placeholder="Nombre del cliente" value={cliente} onChangeText={setCliente} editable={!loading} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descuento (%):</Text>
              <TextInput style={styles.input} placeholder="Ej: 10" value={descuentoPorcentaje} onChangeText={setDescuentoPorcentaje} keyboardType="decimal-pad" editable={!loading} />
            </View>
          </>
        )}

        {/* Totales */}
        {carrito.length > 0 && !modoIntercambio && (
          <View style={styles.totalesBox}>
            <View style={styles.totalesRow}>
              <Text style={styles.totalesLabel}>Subtotal:</Text>
              <Text style={styles.totalesValue}>${totales.subtotal.toFixed(2)}</Text>
            </View>
            {totales.descuento > 0 && (
              <View style={styles.totalesRow}>
                <Text style={styles.totalesLabel}>Descuento ({totales.descuento}%):</Text>
                <Text style={styles.totalesValue}>-${totales.montoDescuento.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.totalesRowFinal}>
              <Text style={styles.totalesLabelFinal}>TOTAL:</Text>
              <Text style={styles.totalesValueFinal}>${totales.total.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Tipo de pago */}
        {!modoIntercambio && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de pago:</Text>
          <View style={styles.pagoOptions}>
            <TouchableOpacity style={[styles.pagoOption, tipoPago === 'efectivo' && styles.pagoOptionActive]} onPress={() => setTipoPago('efectivo')}>
              <Text style={styles.pagoOptionText}>💵 Efectivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pagoOption, tipoPago === 'stp' && styles.pagoOptionActive]} onPress={() => setTipoPago('stp')}>
              <Text style={styles.pagoOptionText}>💳 STP</Text>
            </TouchableOpacity>
            {effectiveTier === 'premium' && (
              <TouchableOpacity style={[styles.pagoOption, tipoPago === 'crd' && styles.pagoOptionActive]} onPress={() => setTipoPago('crd')}>
                <Text style={styles.pagoOptionText}>🏦 CRD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        )}

        {/* Botones principales */}
        <View style={styles.botonesContainer}>
          <TouchableOpacity style={[styles.confirmBtn, loading && styles.disabledBtn]} onPress={modoIntercambio ? registrarIntercambio : registrarVenta} disabled={loading || carrito.length === 0}>
            {loading ? <ActivityIndicator color={COLORS.blanco} /> : <Text style={styles.confirmBtnText}>{modoIntercambio ? '🔁 Confirmar cambio' : '✅ Confirmar venta'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setCarrito([]); setDescuentoPorcentaje(''); setCliente(''); setTipoPago('efectivo'); }} disabled={loading}>
            <Text style={styles.cancelBtnText}>❌ Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal: Seleccionar cantidad */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProductModal && (
              <>
                <Text style={styles.modalTitle}>{selectedProductModal.nombre}</Text>
                <View style={styles.modalPrecioBox}>
                  <Text style={styles.modalPrecioLabel}>Precio unitario:</Text>
                  <Text style={styles.modalPrecioValue}>${selectedProductModal.precioVenta}</Text>
                </View>
                <View style={styles.modalStockBox}>
                  <Text style={styles.modalStockLabel}>Stock disponible:</Text>
                  <Text style={styles.modalStockValue}>{selectedProductModal.cantidad} unidades</Text>
                </View>
                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Cantidad:</Text>
                  <View style={styles.cantidadInputGroup}>
                    <TouchableOpacity onPress={() => setCantidadModal(Math.max(1, parseInt(cantidadModal) - 1).toString())} style={styles.cantidadBtn}>
                      <Text style={styles.cantidadBtnText}>−</Text>
                    </TouchableOpacity>
                    <TextInput style={styles.cantidadInput} value={cantidadModal} onChangeText={setCantidadModal} keyboardType="number-pad" />
                    <TouchableOpacity onPress={() => { const nueva = parseInt(cantidadModal) + 1; if (nueva <= selectedProductModal.cantidad) setCantidadModal(nueva.toString()); }} style={styles.cantidadBtn}>
                      <Text style={styles.cantidadBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.modalTotalBox}>
                  <Text style={styles.modalTotalLabel}>Total:</Text>
                  <Text style={styles.modalTotalValue}>${(selectedProductModal.precioVenta * parseInt(cantidadModal)).toFixed(2)}</Text>
                </View>
                <View style={styles.modalBotones}>
                  <TouchableOpacity style={styles.modalConfirmBtn} onPress={agregarAlCarrito}>
                    <Text style={styles.modalConfirmBtnText}>✅ Agregar al carrito</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Datos del crédito */}
      <Modal visible={modalCreditoVisible} transparent={true} animationType="slide" onRequestClose={() => setModalCreditoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Venta a Crédito</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre del cliente:</Text>
              <TextInput style={styles.input} placeholder="Ej: Juan García" value={creditoClienteNombre} onChangeText={setCreditoClienteNombre} editable={!loading} />
            </View>

            {/* IMPLEMENTACION HOMOLOGADA */}
            <DatePickerField
              label="Fecha de pago pactada:"
              value={creditoFechaPTP}
              onDateChange={(nuevaFecha) => setCreditoFechaPTP(nuevaFecha)}
              containerStyle={styles.formGroup}
            />

            {showDatePicker && (
              <DateTimePicker
                value={creditoFechaPTP}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onValueChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setCreditoFechaPTP(selectedDate);
                    setShowDatePicker(false); 
                  }
                }}
              />
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notas (opcional):</Text>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Ej: Pagar después del 15" value={creditoNotas} onChangeText={setCreditoNotas} multiline={true} editable={!loading} />
            </View>

            <View style={styles.totalesBox}>
              <Text style={styles.totalesLabel}>Monto total del crédito:</Text>
              <Text style={styles.totalesValueFinal}>${calcularTotales().total.toFixed(2)}</Text>
            </View>

            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.modalConfirmBtn, loading && styles.disabledBtn]} onPress={registrarVentaConCredito} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.blanco} /> : <Text style={styles.modalConfirmBtnText}>✅ Registrar crédito</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalCreditoVisible(false)} disabled={loading}>
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  content: { 
    flex: 1, 
    padding: 15 
  },
  headerFallback: { 
    padding: 15, 
    borderBottomWidth: 1, 
    marginTop: 30,
    borderBottomColor: '#eee' 
  },
  titleFallback: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loaderText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#666' 
  },
  gridContainer: { 
    marginBottom: 30 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 12 
  },
  gridRow: { 
    justifyContent: 'space-between', 
    marginBottom: 12 
  },
  productoGridCard: { 
    width: '30%', 
    backgroundColor: 'transparent', 
    borderRadius: 8, 
    overflow: 'hidden', 
    padding: 10, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: COLORS.morado 
  },
  imagenPlaceholder: { 
    width: '100%', 
    height: 90, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 6, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  imagenPlaceholderText: { 
    fontSize: 32 
  },
  productoNombre: { 
    fontSize: 12, 
    fontWeight: '600', 
    textAlign: 'center', 
    marginBottom: 3 
  },
  productoPrecio: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: COLORS.turquesa, 
    marginBottom: 4 
  },
  stock: { 
    fontSize: 10, 
    color: '#666' 
  },
  sinStock: { 
    fontSize: 10, 
    color: COLORS.rojo, 
    fontWeight: 'bold' 
  },
  carritoContainer: { 
    backgroundColor: 'transparent', 
    borderRadius: 8, 
    padding: 15, 
    marginBottom: 20, 
    borderWidth: 2, 
    borderColor: COLORS.turquesa 
  },
  carritoVacio: { 
    fontSize: 14, 
    color: '#999', 
    fontStyle: 'italic', 
    textAlign: 'center', 
    paddingVertical: 20 
  },
  carritoItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  carritoItemInfo: { 
    flex: 1 
  },
  carritoItemNombre: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.negro, 
    marginBottom: 4 
  },
  carritoItemPrecio: { 
    fontSize: 12, 
    color: '#666' 
  },
  carritoItemControles: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  btnCantidad: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.turquesa, 
    paddingHorizontal: 8 
  },
  cantidadCarrito: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: COLORS.negro, 
    minWidth: 24, 
    textAlign: 'center' 
  },
  btnEliminar: { 
    paddingLeft: 8 
  },
  btnEliminarText: { 
    fontSize: 16, 
    color: COLORS.rojo, 
    fontWeight: 'bold' 
  },
  formGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.negro, 
    marginBottom: 8 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16, 
    backgroundColor: COLORS.blanco 
  },
  pagoOptions: { 
    flexDirection: 'row', 
    gap: 10 
  },
  pagoOption: { 
    flex: 1, 
    borderWidth: 2, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    paddingVertical: 12, 
    alignItems: 'center', 
    backgroundColor: COLORS.blanco 
  },
  pagoOptionActive: { 
    borderColor: COLORS.turquesa, 
    backgroundColor: '#e0f7fa' 
  },
  pagoOptionText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: COLORS.negro 
  },
  totalesBox: { 
    backgroundColor: '#fafafa', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 20, 
    borderLeftWidth: 4, 
    borderLeftColor: COLORS.naranja 
  },
  totalesRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },
  totalesLabel: { 
    fontSize: 14, 
    color: '#666' 
  },
  totalesValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.negro 
  },
  totalesRowFinal: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingTop: 20, 
    marginTop: 10, 
    borderTopWidth: 2, 
    borderTopColor: COLORS.turquesa 
  },
  totalesLabelFinal: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.negro 
  },
  totalesValueFinal: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.naranja 
  },
  botonesContainer: { 
    gap: 10, 
    marginBottom: 30 
  },
  confirmBtn: { 
    backgroundColor: COLORS.verde, 
    paddingVertical: 15, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  confirmBtnText: { 
    color: COLORS.blanco, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  cancelBtn: { 
    backgroundColor: COLORS.rojito, 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  cancelBtnText: { 
    color: COLORS.blanco, 
    fontSize: 14, 
    fontWeight: '600' 
  },
  disabledBtn: { 
    opacity: 0.5 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    backgroundColor: COLORS.blanco, 
    borderRadius: 16, 
    padding: 20, 
    width: '85%' 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.negro, 
    marginBottom: 15, 
    textAlign: 'center' 
  },
  modalPrecioBox: { 
    backgroundColor: '#f5f5f5', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 12 
  },
  modalPrecioLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4 
  },
  modalPrecioValue: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: COLORS.turquesa 
  },
  modalStockBox: { 
    backgroundColor: '#f5f5f5', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 15 
  },
  modalStockLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4 
  },
  modalStockValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.negro 
  },
  modalFormGroup: { 
    marginBottom: 15 
  },
  modalLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.negro, 
    marginBottom: 10 
  },
  cantidadInputGroup: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10 
  },
  cantidadBtn: { 
    backgroundColor: COLORS.turquesa, 
    width: 44, 
    height: 44, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cantidadBtnText: { 
    fontSize: 24, 
    color: COLORS.blanco, 
    fontWeight: 'bold' 
  },
  cantidadInput: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.negro, 
    minWidth: 80, 
    textAlign: 'center' 
  },
  modalTotalBox: { 
    backgroundColor: '#fff3e0', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 20, 
    borderLeftWidth: 4, 
    borderLeftColor: COLORS.naranja 
  },
  modalTotalLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4 
  },
  modalTotalValue: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: COLORS.naranja 
  },
  modalBotones: { 
    gap: 10 
  },
  modalConfirmBtn: { 
    backgroundColor: COLORS.verde, 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  modalConfirmBtnText: { 
    color: COLORS.blanco, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  modalCancelBtn: { 
    backgroundColor: COLORS.rojito, 
    paddingVertical: 10, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  modalCancelBtnText: { 
    color: COLORS.negro, 
    fontSize: 14, 
    fontWeight: '600' 
  },
  escanerIndicador: { 
    position: 'absolute', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    paddingTop: 35, 
    backgroundColor: COLORS.blanco, 
    zIndex: 10, 
  },
  escanerIndicadorText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.negro  
  },
  datePickerButtonText: { 
    fontSize: 16, 
    color: COLORS.negro 
  },
  btnIntercambio: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8, 
    backgroundColor: 'transparent', 
    borderWidth: 2, 
    borderColor: COLORS.blanco 
  },
  btnDisabled: { 
    opacity: 0.2 
  },
  btnIntercambioActive: { 
    backgroundColor: COLORS.blanco, 
    borderColor: COLORS.turquesa 
  },
  btnIntercambioText: { 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  bannerIntercambio: { 
    backgroundColor: COLORS.morado, 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    alignItems: 'center' 
  },
  bannerIntercambioText: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: COLORS.blanco 
  },
  diferenciaPreciosCard: { 
    backgroundColor: COLORS.blanco, 
    borderRadius: 10, 
    padding: 15, 
    marginBottom: 20, 
    borderLeftWidth: 4,  
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  diferenciaTitulo: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.negro, 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  diferenciaCuerpo: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
  },
  diferenciasColumna: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee'
  },
  menuSeparator: {
    height: 1,
    backgroundColor: COLORS.gris,
    marginVertical: 0,
    marginTop: 2,
    marginBottom: 2,
  },
  diferenciasFlecha: {
    fontSize: 24,
  },
  flechaTexto: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  diferenciaLabel: {
    fontSize: 12,
    fontWeight: 'bold', 
    letterSpacing: 0.5,
  },
  diferenciaProductoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  diferenciaProductoNombre: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    paddingRight: 5
  },
  diferenciaProductoPrecio: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333'
  },
  diferenciaTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
  diferenciaTotalValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.negro
  },

  diferenciaBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10
  },
  diferenciaBalanceDeuda: {
    backgroundColor: '#ffebee', // Fondo rojito muy claro
    borderWidth: 1,
    borderColor: '#ffcdd2'
  },
  diferenciaBalanceAFavor: {
    backgroundColor: '#e8f5e9', // Fondo verdecito muy claro
    borderWidth: 1,
    borderColor: '#c8e6c9'
  },
  diferenciaBalanceValor: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  pagoSaldoContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  pagoSaldoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: COLORS.negro
  },
  pagoSaldoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10
  },
  pagoSaldoContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  pagoSaldoLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    color: COLORS.negro,
    letterSpacing: 0.3
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2
  },
  checkboxText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 5
  },
  checkboxTextActive: {
    fontWeight: '700',
    color: COLORS.morado
  },

})