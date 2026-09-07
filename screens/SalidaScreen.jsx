import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, ScrollView, FlatList, Modal, Image, Platform, LogBox
} from 'react-native';
import { 
  collection, onSnapshot,
  getDocs, doc, getDoc, setDoc, addDoc,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, FontAwesome6, FontAwesome, MaterialIcons, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { calculateEffectiveTier } from '../utils/tierUtils';
import { imagenes } from '../productosData';
import DatePickerField from '../components/DatePickerField';
import SearchBar from '../components/SearchBar';
import AutocompleteSearchSocios from '../components/AutocompleteSearchSocios';
import DropdownProductoRecibir from '../components/DropdownProductoRecibir';
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES, HEADER, GradientDivider } from '../context/theme';
import { getProductosActivos } from '../context/productCatalog'; 

LogBox.ignoreLogs([
  'DateTimePicker: `onChange` is deprecated',
  'DateTimePicker: `onChange` is deprecated. Use `onValueChange`'
]);

export default function SalidaScreen({ onNavigate, darkMode, themeColors }) {
  const { user, userData, cuenta, cuentaId } = useContext(AuthContext);
  const effectiveTier = cuenta 
      ? calculateEffectiveTier(cuenta.tier, cuenta.premiumTrialActive, cuenta.trialStartDate) 
      : 'basic';
  
  // ==========================================
  // ESTADOS Y REFS
  // ==========================================
  const isMountedRef = useRef(true);

  // Productos y carrito
  const [allProducts, setAllProducts] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Modal de cantidad 
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [cantidadModal, setCantidadModal] = useState('1');

  // Formulario de venta
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('');
  const [tipoPago, setTipoPago] = useState('efectivo');
  const [cliente, setCliente] = useState('');
  const [escanerActual, setEscanerActual] = useState(null);
  const [esConsumoBono, setEsConsumoBono] = useState(false);

  // Modal de crédito
  const [modalCreditoVisible, setModalCreditoVisible] = useState(false);
  const [creditoClienteNombre, setCreditoClienteNombre] = useState('');
  const [creditoFechaPTP, setCreditoFechaPTP] = useState(new Date());
  const [creditoNotas, setCreditoNotas] = useState(''); 
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Intercambio Avanzado
  const [productoRecibir, setProductoRecibir] = useState([]); 
  const [modoIntercambio, setModoIntercambio] = useState(false);
  const [socioIntercambio, setSocioIntercambio] = useState(null);
  const [pagoSaldoPor, setPagoSaldoPor] = useState('efectivo'); 
  const [agregandoProductoExtra, setAgregandoProductoExtra] = useState(false);

  // ==========================================
  // EFECTOS
  // ==========================================
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => { 
    if (cuenta) cargarEscanerActual();
  }, [cuenta]);
  
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

  // ==========================================
  // MOTOR LOCAL-FIRST
  // ==========================================
  useEffect(() => {
    if (!user || !cuenta || !cuentaId) return;
    if (isMountedRef.current) setLoadingProducts(true);

    const docRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      const productosData = docSnap.data()?.productos || {};
      const catalogoLocal = getProductosActivos();
      const firebaseArray = Object.values(productosData);

      const productosCombinados = catalogoLocal.map((catalogo) => {
        let datosFirebase = productosData[catalogo.nombre];
        
        if (!datosFirebase) {
          datosFirebase = firebaseArray.find(item => item.nombre === catalogo.nombre) || {};
        }

        return {
          id: catalogo.nombre, 
          nombre: catalogo.nombre,
          codigo: catalogo.codigo, 
          descripcion: catalogo.descripcion || '',
          precioCosto: catalogo.precioCostoStandard || 0,
          precioVenta: catalogo.precioVentaStandard || 0,
          cantidad: parseInt(datosFirebase.cantidad) || 0,
          categoria: catalogo.categoria || '',
        };
      });

      productosCombinados.sort((a, b) => a.nombre.localeCompare(b.nombre));

      if (isMountedRef.current) {
        setAllProducts(productosCombinados);
        setProductosFiltrados(prev => prev.length === 0 ? productosCombinados : productosCombinados);
        setLoadingProducts(false);
      }
    }, (error) => {
      console.log('✈️ Silenciador Offline (Salidas):', error.message);
      if (isMountedRef.current) setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [user, cuenta, cuentaId]);

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

    const itemExistente = carrito.find((item) => item.id === selectedProductModal.id);

    if (itemExistente) {
      const nuevaCantidad = itemExistente.cantidad + cantidadNum;
      if (nuevaCantidad > selectedProductModal.cantidad) {
        Alert.alert('Error', `Stock insuficiente. Disponible: ${selectedProductModal.cantidad}`);
        return;
      }
      setCarrito(carrito.map((item) => item.id === selectedProductModal.id ? { ...item, cantidad: nuevaCantidad } : item));
    } else {
      setCarrito([...carrito, { ...selectedProductModal, cantidad: cantidadNum, subtotal: selectedProductModal.precioVenta * cantidadNum }]);
    }
    setModalVisible(false);
    setSelectedProductModal(null);
    setCantidadModal('1');
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  const actualizarCantidadCarrito = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(id);
    } else {
      const producto = allProducts.find((p) => p.id === id);
      if (nuevaCantidad > producto.cantidad) {
        Alert.alert('Error', `Stock insuficiente. Disponible: ${producto.cantidad}`);
        return;
      }
      setCarrito(carrito.map((item) => item.id === id ? { ...item, cantidad: nuevaCantidad } : item));
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
    const totalDoy = carrito.reduce((sum, item) => sum + (item.precioVentaStandard * item.cantidad || item.precioVenta * item.cantidad || 0), 0);
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
  // HELPERS DE INTERCAMBIO Y VENTAS
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

  const registrarIntercambioAnalytics = async (cuentaIdTarget, socioId, socioNombre, 
    esManualSocio, productosEnviados, productosRecibidos, totalEnviado, totalRecibido, 
    diferenciaIntercambio, pagoSaldoPor, usuarioEmail
  ) => {
    const salidaRef = collection(db, 'cuentas', cuentaIdTarget.toString(), 'salidas');
    const tieneSaldoPendiente = pagoSaldoPor === 'pendiente';
    const ahora = new Date();
    const timestampCompleto = ahora.toISOString(); 
    const fechaCortaISO = timestampCompleto.split('T')[0]; 

    const cantidadTotalEnviada = productosEnviados.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    const cantidadTotalRecibida = productosRecibidos.reduce((sum, item) => sum + (item.cantidad || 0), 0);

    let ingresoCaja = 0;
    let gastoCaja = 0;

    if (!tieneSaldoPendiente) {
      if (diferenciaIntercambio > 0) {
        ingresoCaja = diferenciaIntercambio;
      } else if (diferenciaIntercambio < 0) {
        gastoCaja = Math.abs(diferenciaIntercambio);
      }
    }

    const mesAnio = `${ahora.getMonth() + 1}-${ahora.getFullYear()}`;

    const intercambioDoc = {
      tipo: 'intercambio',
      socioId: socioId,
      socioNombre: socioNombre,
      esManual: esManualSocio,
      productosEnviados: productosEnviados,
      productosRecibidos: productosRecibidos,
      cantidadTotalEnviada: cantidadTotalEnviada,
      cantidadTotalRecibida: cantidadTotalRecibida,
      flujoIngreso: ingresoCaja,
      flujoGasto: gastoCaja,
      mesAnioAnalytics: mesAnio, 
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
      fechaCorta: fechaCortaISO,
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

      if (socioIntercambio.esManual) {
        await actualizarInventarioIntercambio(cuentaId, carrito, productoRecibir);
        await registrarIntercambioAnalytics(
          cuentaId,
          null, 
          socioIntercambio.cuentaNombre,
          true,
          carrito.map(item => ({ nombre: item.nombre, codigo: item.codigo, cantidad: item.cantidad, precioUnitario: item.precioVenta, subtotal: item.precioVenta * item.cantidad })),
          productoRecibir.map(prod => ({ nombre: prod.nombre, codigo: prod.codigo, cantidad: 1, precioUnitario: prod.precioVentaStandard })),
          totalDoy, totalRecibo, diferenciaIntercambio, pagoSaldoPor, user.email
        );
        
        Alert.alert('✅ Éxito', 'Intercambio registrado y actualizado en inventario.');
      } 
      else {
        const peticionesRef = collection(db, 'intercambios_pendientes');
        const solicitudDoc = {
          estado: 'pendiente', 
          deCuentaId: cuentaId.toString(),
          deCuentaNombre: cuenta.nombre || user.email,
          paraCuentaId: socioIntercambio.cuentaId.toString(),
          paraCuentaNombre: socioIntercambio.cuentaNombre,
          productosOfrecidos: carrito.map(item => ({ nombre: item.nombre, codigo: item.codigo, cantidad: item.cantidad, precioVenta: item.precioVenta })),
          productosSolicitados: productoRecibir.map(prod => ({ nombre: prod.nombre, codigo: prod.codigo, cantidad: 1, precioVenta: prod.precioVentaStandard })),
          totales: {
            totalOfrecido: totalDoy,
            totalSolicitado: totalRecibo,
            diferencia: diferenciaIntercambio
          },
          pagoSaldoPor: pagoSaldoPor,
          creadoPor: user.email,
          timestamp: new Date().toISOString()
        };

        await addDoc(peticionesRef, solicitudDoc);

        Alert.alert(
          '📨 Solicitud Enviada', 
          `Esperando a que ${socioIntercambio.cuentaNombre} confirme el cambio.`
        );
      }

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
      }

    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert('Error', 'Error al procesar el intercambio: ' + error.message);
        setLoading(false);
      }
    }
  };

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
      const timestampCompleto = ahora.toISOString();
      const fechaCortaISO = timestampCompleto.split('T')[0];
      
      const productosLocales = getProductosActivos();

      const inventarioRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');
      const docSnap = await getDoc(inventarioRef);
      let productosActuales = docSnap.data()?.productos || {};

      const productosActualizados = { ...productosActuales };
      
      for (let i = 0; i < carrito.length; i++) {
        const item = carrito[i];
        
        const cantidadActual = productosActualizados[item.id]?.cantidad || 0;
        const piezasConDescuentoActual = productosActualizados[item.id]?.piezasConDescuento || 0;

        let nuevasPiezasConDescuento = piezasConDescuentoActual;
        
        if (esConsumoBono) {
          nuevasPiezasConDescuento = Math.max(0, piezasConDescuentoActual - item.cantidad);
        }

        productosActualizados[item.id] = {
          ...productosActualizados[item.id],
          cantidad: cantidadActual - item.cantidad,
          piezasConDescuento: nuevasPiezasConDescuento, 
          codigo: item.codigo, 
          consumoBono: esConsumoBono,
          updatedAt: timestampCompleto,
        };
      }

      await setDoc(inventarioRef, { productos: productosActualizados, updatedAt: timestampCompleto }, { merge: true });

      const salidaRef = collection(db, 'cuentas', cuentaId.toString(), 'salidas');
      const escanerJSON = await AsyncStorage.getItem('escanerActual');
      let escanerActualActualizado = escanerJSON ? JSON.parse(escanerJSON) : null;

      for (let i = 0; i < carrito.length; i++) {
        const item = carrito[i];
        
        const prodCatalogo = productosLocales.find(p => p.codigo === item.codigo || p.id === item.codigo);
        const costoUnitarioBase = prodCatalogo ? parseFloat(prodCatalogo.precioCostoStandard || prodCatalogo.costo || prodCatalogo.precioCosto || 0) : 0;
        const costoTotalLinea = costoUnitarioBase * item.cantidad;

        const ventaDoc = {
          producto: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioVenta,
          subtotal: item.precioVenta * item.cantidad,
          descuentoPorcentaje: parseFloat(descuentoPorcentaje) || 0,
          descuentoMonto: totales.montoDescuento / carrito.length,
          total: (item.precioVenta * item.cantidad) - (totales.montoDescuento / carrito.length),
          costoUnitarioReal: costoUnitarioBase,
          costoTotalVenta: costoTotalLinea,
          cliente: cliente || 'Sin cliente',
          tipoPago: tipoPago,
          consumoBono: esConsumoBono,
          usuario: user.email,
          fecha: fechaCortaISO,
          timestamp: timestampCompleto,
          escanerId: escanerActualActualizado?.id || null,
          nombreEvento: escanerActualActualizado?.evento || null,
          escanerFecha: escanerActualActualizado?.fechaFormato || null,
          escanerMonto: escanerActualActualizado?.monto || null,
          escanerInvitados: escanerActualActualizado?.invitados || null,

          creadoPorUid: user.uid,
          creadoPorNombre: userData?.nombre || user.email,
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
                  setEsConsumoBono(false);
                }
              },
          }]
        );
      }
    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert('Error', 'Error al registrar venta: ' + error.message);
        setLoading(false);
        setEsConsumoBono(false);
      }
    }
  };

  const registrarVentaConCredito = async () => {
    if (!creditoClienteNombre.trim()) return Alert.alert('Error', 'Ingresa el nombre del cliente');
    if (isMountedRef.current) setLoading(true);

    try {
      const totales = calcularTotales();
      const ahora = new Date(); 
      const timestampCompleto = ahora.toISOString();
      const fechaCortaISO = timestampCompleto.split('T')[0];

      let fechaPTPSegura = fechaCortaISO; 
      try {
        if (creditoFechaPTP) {
          const parsedDate = new Date(creditoFechaPTP);
          if (!isNaN(parsedDate.getTime())) {
            fechaPTPSegura = parsedDate.toISOString().split('T')[0]; 
          }
        }
      } catch(e) {
        console.log("Error parseando fecha PTP, usando fallback");
      }

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
          updatedAt: timestampCompleto,
        };
      }

      await setDoc(inventarioRef, { productos: productosActualizados, updatedAt: timestampCompleto }, { merge: true });

      const escanerJSON = await AsyncStorage.getItem('escanerActual');
      let escanerActualActualizado = escanerJSON ? JSON.parse(escanerJSON) : null;
      const salidaRef = collection(db, 'cuentas', cuentaId.toString(), 'salidas');
      const ventasIds = [];

      for (let i = 0; i < carrito.length; i++) {
        const item = carrito[i];
        const ventaDoc = {
          producto: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioVenta,
          subtotal: item.precioVenta * item.cantidad,
          descuentoPorcentaje: parseFloat(descuentoPorcentaje) || 0,
          descuentoMonto: totales.montoDescuento / carrito.length,
          total: (item.precioVenta * item.cantidad) - (totales.montoDescuento / carrito.length),
          cliente: creditoClienteNombre,
          tipoPago: 'crd',
          usuario: user.email,
          fecha: fechaCortaISO,
          timestamp: timestampCompleto,
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
        fechaPTP: fechaPTPSegura, 
        notas: creditoNotas,
        estado: 'pendiente',
        ventasIds: ventasIds,
        timestamp: timestampCompleto, 
        creadorEmail: user.email,
        creadoPorUid: user.uid,
        creadoPorNombre: userData?.nombre || user.email,
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
        const [año, mes, dia] = fechaPTPSegura.split('-');
        const fechaLegible = `${dia}/${mes}/${año}`;
        
        Alert.alert(
          '✅ Crédito registrado',
          `Cliente: ${creditoClienteNombre}\nMonto: $${totales.total.toFixed(2)}\nVence: ${fechaLegible}`,
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
  const esDeuda = diff > 0; 
  const montoAbsoluto = Math.abs(diff).toFixed(2);

  const renderProductoGrid = ({ item }) => {
    const codigoReal = item.codigo || item.id;
    const imagen = imagenes[codigoReal];
    const sinStock = item.cantidad === 0;

    return (
      <TouchableOpacity
        style={[
          GLOBAL_STYLES.cardStandard, 
          { 
            backgroundColor: themeColors.bgSecondary, 
            borderColor: sinStock ? COLORS.rojo : themeColors.border, 
            width: '30%', 
            flexDirection: 'column', 
            alignItems: 'center',
            padding: 10, 
            marginBottom: 0,
            opacity: sinStock ? 0.5 : 1 
          }
        ]}
        onPress={() => abrirModalProducto(item)}
        disabled={sinStock}
        activeOpacity={0.7}
      >
        {imagen ? (
          <Image source={imagen} style={styles.productImage} />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: themeColors.input }]}>
            <Text style={styles.productImagePlaceholderText}>
              <FontAwesome6 name="box" size={20} color={themeColors.textSecondary} />
            </Text>
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: themeColors.text }]} numberOfLines={2}>
            {item.nombre}
          </Text>
          <Text style={[styles.productPrice, { color: COLORS.turquesa }]}>
            ${item.precioVenta}
          </Text>
          <Text style={[styles.productStock, { color: sinStock ? COLORS.rojo : themeColors.textSecondary, fontWeight: sinStock ? 'bold' : '600' }]}>
            {sinStock ? 'Sin Stock' : `Stock: ${item.cantidad}`}
          </Text>
        </View>
        {!sinStock && (
          <View style={[styles.addBtnContainer, { backgroundColor: themeColors.bgSecondary }]}>
            <Ionicons name="add-circle" size={30} color={COLORS.turquesa} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCarritoItem = ({ item }) => (
    <View style={[styles.carritoItem, { borderBottomColor: themeColors.border }]}>
      <View style={styles.carritoItemInfo}>
        <Text style={[styles.carritoItemNombre, { color: themeColors.text }]}>{item.nombre}</Text>
        <Text style={[styles.carritoItemPrecio, { color: themeColors.textSecondary }]}>
          ${item.precioVenta} × {item.cantidad} = ${(item.precioVenta * item.cantidad).toFixed(2)}
        </Text>
      </View>
      <View style={styles.carritoItemControles}>
        <TouchableOpacity onPress={() => actualizarCantidadCarrito(item.id || item.codigo, item.cantidad - 1)}>
          <Text style={styles.btnCantidad}><Ionicons name="remove" size={28} color={themeColors.textSecondary} /></Text>
        </TouchableOpacity>
        <Text style={[styles.cantidadCarrito, { color: themeColors.text }]}>{item.cantidad}</Text>
        <TouchableOpacity onPress={() => actualizarCantidadCarrito(item.id || item.codigo, item.cantidad + 1)}>
          <Text style={styles.btnCantidad}><Ionicons name="add" size={28} color={COLORS.turquesa} /></Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => eliminarDelCarrito(item.id || item.codigo)} style={styles.btnEliminar}>
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
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      
      <ScreenHeader 
        title="Ventas" 
        onPress={() => onNavigate('home')} 
        themeColors={themeColors} 
        rightAction={
          effectiveTier === 'special_k' ? (
            <TouchableOpacity 
              onPress={toggleModoIntercambio}
              style={[styles.btnIntercambio, modoIntercambio && styles.btnIntercambioActive]}
            >
              <MaterialIcons name="change-circle" size={30} color={modoIntercambio ? COLORS.turquesa : themeColors.text} />
            </TouchableOpacity>
          ) : null
        }
      />

      {escanerActual && (
        <View style={styles.escanerIndicador}>
          <Text style={styles.escanerIndicadorText}>
            <Entypo name="pin" size={12} color="red" /> Evento: {escanerActual.evento} | Total: ${escanerActual.ventaTotal || 0}
          </Text>
        </View>
      )}

      {modoIntercambio && (
        <View style={styles.bannerIntercambio}>
          <Text style={styles.bannerIntercambioText}>Intercambia productos con asociados</Text>
        </View>
      )}

      <SearchBar data={allProducts} onSearch={setProductosFiltrados} searchKeys={['nombre', 'codigo']} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* GRID DE PRODUCTOS */}
        <View style={styles.gridContainer}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Selecciona productos y baja hacia el checkout <FontAwesome6 name="circle-down" size={14} color={COLORS.turquesa} />
          </Text>
          <FlatList
            data={productosFiltrados}
            renderItem={renderProductoGrid}
            keyExtractor={(item, index) => `${item.codigo || item.id || 'prod'}-${index}`}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
          />
        </View>

        {/* CARRITO */}
        <View style={styles.carritoContainer}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            <Ionicons name="cart-outline" size={18} color={themeColors.text} /> Carrito ({carrito.length} items)
          </Text>
          {carrito.length === 0 ? (
            <Text style={styles.carritoVacio}>El carrito está vacío</Text>
          ) : (
            <FlatList
              data={carrito}
              renderItem={renderCarritoItem}
              keyExtractor={(item, index) => `cart-${item.codigo || item.id}-${index}`}
              scrollEnabled={false}
            />
          )}
        </View>

        {modoIntercambio ? (
          <>
            {/* MODO INTERCAMBIO */}
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.label}>Socio:</Text>
              <AutocompleteSearchSocios onSelect={setSocioIntercambio} value={socioIntercambio?.cuentaNombre || ''} />
            </View>

            {/* Productos a recibir */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.label}>Productos a recibir:</Text>
                {(productoRecibir.length > 0 && !agregandoProductoExtra) && (
                  <TouchableOpacity style={styles.btnAgregarProducto} onPress={() => setAgregandoProductoExtra(true)}>
                    <Text style={{ fontSize: 14, color: COLORS.turquesa, fontWeight: 'bold' }}>+ Agregar otro</Text>
                  </TouchableOpacity>
                )}
              </View>

              {productoRecibir.length > 0 && (
                <View style={styles.productosRecibidosList}>
                  {productoRecibir.map((prod, idx) => (
                    <View key={idx} style={styles.productoRecibidoItem}>
                      <View>
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

              {(productoRecibir.length === 0 || agregandoProductoExtra) && (
                <View style={{ marginTop: productoRecibir.length > 0 ? 10 : 0 }}>
                  <DropdownProductoRecibir onSelect={(prod) => { setProductoRecibir([...productoRecibir, prod]); setAgregandoProductoExtra(false); }} value={null} />
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

                  <View style={styles.diferenciasFlecha}><Text style={styles.flechaTexto}><FontAwesome name="exchange" size={24} color={COLORS.morado} /></Text></View>

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

                {/* SECCIÓN BALANCE Y FORMA DE LIQUIDAR */}
                {diff !== 0 && (
                  <View style={styles.pagoSaldoContainer}>
                    <Text style={styles.pagoSaldoLabel}>
                      {esDeuda 
                        ? <><FontAwesome6 name="money-bill-wave" size={14} color={COLORS.rojo} /> Saldo en contra: ${montoAbsoluto}</> 
                        : <><FontAwesome6 name="money-bill-wave" size={14} color={COLORS.verde} /> Saldo a favor: ${montoAbsoluto}</>}
                    </Text>
                    
                    <View style={styles.checkboxRow}>
                      <TouchableOpacity style={styles.checkboxOption} onPress={() => setPagoSaldoPor('efectivo')} activeOpacity={0.7}>
                        <Ionicons name={pagoSaldoPor === 'efectivo' ? "radio-button-on" : "radio-button-off"} size={18} color={pagoSaldoPor === 'efectivo' ? COLORS.morado : '#999'} />
                        <Text style={[styles.checkboxText, pagoSaldoPor === 'efectivo' && styles.checkboxTextActive]}>Efectivo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.checkboxOption} onPress={() => setPagoSaldoPor('stp')} activeOpacity={0.7}>
                        <Ionicons name={pagoSaldoPor === 'stp' ? "radio-button-on" : "radio-button-off"} size={18} color={pagoSaldoPor === 'stp' ? COLORS.morado : '#999'} />
                        <Text style={[styles.checkboxText, pagoSaldoPor === 'stp' && styles.checkboxTextActive]}>TDD/TDC</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.checkboxOption} onPress={() => setPagoSaldoPor('pendiente')} activeOpacity={0.7}>
                        <Ionicons name={pagoSaldoPor === 'pendiente' ? "radio-button-on" : "radio-button-off"} size={18} color={pagoSaldoPor === 'pendiente' ? COLORS.morado : '#999'} />
                        <Text style={[styles.checkboxText, pagoSaldoPor === 'pendiente' && styles.checkboxTextActive]}>Dejar Pendiente</Text>
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
            <View style={{ marginBottom: 15 }}>
              <TextInput 
                style={[
                  GLOBAL_STYLES.inputBase,
                  { 
                    backgroundColor: themeColors.bgSecondary, 
                    color: themeColors.text, 
                    borderColor: themeColors.border, 
                    borderWidth: 1,
                    height: 50 ,
                    paddingHorizontal: 15
                  }
                ]} 
                placeholder="Cliente (opcional)" 
                placeholderTextColor={themeColors.textSecondary} 
                value={cliente} 
                onChangeText={setCliente} 
                editable={!loading} 
              />
            </View>

            {/* FILA EN 2 COLUMNAS: DESCUENTO + BONO INFLUENCER */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              
              {/* Columna 1: Descuento */}
                <TextInput
                  style={[
                    GLOBAL_STYLES.inputBase,
                    { 
                      flex: 1,
                      marginRight: 6,
                      height: 50,
                      backgroundColor: themeColors.bgSecondary,
                      color: themeColors.text,
                      borderColor: themeColors.border,
                      borderWidth: 1,
                      paddingHorizontal: 15,
                    }
                  ]}
                  placeholder="Descuento (%)"
                  placeholderTextColor={themeColors.textSecondary}
                  keyboardType="numeric"
                  value={descuentoPorcentaje}
                  onChangeText={setDescuentoPorcentaje}
                />
              {/* Columna 2: Bono Influencer */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  marginLeft: 6,
                  height: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: esConsumoBono ? COLORS.turquesa : themeColors.border,
                  backgroundColor: esConsumoBono ? COLORS.turquesa : themeColors.bgSecondary,
                  paddingHorizontal: 15,
                }}
                onPress={() => setEsConsumoBono(!esConsumoBono)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={esConsumoBono ? "star" : "star-outline"}
                  size={18}
                  color={esConsumoBono ? COLORS.blanco : themeColors.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    marginLeft: 6,
                    color: esConsumoBono ? COLORS.blanco : themeColors.textSecondary,
                  }}
                >
                  {esConsumoBono ? "Bono Activo" : "Bono Influencer"}
                </Text>
              </TouchableOpacity>

            </View>
          </>
        )}

        {/* Totales */}
        {carrito.length > 0 && !modoIntercambio && (
          <View style={[
            GLOBAL_STYLES.cardStandard, 
            { 
              backgroundColor: themeColors.bgSecondary, 
              borderColor: themeColors.border,
              padding: 15, 
              marginBottom: 15,
              flexDirection: 'column', 
              alignItems: 'stretch',
             // width: '100%' 
            }
          ]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: themeColors.textSecondary }}>Subtotal:</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: themeColors.text }}>${totales.subtotal.toFixed(2)}</Text>
            </View>

            {totales.descuento > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, color: themeColors.textSecondary }}>Descuento ({totales.descuento}%):</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.turquesa }}>-${totales.montoDescuento.toFixed(2)}</Text>
              </View>
            )}
           
            {/* 🌈 LÍNEA DIVISORIA */}
            <GradientDivider marginVertical={15} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>TOTAL:</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.naranja }}>${totales.total.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Tipo de pago */}
        {!modoIntercambio && (
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: themeColors.text, marginBottom: 12 }}>Tipo de pago:</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            
            {/* Efectivo */}
            <TouchableOpacity 
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: tipoPago === 'efectivo' ? COLORS.turquesa : themeColors.border,
                backgroundColor: themeColors.bgSecondary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center', 
                justifyContent: 'center' 
              }} 
              onPress={() => setTipoPago('efectivo')}
            >
              <FontAwesome6 name="money-bill-wave" size={24} color={tipoPago === 'efectivo' ? COLORS.turquesa : themeColors.textSecondary} style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: tipoPago === 'efectivo' ? COLORS.turquesa : themeColors.textSecondary }}>Efectivo</Text>
            </TouchableOpacity>

            {/* STP */}
            <TouchableOpacity 
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: tipoPago === 'stp' ? COLORS.turquesa : themeColors.border,
                backgroundColor: themeColors.bgSecondary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center'
              }} 
              onPress={() => setTipoPago('stp')}
            >
              <FontAwesome6 name="credit-card" size={24} color={tipoPago === 'stp' ? COLORS.turquesa : themeColors.textSecondary} style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: tipoPago === 'stp' ? COLORS.turquesa : themeColors.textSecondary }}>TDD/TDC</Text>
            </TouchableOpacity>

            {/* CRD */}
            {(effectiveTier === 'premium' || effectiveTier === 'special_k') && (
              <TouchableOpacity 
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderColor: tipoPago === 'crd' ? COLORS.turquesa : themeColors.border,
                  backgroundColor: themeColors.bgSecondary,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center'
                }} 
                onPress={() => setTipoPago('crd')}
              >
                <FontAwesome6 name="building-columns" size={24} color={tipoPago === 'crd' ? COLORS.turquesa : themeColors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: tipoPago === 'crd' ? COLORS.turquesa : themeColors.textSecondary }}>CRD</Text>
              </TouchableOpacity>
            )}

          </View>
        </View>
        )}

        {/* Botones principales */}
        <View style={GLOBAL_STYLES.modalButtons}>
          <TouchableOpacity 
            style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf, loading && GLOBAL_STYLES.disabledBtn]} 
            onPress={() => { setCarrito([]); setDescuentoPorcentaje(''); setCliente(''); setTipoPago('efectivo'); }} 
            disabled={loading}
          >
            <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, (loading || carrito.length === 0) && GLOBAL_STYLES.disabledBtn]} 
            onPress={modoIntercambio ? registrarIntercambio : registrarVenta} 
            disabled={loading || carrito.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={GLOBAL_STYLES.btnText}>
                {modoIntercambio ? 'Confirmar cambio' : 'Confirmar venta'}
              </Text>
            )}
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
                      <Text style={styles.cantidadBtnText}><Ionicons name="remove-circle" size={34} color={ COLORS.turquesa } /></Text>
                    </TouchableOpacity>
                    <TextInput style={styles.cantidadInput} value={cantidadModal} onChangeText={setCantidadModal} keyboardType="number-pad" />
                    <TouchableOpacity onPress={() => { const nueva = parseInt(cantidadModal) + 1; if (nueva <= selectedProductModal.cantidad) setCantidadModal(nueva.toString()); }} style={styles.cantidadBtn}>
                      <Text style={styles.cantidadBtnText}><Ionicons name="add-circle" size={34} color={ COLORS.turquesa } /></Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.modalTotalBox}>
                  <Text style={styles.modalTotalLabel}>Total:</Text>
                  <Text style={styles.modalTotalValue}>${(selectedProductModal.precioVenta * parseInt(cantidadModal)).toFixed(2)}</Text>
                </View>
                <View style={GLOBAL_STYLES.modalButtons}>
                  <TouchableOpacity style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]} onPress={() => setModalVisible(false)}>
                    <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf]} onPress={agregarAlCarrito}>
                    <Text style={GLOBAL_STYLES.btnText}>Agregar</Text>
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

            <DatePickerField
              label="Fecha de pago pactada:"
              value={creditoFechaPTP}
              onDateChange={(nuevaFecha) => setCreditoFechaPTP(nuevaFecha)}
              containerStyle={styles.formGroup}
            />
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Notas (opcional):</Text>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Ej: Pagar después del 15" value={creditoNotas} onChangeText={setCreditoNotas} multiline={true} editable={!loading} />
            </View>

            <View style={{ backgroundColor: themeColors.bgSecondary, padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: themeColors.border }}>
              <Text style={{ fontSize: 14, color: themeColors.textSecondary, marginBottom: 4 }}>Monto total del crédito:</Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.naranja }}>${calcularTotales().total.toFixed(2)}</Text>
            </View>

            <View style={GLOBAL_STYLES.modalButtons}>
              <TouchableOpacity style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf, loading && GLOBAL_STYLES.disabledBtn]} onPress={() => setModalCreditoVisible(false)} disabled={loading}>
                <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, loading && GLOBAL_STYLES.disabledBtn]} onPress={registrarVentaConCredito} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.blanco} /> : <Text style={GLOBAL_STYLES.btnText}>Registrar crédito</Text>}
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
    flex: 1, 
  },
  content: { 
    flex: 1, 
    padding: 15, 
  },
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  loaderText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#666', 
  },
  gridContainer: { 
    marginBottom: 30, 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 12, 
  },
  gridRow: { 
    justifyContent: 'space-between', 
    marginBottom: 12, 
  },
  imagenPlaceholder: { 
    width: '100%', 
    height: 90, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 6, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8, 
  },
  imagenPlaceholderText: { 
    fontSize: 32, 
  },
  productoNombre: { 
    fontSize: 12, 
    fontWeight: '600', 
    textAlign: 'center', 
    marginBottom: 3, 
  },
  productoPrecio: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: COLORS.turquesa, 
    marginBottom: 4, 
  },
  stock: { 
    fontSize: 10, 
    color: '#666', 
  },
  sinStock: { 
    fontSize: 10, 
    color: COLORS.rojo, 
    fontWeight: 'bold', 
  },
  carritoContainer: { 
    backgroundColor: 'transparent', 
    borderRadius: 8, 
    padding: 15, 
    marginBottom: 20, 
    borderWidth: 2, 
    borderColor: COLORS.turquesa, 
  },
  carritoVacio: { 
    fontSize: 14, 
    color: '#999', 
    fontStyle: 'italic', 
    textAlign: 'center', 
    paddingVertical: 20, 
  },
  carritoItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
  },
  carritoItemInfo: { 
    flex: 1, 
  },
  carritoItemNombre: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 4, 
  },
  carritoItemPrecio: { 
    fontSize: 12, 
  },
  carritoItemControles: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
  },
  btnCantidad: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.turquesa, 
    paddingHorizontal: 8, 
  },
  cantidadCarrito: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    minWidth: 24, 
    textAlign: 'center', 
  },
  btnEliminar: { 
    paddingLeft: 8, 
  },
  btnEliminarText: { 
    fontSize: 16, 
    color: COLORS.rojo, 
    fontWeight: 'bold', 
  },
  formGroup: { 
    marginBottom: 20, 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.negro, 
    marginBottom: 8, 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16, 
    backgroundColor: COLORS.blanco, 
  },
  disabledBtn: { 
    opacity: 0.5, 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  modalContent: { 
    backgroundColor: COLORS.blanco, 
    borderRadius: 16, 
    padding: 20, 
    width: '85%', 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.negro, 
    marginBottom: 15, 
    textAlign: 'center', 
  },
  modalPrecioBox: { 
    backgroundColor: '#f5f5f5', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 12, 
  },
  modalPrecioLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4, 
  },
  modalPrecioValue: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: COLORS.turquesa, 
  },
  modalStockBox: { 
    backgroundColor: '#f5f5f5', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 15, 
  },
  modalStockLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4, 
  },
  modalStockValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.negro, 
  },
  modalFormGroup: { 
    marginBottom: 15, 
  },
  modalLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.negro, 
    marginBottom: 10, 
  },
  cantidadInputGroup: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 5,
  },
//   cantidadBtn: {
//     backgroundColor: COLORS.turquesa,
//     width: 44,
//     height: 44,
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
 // },
//   cantidadBtnText: {
//     fontSize: 24,
//     color: COLORS.blanco,
//     fontWeight: 'bold',
 // },
  cantidadInput: { 
    paddingHorizontal: 12,
    paddingVertical: 10, 
    fontSize: 26,
    fontWeight: 'bold', 
    color: COLORS.negro, 
    minWidth: 50,
    textAlign: 'center', 
  },
  modalTotalBox: { 
    backgroundColor: '#f5f5f5',
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 20, 
  },
  modalTotalLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4, 
  },
  modalTotalValue: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: COLORS.turquesa,
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
    color: COLORS.negro, 
  },
  btnIntercambio: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8, 
    backgroundColor: 'transparent', 
    borderWidth: 2, 
    borderColor: COLORS.blanco, 
  },
  btnIntercambioActive: { 
    backgroundColor: COLORS.blanco, 
  },
  bannerIntercambio: { 
    backgroundColor: COLORS.morado, 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    alignItems: 'center', 
  },
  bannerIntercambioText: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: COLORS.blanco, 
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
    elevation: 3, 
  },
  diferenciaTitulo: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.negro, 
    marginBottom: 12, 
    textAlign: 'center', 
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
    borderColor: '#eee', 
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
    marginBottom: 4, 
  },
  diferenciaProductoNombre: { 
    fontSize: 12, 
    color: '#333', 
    flex: 1, 
    paddingRight: 5, 
  },
  diferenciaProductoPrecio: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#333', 
  },
  diferenciaTotalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 8, 
    paddingTop: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#ddd', 
  },
  diferenciaTotalValue: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: COLORS.negro, 
  },
  diferenciaBalance: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    marginTop: 10, 
  },
  diferenciaBalanceDeuda: { 
    backgroundColor: '#ffebee', 
    borderWidth: 1, 
    borderColor: '#ffcdd2', 
  },
  diferenciaBalanceAFavor: { 
    backgroundColor: '#e8f5e9', 
    borderWidth: 1, 
    borderColor: '#c8e6c9', 
  },
  diferenciaBalanceValor: { 
    fontSize: 16, 
    fontWeight: 'bold', 
  },
  pagoSaldoContainer: { 
    marginTop: 15, 
    paddingTop: 15, 
    borderTopWidth: 1, 
    borderTopColor: '#eee', 
  },
  pagoSaldoLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 12, 
    textAlign: 'center', 
    color: COLORS.negro, 
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
    borderColor: '#f0f0f0', 
  },
  checkboxOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 4, 
    paddingHorizontal: 2, 
  },
  checkboxText: { 
    fontSize: 12, 
    fontWeight: '500', 
    color: '#666', 
    marginLeft: 5, 
  },
  checkboxTextActive: { 
    fontWeight: '700', 
    color: COLORS.morado, 
  },
  // --- FILA DOBLE COLUMNA PARA MODAL ---
  rowFormContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.global,
  },
  halfInputContainer: {
    flex: 1,
    marginRight: 6,
    backgroundColor: COLORS.blanco,
  },
  inputHalf: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: SPACING.content_padding,
    height: 48,
    fontSize: FONT_SIZES.normal,
  },
  productImage: { 
    width: '80%', 
    height: 80, 
    resizeMode: 'contain', 
    marginBottom: 8, 
  },
  productImagePlaceholder: { 
    width: '100%', 
    height: 80, 
    borderRadius: 6, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8, 
  },
  productImagePlaceholderText: { 
    fontSize: 32, 
  },
  productInfo: { 
    paddingHorizontal: 2, 
    alignItems: 'center', 
    width: '100%', 
    backgroundColor: 'transparent', 
    marginBottom: 8, 
  },
  productName: { 
    fontSize: 11, 
    fontWeight: '700', 
    textAlign: 'center', 
    marginBottom: 3, 
    lineHeight: 14, 
    height: 28, 
    textAlignVertical: 'top', 
  },
  productPrice: { 
    fontSize: 12, 
    fontWeight: '900', 
    marginBottom: 2, 
  },
  productStock: { 
    fontSize: 10, 
  },
  addBtnContainer: { 
    position: 'absolute', 
    bottom: 3, 
    right: 3, 
    borderRadius: 15, 
  },
});