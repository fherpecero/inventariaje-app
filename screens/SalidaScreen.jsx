import { imagenes } from '../productosData';
import React, { useState, useEffect, useRef, useContext } from 'react';
import { getTimestamp } from '../utils/utils';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  FlatList,
  Modal,
  Image,
} from 'react-native';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  addDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

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

export default function SalidaScreen({ onNavigate, darkMode, themeColors }) {
  const { user, cuenta, cuentaId } = useContext(AuthContext);
  const [allProducts, setAllProducts] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [cantidadModal, setCantidadModal] = useState('1');
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('');
  const [tipoPago, setTipoPago] = useState('efectivo');
  const [cliente, setCliente] = useState('');
  const [escanerActual, setEscanerActual] = useState(null); 

  // ✅ PASO 1: CREAR REF (Línea ~52)
  const isMountedRef = useRef(true);

  // ✅ PASO 2: CLEANUP AL DESMONTAR (Línea ~55-59)
  useEffect(() => {
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ PASO 3: CARGAR DATOS EN MOUNT (Línea ~61-66)
  useEffect(() => {
    if (user && cuenta) {
      cargarProductos();
    }
  }, [user, cuenta]);

  //CAMBIO 2: SalidaScreen.jsx
  useEffect(() => { 
    if (cuenta) {
    cargarEscanerActual();  // ← AGREGAR AQUÍ
    }
  }, [cuenta]);
  
//   return unsubscribe;
// }, [navigation]);

  const cargarProductos = async () => {
    // ✅ PASO 4: GUARDIA AL INICIO (Línea ~80)
    if (!isMountedRef.current) return;
    
    // ✅ PASO 5: PROTEGER setLoadingProducts (Línea ~82)
    if (isMountedRef.current) setLoadingProducts(true);

    try {
      console.log('🛒 Cargando productos para venta, cuenta:', cuenta);

      // PASO 1: Leer catálogo global
      const catalogoRef = collection(db, 'catalogoGlobal');
      const catalogoSnap = await getDocs(catalogoRef);

      // PASO 2: Leer inventario de la cuenta
      const docRef = doc(
        db,
        'cuentas',
        cuentaId.toString(),
        'inventarios',
        'vital_health_principal'
      );
      const docSnap = await getDoc(docRef);
      const productos = docSnap.data()?.productos || {};

      // Crear mapa de inventario
      const inventarioMap = {};
      Object.keys(productos).forEach((codigo) => {
        inventarioMap[codigo] = productos[codigo].cantidad || 0;
      });

      // PASO 3: Combinar catálogo + inventario
      const productosCombinados = catalogoSnap.docs
        .map((doc) => {
          const catalogo = doc.data();
          const cantidad = inventarioMap[doc.id] || 0;

          return {
            id: doc.id,
            nombre: catalogo.nombre,
            codigo: catalogo.codigo,
            descripcion: catalogo.descripcion,
            precioCosto: catalogo.precioCostoStandard || 0,
            precioVenta: catalogo.precioVentaStandard || 0,
            cantidad: cantidad, 
            categoria: catalogo.categoria,
          };
        })
        .filter((p) => p && p.nombre && p.codigo);

      // ✅ PASO 6: PROTEGER setAllProducts (Línea ~119)
      if (!isMountedRef.current) return;

      setAllProducts(productosCombinados);
      console.log('✅ Productos cargados:', productosCombinados.length);

    } catch (error) {
      // ✅ PASO 7: PROTEGER Alert (Línea ~126)
      if (!isMountedRef.current) return;
      Alert.alert('Error', 'No se pudieron cargar los productos: ' + error.message);
      console.error('Error:', error);
    } finally {
      // ✅ PASO 8: PROTEGER EN finally (Línea ~131)
      if (isMountedRef.current) {
        setLoadingProducts(false);
      }
    }
  };

  const cargarEscanerActual = async () => {  
  try {
    const escanerRef = collection(db, 'cuentas', cuentaId.toString(), 'escaneres');
    const q = query(escanerRef, where('estado', '==', 'activo'));
    const escanerSnap = await getDocs(q);

    if (!escanerSnap.empty) {
      const firestoreData = escanerSnap.docs[0].data();
      
      // ✅ MAPEAR CAMPOS de Firestore al formato esperado
      const escanerData = {
        evento: firestoreData.evento,
        fechaFormato: firestoreData.fecha,
        fecha: firestoreData.fechaISO,
        invitados: firestoreData.personas || 0,   // ← AGREGAR
        monto: firestoreData.montoCobrado || 0,   // ← AGREGAR
        cantidad: firestoreData.cantidad || 0,
        ventaTotal: firestoreData.ventaTotal || 0,
        id: firestoreData.id,
      };

      await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerData));
      setEscanerActual(escanerData);
      console.log('✅ Escáner cargado:', escanerData.evento);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};
  
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

    // Verificar stock
    if (cantidadNum > selectedProductModal.cantidad) {
      Alert.alert(
        'Error',
        `No tenemos joven, a la vuelta. Disponible: ${selectedProductModal.cantidad}`
      );
      return;
    }

    // Verificar si ya existe en el carrito
    const itemExistente = carrito.find(
      (item) => item.codigo === selectedProductModal.codigo
    );

    if (itemExistente) {
      const nuevaCantidad = itemExistente.cantidad + cantidadNum;
      if (nuevaCantidad > selectedProductModal.cantidad) {
        Alert.alert(
          'Error',
          `No tenemos joven, a la vuelta. Disponible: ${selectedProductModal.cantidad}`
        );
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.codigo === selectedProductModal.codigo
            ? { ...item, cantidad: nuevaCantidad }
            : item
        )
      );
    } else {
      setCarrito([
        ...carrito,
        {
          ...selectedProductModal,
          cantidad: cantidadNum,
          subtotal: selectedProductModal.precioVenta * cantidadNum,
        },
      ]);
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
        Alert.alert(
          'Error',
          `No tenemos joven, a la vuelta. Disponible: ${producto.cantidad}`
        );
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.codigo === codigo
            ? { ...item, cantidad: nuevaCantidad }
            : item
        )
      );
    }
  };

  const calcularTotales = () => {
    const subtotal = carrito.reduce(
      (sum, item) => sum + item.precioVenta * item.cantidad,
      0
    );
    const descuento = parseFloat(descuentoPorcentaje) || 0;
    const montoDescuento = (subtotal * descuento) / 100;
    const total = subtotal - montoDescuento;

    return {
      subtotal,
      descuento,
      montoDescuento,
      total,
    };
  };


  const registrarVenta = async () => {
  if (!isMountedRef.current) return;

  if (carrito.length === 0) {
    Alert.alert('Error', 'El carrito está vacío');
    return;
  }

  if (isMountedRef.current) setLoading(true);

  try {
    const totales = calcularTotales();
    const ahora = new Date();

    console.log('💳 INICIANDO REGISTRO DE VENTA');
    console.log('Cuenta:', cuenta);
    console.log('Total items:', carrito.length);
    console.log('Monto total:', totales.total);

    // ✅ PASO 1: Leer el documento COMPLETO del inventario
    const inventarioRef = doc(
      db,
      'cuentas',
      cuentaId.toString(),
      'inventarios',
      'vital_health_principal'
    );

    const docSnap = await getDoc(inventarioRef);
    let productosActuales = docSnap.data()?.productos || {};

    console.log('📦 Productos actuales:', Object.keys(productosActuales).length);

    // ✅ PASO 2: Actualizar cantidades de TODOS los items del carrito
    const productosActualizados = { ...productosActuales };

    for (let i = 0; i < carrito.length; i++) {
      const item = carrito[i];

      const cantidadActual = productosActualizados[item.id]?.cantidad || 0;
      const nuevaCantidad = cantidadActual - item.cantidad;

      productosActualizados[item.id] = {
        ...productosActualizados[item.id],
        cantidad: nuevaCantidad,
        codigo: item.codigo,
        nombre: item.nombre,
        updatedAt: ahora.toISOString(),
      };

      console.log(`✅ Inventario ${item.nombre}: ${cantidadActual} → ${nuevaCantidad}`);
    }

    // ✅ PASO 3: GUARDAR el mapa actualizado
    await setDoc(
      inventarioRef,
      {
        productos: productosActualizados,
        updatedAt: ahora.toISOString(),
      },
      { merge: true }
    );

    console.log('📦 Inventario actualizado en Firestore');

    // ✅ PASO 4: Registrar cada venta en salidas/
    const salidaRef = collection(
      db,
      'cuentas',
      cuentaId.toString(),
      'salidas'
    );

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
        escanerId: escanerActual?.evento || null,
        escanerFecha: escanerActual?.fechaFormato || null,
        escanerMonto: escanerActual?.monto || null,
        escanerInvitados: escanerActual?.invitados || null,
      };

      await addDoc(salidaRef, ventaDoc);
      console.log(`📝 Venta ${item.nombre} registrada`);
    }

    if (escanerActual) {
  const escanerActualizado = {
    ...escanerActual,
    cantidad: (escanerActual.cantidad || 0) + carrito.length,
    ventaTotal: (escanerActual.ventaTotal || 0) + totales.total,
  };

  await AsyncStorage.setItem('escanerActual', JSON.stringify(escanerActualizado));
  setEscanerActual(escanerActualizado);
  
  console.log('✅ Escáner actualizado:', escanerActualizado);
}

    // ✅ ÉXITO
    if (isMountedRef.current) {
      console.log('✅ TODAS LAS VENTAS REGISTRADAS');
      Alert.alert(
        '✅ Venta registrada',
        `Total: $${totales.total.toFixed(2)}\nTipo de pago: ${tipoPago.toUpperCase()}\nCliente: ${cliente || 'Sin cliente'}`,
        [
          {
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
          },
        ]
      );
    }
  } catch (error) {
    if (isMountedRef.current) {
      console.error('❌ ERROR:', error);
      console.error('📋 Detalles:', error.message);
      Alert.alert('Error', 'Error al registrar venta: ' + error.message);
      setLoading(false);
    }
  }
};

  const totales = calcularTotales();

  const renderProductoGrid = ({ item }) => (
    <TouchableOpacity
      style={styles.productoGridCard}
      onPress={() => abrirModalProducto(item)}
      disabled={item.cantidad === 0}
      activeOpacity={item.cantidad === 0 ? 0.5 : 0.7}
    >
      <View style={styles.imagenPlaceholder}>
        {imagenes[item.codigo] ? (
          <Image
            source={imagenes[item.codigo]}
            style={{ width: 60, height: 60, resizeMode: 'contain' }}
          />
        ) : (
          <Text style={styles.imagenPlaceholderText}>📦</Text>
        )}
      </View>

      <Text style={[styles.productoNombre, { color: themeColors.text }]}>
        {item.nombre}
      </Text>
      <Text style={styles.productoPrecio}>${item.precioVenta}</Text>

      {item.cantidad === 0 ? (
        <Text style={styles.sinStock}>Ya no tienes</Text>
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
          ${item.precioVenta} × {item.cantidad} = $
          {(item.precioVenta * item.cantidad).toFixed(2)}
        </Text>
      </View>

      <View style={styles.carritoItemControles}>
        <TouchableOpacity
          onPress={() => actualizarCantidadCarrito(item.codigo, item.cantidad - 1)}
        >
          <Text style={styles.btnCantidad}>−</Text>
        </TouchableOpacity>

        <Text style={styles.cantidadCarrito}>{item.cantidad}</Text>

        <TouchableOpacity
          onPress={() => actualizarCantidadCarrito(item.codigo, item.cantidad + 1)}
        >
          <Text style={styles.btnCantidad}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => eliminarDelCarrito(item.codigo)}
          style={styles.btnEliminar}
        >
          <Text style={styles.btnEliminarText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loadingProducts) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <View style={styles.header}>
          <Text style={styles.title}>🛒 Venta</Text>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
          <Text style={styles.loaderText}>Cargando productos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {escanerActual && (
        <View style={styles.escanerIndicador}>
          <Text style={styles.escanerIndicadorText}>
            📌 Evento:{escanerActual.evento} | Total: ${escanerActual.ventaTotal || 0}
            </Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Venta</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Grid de productos */}
        <View style={styles.gridContainer}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            🛍️ Selecciona productos
          </Text>
          <FlatList
            data={allProducts}
            renderItem={renderProductoGrid}
            keyExtractor={(item) => item.codigo}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
          />
        </View>

        {/* Carrito */}
        <View style={styles.carritoContainer}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            🛒 Carrito ({carrito.length} items)
          </Text>

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

        {/* Cliente */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Cliente (opcional):</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del cliente"
            value={cliente}
            onChangeText={setCliente}
            editable={!loading}
          />
        </View>

        {/* Descuento */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Descuento (%):</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 10"
            value={descuentoPorcentaje}
            onChangeText={setDescuentoPorcentaje}
            keyboardType="decimal-pad"
            editable={!loading}
          />
        </View>

        {/* Totales */}
        {carrito.length > 0 && (
          <View style={styles.totalesBox}>
            <View style={styles.totalesRow}>
              <Text style={styles.totalesLabel}>Subtotal:</Text>
              <Text style={styles.totalesValue}>
                ${totales.subtotal.toFixed(2)}
              </Text>
            </View>

            {totales.descuento > 0 && (
              <View style={styles.totalesRow}>
                <Text style={styles.totalesLabel}>
                  Descuento ({totales.descuento}%):
                </Text>
                <Text style={styles.totalesValue}>
                  -${totales.montoDescuento.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.totalesRowFinal}>
              <Text style={styles.totalesLabelFinal}>TOTAL:</Text>
              <Text style={styles.totalesValueFinal}>
                ${totales.total.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Tipo de pago */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de pago:</Text>
          <View style={styles.pagoOptions}>
            <TouchableOpacity
              style={[
                styles.pagoOption,
                tipoPago === 'efectivo' && styles.pagoOptionActive,
              ]}
              onPress={() => setTipoPago('efectivo')}
            >
              <Text style={styles.pagoOptionText}>💵 Efectivo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pagoOption,
                tipoPago === 'stp' && styles.pagoOptionActive,
              ]}
              onPress={() => setTipoPago('stp')}
            >
              <Text style={styles.pagoOptionText}>💳 STP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pagoOption,
                tipoPago === 'ptp' && styles.pagoOptionActive,
              ]}
              onPress={() => setTipoPago('ptp')}
            >
              <Text style={styles.pagoOptionText}>🏦 CRD</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.botonesContainer}>
          <TouchableOpacity
            style={[styles.confirmBtn, loading && styles.disabledBtn]}
            onPress={registrarVenta}
            disabled={loading || carrito.length === 0}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.blanco} />
            ) : (
              <Text style={styles.confirmBtnText}>✅ Confirmar venta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setCarrito([]);
              setDescuentoPorcentaje('');
              setCliente('');
              setTipoPago('efectivo');
            }}
            disabled={loading}
          >
            <Text style={styles.cancelBtnText}>❌ Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal para seleccionar cantidad */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProductModal && (
              <>
                <Text style={styles.modalTitle}>
                  {selectedProductModal.nombre}
                </Text>

                <View style={styles.modalPrecioBox}>
                  <Text style={styles.modalPrecioLabel}>Precio unitario:</Text>
                  <Text style={styles.modalPrecioValue}>
                    ${selectedProductModal.precioVenta}
                  </Text>
                </View>

                <View style={styles.modalStockBox}>
                  <Text style={styles.modalStockLabel}>Stock disponible:</Text>
                  <Text style={styles.modalStockValue}>
                    {selectedProductModal.cantidad} unidades
                  </Text>
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Cantidad:</Text>
                  <View style={styles.cantidadInputGroup}>
                    <TouchableOpacity
                      onPress={() => {
                        const nueva = Math.max(1, parseInt(cantidadModal) - 1);
                        setCantidadModal(nueva.toString());
                      }}
                      style={styles.cantidadBtn}
                    >
                      <Text style={styles.cantidadBtnText}>−</Text>
                    </TouchableOpacity>

                    <TextInput
                      style={styles.cantidadInput}
                      value={cantidadModal}
                      onChangeText={setCantidadModal}
                      keyboardType="number-pad"
                    />

                    <TouchableOpacity
                      onPress={() => {
                        const nueva = parseInt(cantidadModal) + 1;
                        if (nueva <= selectedProductModal.cantidad) {
                          setCantidadModal(nueva.toString());
                        }
                      }}
                      style={styles.cantidadBtn}
                    >
                      <Text style={styles.cantidadBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalTotalBox}>
                  <Text style={styles.modalTotalLabel}>Total:</Text>
                  <Text style={styles.modalTotalValue}>
                    $
                    {(
                      selectedProductModal.precioVenta * parseInt(cantidadModal)
                    ).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.modalBotones}>
                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={agregarAlCarrito}
                  >
                    <Text style={styles.modalConfirmBtnText}>
                      ✅ Agregar al carrito
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  header: {
    backgroundColor: COLORS.turquesa,
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 65,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.blanco,
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
    color: COLORS.negro,
    marginBottom: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productoGridCard: {
    width: '30%',
    backgroundColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.morado,
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
    color: COLORS.negro,
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
    borderBottomColor: '#eee',
  },
  carritoItemInfo: {
    flex: 1,
  },
  carritoItemNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 4,
  },
  carritoItemPrecio: {
    fontSize: 12,
    color: '#666',
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
    color: COLORS.negro,
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
  pagoOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  pagoOption: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.blanco,
  },
  pagoOptionActive: {
    borderColor: COLORS.turquesa,
    backgroundColor: '#e0f7fa',
  },
  pagoOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.negro,
  },
  totalesBox: {
    backgroundColor: '#fafafa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.naranja,
  },
  totalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalesLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalesValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
  },
  totalesRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 40,
    borderTopWidth: 2,
    borderTopColor: COLORS.turquesa,
  },
  totalesLabelFinal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.negro,
  },
  totalesValueFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.naranja,
  },
  botonesContainer: {
    gap: 10,
    marginBottom: 30,
  },
  confirmBtn: {
    backgroundColor: COLORS.verde,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: COLORS.rojito,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.blanco,
    fontSize: 14,
    fontWeight: '600',
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
    gap: 10,
  },
  cantidadBtn: {
    backgroundColor: COLORS.turquesa,
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantidadBtnText: {
    fontSize: 24,
    color: COLORS.blanco,
    fontWeight: 'bold',
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
    textAlign: 'center',
  },
  modalTotalBox: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.naranja,
  },
  modalTotalLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.naranja,
  },
  modalBotones: {
    gap: 10,
  },
  modalConfirmBtn: {
    backgroundColor: COLORS.verde,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelBtn: {
    backgroundColor: COLORS.rojito,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: COLORS.negro,
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  escanerIndicador: {
    position: 'absolute',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 30,             
    backgroundColor: '#1a9ea1',
    zIndex: 10,
},
escanerIndicadorText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#fff',
},
});
