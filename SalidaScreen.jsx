import { imagenes } from './productosData';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
  ScrollView,
  FlatList,
  Modal,
  Image,
} from 'react-native';

const COLORS = {
  turquesa: '#1a9ea1',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
  naranja: '#FF9800',
  morado: '#9C27B0',
};

export default function SalidaScreen() {
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

  // Cargar productos
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/salida'
      );
      const data = await response.json();

      if (data.exito && data.productos) {
        const productosValidos = data.productos.filter(
          (p) => p && p.nombre && p.codigo
        );
        setAllProducts(productosValidos);
      } else {
        Alert.alert('Error', 'No hay productos disponibles');
      }
    } catch (error) {
      Alert.alert('Error', 'No te encontre los productos: ' + error.message);
      console.error('Error:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Abrir modal para agregar producto
  const abrirModalProducto = (producto) => {
    setSelectedProductModal(producto);
    setCantidadModal('1');
    setModalVisible(true);
  };

  // Agregar producto al carrito
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
      // Actualizar cantidad
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
      // Agregar nuevo item
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

  // Eliminar del carrito
  const eliminarDelCarrito = (codigo) => {
    setCarrito(carrito.filter((item) => item.codigo !== codigo));
  };

  // Actualizar cantidad en carrito
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

  // Calcular totales
  const calcularTotales = () => {
    const subtotal = carrito.reduce(
      (sum, item) => sum + item.precioVenta * item.cantidad,
      0
    );
    const descuento =
      parseFloat(descuentoPorcentaje) || 0;
    const montoDescuento = (subtotal * descuento) / 100;
    const total = subtotal - montoDescuento;

    return {
      subtotal,
      descuento,
      montoDescuento,
      total,
    };
  };

  // Registrar venta
  const registrarVenta = async () => {
  if (carrito.length === 0) {
    Alert.alert('Error', 'El carrito está vacío');
    return;
  }

  setLoading(true);

  try {
    const totales = calcularTotales();

    console.log('=== INICIANDO REGISTRO DE VENTAS ===');
    console.log('Total items en carrito:', carrito.length);
    console.log('Cliente:', cliente);
    console.log('Descuento:', descuentoPorcentaje);

    // Registrar cada item del carrito
    for (let i = 0; i < carrito.length; i++) {
      const item = carrito[i];

      const payload = {
        codigo: item.codigo,
        producto: item.nombre,
        cantidad: item.cantidad,
        descuento: descuentoPorcentaje || 0,
        cliente: cliente || 'Sin cliente',
      };

      console.log(`\n--- Item ${i + 1}/${carrito.length} ---`);
      console.log('Enviando:', JSON.stringify(payload, null, 2));

      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/salida',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parseando JSON:', e);
        Alert.alert('Error', `Error en respuesta del servidor: ${responseText}`);
        setLoading(false);
        return;
      }

      console.log('Response data:', data);

      if (!data.exito) {
        Alert.alert('Error', `Error registrando ${item.nombre}: ${data.mensaje}`);
        setLoading(false);
        return;
      }

      console.log(`✅ Item ${i + 1} registrado`);
    }

    // Éxito
    console.log('\n=== TODAS LAS VENTAS REGISTRADAS ===');
    Alert.alert(
      '✅ Venta registrada',
      `Total: $${totales.total.toFixed(2)}\nTipo de pago: ${tipoPago.toUpperCase()}\nCliente: ${cliente || 'Sin cliente'}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setCarrito([]);
            setDescuentoPorcentaje('');
            setCliente('');
            setTipoPago('efectivo');
            cargarProductos();
          },
        },
      ]
    );
  } catch (error) {
    console.error('ERROR FATAL:', error);
    Alert.alert('Error', 'Error al registrar: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const totales = calcularTotales();

  // Renderizar producto en grid
  const renderProductoGrid = ({ item }) => (
    <TouchableOpacity
      style={styles.productoGridCard}
      onPress={() => abrirModalProducto(item)}
      disabled={item.cantidad === 0}
      activeOpacity={item.cantidad === 0 ? 0.5 : 0.7}
    >
      {/* Imagen placeholder */}
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

      <Text style={styles.productoNombre}>{item.nombre}</Text>
      <Text style={styles.productoPrecio}>${item.precioVenta}</Text>

      {item.cantidad === 0 ? (
        <Text style={styles.sinStock}>Sin stock</Text>
      ) : (
        <Text style={styles.stock}>Stock: {item.cantidad}</Text>
      )}
    </TouchableOpacity>
  );

  // Renderizar item del carrito
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>🛒 Venta / Checkout</Text>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
          <Text style={styles.loaderText}>Cargando productos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Venta / Checkout</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Grid de productos */}
        <View style={styles.gridContainer}>
          <Text style={styles.sectionTitle}>📦 Productos disponibles:</Text>
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
          <Text style={styles.sectionTitle}>
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
              <Text style={styles.pagoOptionText}>🏦 PTP</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  header: {
    backgroundColor: COLORS.turquesa,
    paddingVertical: 20,
    paddingHorizontal: 20,
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
    width: '31%',
    backgroundColor: COLORS.blanco,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  imagenPlaceholder: {
    width: '100%',
    height: 80,
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
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.negro,
    textAlign: 'center',
    marginBottom: 4,
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
    backgroundColor: COLORS.blanco,
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
    backgroundColor: COLORS.morado,
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
  // Modal styles
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
    backgroundColor: '#e0e0e0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: COLORS.negro,
    fontSize: 14,
    fontWeight: '600',
  },
});