import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput, 
  ScrollView,
} from 'react-native';
import { imagenes } from '../productosData';
// 🚀 1. Quitamos getDocs/getDoc y metemos onSnapshot e increment
import { collection, doc, writeBatch, onSnapshot, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import SearchBar from '../components/SearchBar';
import { Ionicons } from '@expo/vector-icons';
import { getProductosActivos } from '../context/productCatalog';

import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES } from '../context/theme';

export default function EntradaScreen({ onNavigate, darkMode, themeColors }) {
  // =====================================================================
  // 1. ESTADOS Y CONTEXTO
  // =====================================================================
  const { user, userData, cuenta, cuentaId } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '', type: 'success' });

  const [pedido, setPedido] = useState([]); 
  const [modalResumenVisible, setModalResumenVisible] = useState(false);
  const [costoTotalCalculado, setCostoTotalCalculado] = useState(0); 
  const [costoTotalFinal, setCostoTotalFinal] = useState(''); 
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  const [ordenProveedor, setOrdenProveedor] = useState('');
  
  const isMountedRef = useRef(true);

  // =====================================================================
  // 2. EFECTOS Y MOTOR LOCAL-FIRST (0ms Latencia)
  // =====================================================================
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !cuenta || !cuentaId) return;

    if (isMountedRef.current) setLoading(true);

    const docRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');

    // 📡 onSnapshot lee el caché local al instante y dibuja en 0ms
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      const productosData = docSnap.data()?.productos || {};
      
      // 🧠 Cruzamos la memoria local (Nombres/Fotos) con las cantidades de Firebase
      const catalogoLocal = getProductosActivos(); 

      const productosCombinados = catalogoLocal.map((catalogo) => {
        const stockActual = productosData[catalogo.codigo]?.cantidad || 0;

        return {
          id: catalogo.id || catalogo.codigo,
          nombre: catalogo.nombre,
          codigo: catalogo.codigo,
          descripcion: catalogo.descripcion || '',
          precioCosto: catalogo.precioCostoStandard || 0,
          precioVenta: catalogo.precioVentaStandard || 0,
          cantidad: stockActual,
          categoria: catalogo.categoria || '',
          bonoInfluencer: false,
          timestamp: new Date()
        };
      });

      if (isMountedRef.current) {
        setProductos(productosCombinados);
        // ⚠️ Si el usuario no está buscando nada, actualizamos la lista filtrada también
        setProductosFiltrados(prev => prev.length === 0 ? productosCombinados : prev); 
        setLoading(false);
      }
    }, (error) => {
      console.log('✈️ Silenciador Offline (Entradas):', error.message);
      if (isMountedRef.current) setLoading(false);
    });

    return () => unsubscribe();
  }, [user, cuenta, cuentaId]);

  // =====================================================================
  // 3. FUNCIONES DE BÚSQUEDA
  // =====================================================================
  const handleSearch = useCallback((filtrados) => {
    setProductosFiltrados(filtrados);
  }, []);

  const productosParaSearch = useMemo(() => {
    return productos;
  }, [productos]);

  // =====================================================================
  // 4. FUNCIONES DE INTERFAZ (MODAL Y CARRITO)
  // =====================================================================
  const openModal = (producto) => {
    setSelectedProduct({ ...producto, bonoInfluencer: false });
    setCantidad(1);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedProduct(null);
  };

  const aumentarCantidad = () => setCantidad(prev => prev + 1);
  const disminuirCantidad = () => {
    if (cantidad > 1) setCantidad(prev => prev - 1);
  };

  const toggleBonoInfluencer = () => {
    setSelectedProduct(prev => ({ ...prev, bonoInfluencer: !prev.bonoInfluencer }));
  };

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToastConfig({ visible: true, message: mensaje, type: tipo });
  };

  const confirmarEntrada = () => {
    if (!selectedProduct || cantidad < 1) {
      mostrarToast('Cantidad inválida', 'error');
      return;
    }

    const esBono = !!selectedProduct.bonoInfluencer;
    
    // 🧠 REGLA DE NEGOCIO FINANCIERA
    const costoCalculado = esBono 
      ? (selectedProduct.precioVenta * 0.10) 
      : (selectedProduct.precioVenta * 0.50);

    const nuevoProductoPedido = {
      ...selectedProduct,
      cantidad: Number(cantidad),
      bonoInfluencer: esBono,
      costoUnitarioAplicado: costoCalculado, 
      idCarrito: `${selectedProduct.id}-${esBono ? 'bono' : 'regular'}` 
    };

    setPedido((prev) => {
      const index = prev.findIndex(p => p.idCarrito === nuevoProductoPedido.idCarrito);
      if (index >= 0) {
        const updated = [...prev];
        updated[index].cantidad += Number(cantidad);
        return updated;
      }
      return [...prev, nuevoProductoPedido];
    });

    closeModal();
    mostrarToast(`${selectedProduct.nombre}: +${cantidad} añadidos al pedido`, 'success');
  };

  const prepararResumenPedido = () => {
    let totalBase = 0;
    pedido.forEach(item => {
      totalBase += (item.costoUnitarioAplicado * item.cantidad);
    });
    
    setCostoTotalCalculado(totalBase);
    setCostoTotalFinal(totalBase.toString()); 
    setPorcentajeDescuento(0);
    setModalResumenVisible(true);
  };

  const handleCostoFinalChange = (text) => {
    setCostoTotalFinal(text);

    if (text === '') {
      setPorcentajeDescuento(0);
      return;
    }

    const pagadoReal = parseFloat(text);

    if (!isNaN(pagadoReal) && costoTotalCalculado > 0 && pagadoReal < costoTotalCalculado) {
      const porcentaje = ((costoTotalCalculado - pagadoReal) / costoTotalCalculado) * 100;
      setPorcentajeDescuento(Math.round(porcentaje));
    } else {
      setPorcentajeDescuento(0);
    }
  };

  // =====================================================================
  // 5. TRANSACCIÓN BASE DE DATOS (100% OFFLINE-FIRST)
  // =====================================================================
  const registrarEntradaInventario = async () => {
    if (pedido.length === 0) return;
    setLoading(true);

    try {
      const ahora = new Date();
      const timestampCompleto = ahora.toISOString();
      const folioUnico = ordenProveedor.trim() ? `OC-${ordenProveedor.trim()}` : `ENT-${ahora.getTime()}`;

      // 🚀 1. Abrimos el "Buzón" de Firebase (Soporta Offline nativo)
      const batch = writeBatch(db);

      // 📦 2. Preparamos la actualización del inventario SIN LEERLO (Usamos increment)
      const inventarioRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');
      const inventarioUpdates = { updatedAt: timestampCompleto };

      let pedidoLimpio = [];

      pedido.forEach(item => {
        // 🔥 MAGIA MATEMÁTICA: increment() suma sin importar cuánto había antes. Cero internet requerido.
        inventarioUpdates[`productos.${item.codigo}.cantidad`] = increment(item.cantidad);
        inventarioUpdates[`productos.${item.codigo}.codigo`] = item.codigo;
        inventarioUpdates[`productos.${item.codigo}.nombre`] = item.nombre;
        inventarioUpdates[`productos.${item.codigo}.updatedAt`] = timestampCompleto;

        // Limpiar datos para el ticket histórico
        pedidoLimpio.push({
          id: item.codigo,
          codigo: item.codigo,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: Number(item.precioCosto || 0),
          subtotal: Number(item.precioCosto || 0) * item.cantidad
        });
      });

      // 🧾 3. Crear el Ticket de Entrada (Analytics)
      const ordenEntrada = {
        folio: folioUnico,
        ordenProveedor: ordenProveedor.trim() || 'Manual/Sin ID',
        fecha: timestampCompleto.split('T')[0],
        timestamp: timestampCompleto,
        tipo: 'restock',
        productos: pedidoLimpio,
        costoTotal: Number(costoTotalFinal || 0),
        ahorroMonetario: Number((costoTotalCalculado || 0) - (Number(costoTotalFinal) || 0)),
        descuentoAplicado: Number(porcentajeDescuento || 0),
        creadoPorUid: user.uid,
        creadoPorNombre: userData?.nombre || user.email
      };

      const entradaRef = doc(db, 'cuentas', cuentaId.toString(), 'entradas', folioUnico);

      // 📦 4. Asignar tareas al Batch
      batch.set(entradaRef, ordenEntrada);
      batch.update(inventarioRef, inventarioUpdates);

      // 🚀 5. Ejecutar. Si no hay internet, se guarda en el teléfono y responde "Éxito" instantáneamente.
      await batch.commit();

      // 🧹 Limpieza de UI (No llamamos cargarProductos porque onSnapshot lo actualiza solo)
      setPedido([]);
      setOrdenProveedor(''); 
      setCostoTotalFinal('');
      setPorcentajeDescuento(0);
      setModalResumenVisible(false); // 🔥 FIX: Cerrar modal correcto

      Alert.alert('✅ ¡Guardado!', 'El inventario se ha actualizado correctamente.');

    } catch (error) {
      console.error('❌ Error guardando restock:', error);
      Alert.alert('Error', 'No se pudo guardar la entrada: ' + error.message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  // =====================================================================
  // 6. RENDERIZADO
  // =====================================================================
  const renderProducto = ({ item }) => {
    const imagen = imagenes[item.codigo] || null;

    return (
      <TouchableOpacity
        style={[styles.productCard, { borderColor: COLORS.morado }]}
        onPress={() => openModal(item)}
        activeOpacity={0.7}
      >
        {imagen ? (
          <Image source={imagen} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.productImagePlaceholderText}>📦</Text>
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: themeColors.text }]} numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text style={styles.productStock}>
            Stock: {item.cantidad}
          </Text>
        </View>

        <View style={styles.addBtn}>
          <Text style={styles.addBtnText}>➕</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && productos.length === 0) {
    return (
      <View style={[GLOBAL_STYLES.safeArea, { backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.turquesa} />
      </View>
    );
  }

  return (
    <View style={[GLOBAL_STYLES.safeArea, { backgroundColor: themeColors.bg, flex: 1 }]}>
      <Toast 
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        duration={1500}
        onHide={() => setToastConfig({ visible: false })}
      />
      
      {/* HEADER */}
      <ScreenHeader 
        title="Agregar Inventario" 
        onPress={() => onNavigate('home')} 
        themeColors={themeColors} 
        rightAction={
          pedido.length > 0 ? (
            <TouchableOpacity 
              onPress={prepararResumenPedido} 
              style={styles.cartIconWrapper}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="cart-outline" size={28} color={themeColors.text} />
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {pedido.reduce((acc, curr) => acc + curr.cantidad, 0)}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 35 }} /> 
          )
        }
      />

      <SearchBar 
        data={productosParaSearch} 
        onSearch={handleSearch}
        searchKeys={['nombre', 'codigo']}
      />      

      <FlatList
        data={productosFiltrados.length > 0 ? productosFiltrados : productos}
        renderItem={renderProducto}
        keyExtractor={(item) => item.codigo}
        numColumns={3}
        columnWrapperStyle={styles.row}
        scrollEnabled={true}
        contentContainerStyle={styles.gridContent}
      />

      {/* MODAL DE SELECCIÓN DE PRODUCTO */}
      <Modal visible={modalVisible} transparent={true} animationType="none" onRequestClose={closeModal}>
        <Pressable style={GLOBAL_STYLES.modalOverlay} onPress={closeModal}>
          <Pressable style={[GLOBAL_STYLES.modalContent, styles.modalContentNoPadding, { backgroundColor: themeColors.bg }]} onPress={(e) => e.stopPropagation()}>
            {selectedProduct && (
              <>
                <View style={styles.modalImageContainer}>
                  {imagenes[selectedProduct.codigo] ? (
                    <Image source={imagenes[selectedProduct.codigo]} style={styles.modalImage} />
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <Text style={styles.modalImagePlaceholderText}>📦</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalInnerBody}>
                  
                  <View style={styles.modalHeaderColumns}>
                    <View style={styles.modalLeftColumn}>
                      <Text style={[GLOBAL_STYLES.modalTitle, styles.modalProductNameText, { color: themeColors.text }]} numberOfLines={2}>
                        {selectedProduct.nombre}
                      </Text>
                      <Text style={styles.modalProductStock}>
                        Stock actual: {selectedProduct.cantidad} unidades
                      </Text>
                    </View>

                    <View style={styles.modalRightColumn}>
                      <TouchableOpacity 
                        style={styles.bonoCheckboxBtn}
                        onPress={toggleBonoInfluencer}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={selectedProduct.bonoInfluencer ? "checkmark-circle" : "ellipse-outline"} 
                          size={30} 
                          color={selectedProduct.bonoInfluencer ? COLORS.morado : '#A0AEC0'} 
                        />
                      </TouchableOpacity>
                      <Text style={[styles.bonoLabelText, selectedProduct.bonoInfluencer && styles.bonoLabelTextActive]}>
                        Bono Influencer
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cantidadSection, { backgroundColor: darkMode ? '#333' : COLORS.gris }]}>
                    <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text }]}>Cantidad a agregar:</Text>

                    <View style={styles.cantidadControls}>
                      <TouchableOpacity style={styles.cantidadBtn} onPress={disminuirCantidad}>
                        <Text style={styles.cantidadBtnText}>−</Text>
                      </TouchableOpacity>

                      <View style={styles.cantidadDisplay}>
                        <Text style={styles.cantidadValue}>{cantidad}</Text>
                      </View>

                      <TouchableOpacity style={styles.cantidadBtn} onPress={aumentarCantidad}>
                        <Text style={styles.cantidadBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={GLOBAL_STYLES.modalButtons}>
                    <TouchableOpacity style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]} onPress={closeModal}>
                      <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf]} onPress={confirmarEntrada}>
                      <Text style={GLOBAL_STYLES.btnText}>✅ Aceptar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL DE RESUMEN FINANCIERO */}
      <Modal visible={modalResumenVisible} animationType="slide" transparent={true} onRequestClose={() => setModalResumenVisible(false)}>
        <Pressable style={GLOBAL_STYLES.modalOverlay} onPress={() => setModalResumenVisible(false)}>
          <Pressable style={[GLOBAL_STYLES.modalContent, styles.modalResumenWidth, { backgroundColor: themeColors.bg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[GLOBAL_STYLES.modalTitle, styles.modalResumenTitle, { color: themeColors.text }]}>
              Resumen de Restock
            </Text>
            
            <View style={[styles.resumenListContainer, { backgroundColor: darkMode ? '#2A2A2A' : '#F8F9FA' }]}>
              <ScrollView 
                nestedScrollEnabled={true} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.resumenScrollContent}
              >
                {pedido.map((item, idx) => {
                  const costoUnitario = Number(item.costoUnitarioAplicado) || 0;
                  const cantidadNum = Number(item.cantidad) || 0;

                  return (
                    <View 
                      key={idx} 
                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resumenItemText, { color: themeColors.text }]}>
                          {cantidadNum}x {item.nombre} {item.bonoInfluencer ? '⭐' : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                        <Text style={{ fontSize: 12, color: darkMode ? '#AAA' : '#666' }}>
                          ${costoUnitario.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: themeColors.text, marginBottom: 5 }}>
                ID de Pedido (Opcional):
              </Text>
              <TextInput
                style={[GLOBAL_STYLES.inputBase, { backgroundColor: darkMode ? '#333' : '#FFF', color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="Ej: MK-987654321"
                value={ordenProveedor}
                onChangeText={setOrdenProveedor}
                placeholderTextColor={themeColors.textSecondary}
              />
            </View>

            <View style={[styles.resumenFinancieroBox, { backgroundColor: darkMode ? '#333' : COLORS.gris }]}>
              <Text style={[styles.resumenTextoBase, { color: themeColors.text }]}>
                Total sin descuentos: ${costoTotalCalculado.toFixed(2)}
              </Text>
              
              <Text style={[styles.resumenTextoTitulo, { color: themeColors.text }]}>
                Total pagado:
              </Text>
              <Text style={styles.resumenTextoSub}>
                (Descuentos adicionales, bono, etc...)
              </Text>
              
              <TextInput
                style={[GLOBAL_STYLES.inputBase, styles.resumenInput, { backgroundColor: darkMode ? '#222' : '#FFF', color: themeColors.text }]}
                keyboardType="numeric"
                value={costoTotalFinal}
                onChangeText={handleCostoFinalChange}
                selectTextOnFocus={true}
                placeholderTextColor="gray"
              />

              {parseFloat(porcentajeDescuento) > 0 && (
                <View style={styles.resumenDescuentoBox}>
                  <Text style={styles.resumenDescuentoPorcentaje}>
                    Descuento Aplicado: {porcentajeDescuento}%
                  </Text>
                  <Text style={styles.resumenDescuentoMonto}>
                    Margen adicional: ${(costoTotalCalculado - parseFloat(costoTotalFinal)).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            <View style={GLOBAL_STYLES.modalButtons}>
              <TouchableOpacity style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]} onPress={() => setModalResumenVisible(false)}>
                <Text style={GLOBAL_STYLES.btnText}>Volver</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, loading && GLOBAL_STYLES.disabledBtn]} onPress={registrarEntradaInventario} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={GLOBAL_STYLES.btnText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gridContent: {
    padding: SPACING.content_padding,
    paddingBottom: 30,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: '30%',
    backgroundColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  productImage: {
    width: '100%',
    height: 90,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 90,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImagePlaceholderText: {
    fontSize: 32,
  },
  productInfo: {
    padding: 8,
    alignItems: 'center',
    width: '100%',
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 3,
  },
  productStock: {
    fontSize: 10,
    color: '#999',
  },
  addBtn: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.verde,
    width: 25,
    height: 25,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 16,
  },
  modalContentNoPadding: {
    padding: 0,
    overflow: 'hidden',
  },
  modalImageContainer: {
    width: '100%',
    height: 220,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.gris,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImagePlaceholderText: {
    fontSize: 80,
  },
  modalInnerBody: {
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 20,
  },
  modalHeaderColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalLeftColumn: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
  },
  modalRightColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  modalProductNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 5,
    textAlign: 'left',
    paddingVertical: 0,
    marginVertical: 0,
  },
  modalProductStock: {
    fontSize: 13,
    color: COLORS.turquesa,
    fontWeight: '600',
    textAlign: 'left',
  },
  bonoCheckboxBtn: {
    padding: 4, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  bonoLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
  },
  bonoLabelTextActive: {
    color: COLORS.morado,
    fontWeight: 'bold',
  },
  cantidadSection: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  cantidadControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  cantidadBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.turquesa,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantidadBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  cantidadDisplay: {
    width: 80,
    height: 50,
    backgroundColor: COLORS.blanco,
    borderWidth: 2,
    borderColor: COLORS.turquesa,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantidadValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.turquesa,
  },
  modalResumenWidth: {
    width: '90%',
  },
  modalResumenTitle: {
    marginBottom: 15,
  },
  resumenListContainer: {
    height: 160, 
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  resumenScrollContent: {
    padding: 12,
    flexGrow: 1,
  },
  resumenItemText: {
    fontSize: 14, 
    marginVertical: 4,
  },
  resumenFinancieroBox: {
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20,
  },
  resumenTextoBase: {
    fontSize: 14,
  },
  resumenTextoTitulo: {
    fontWeight: 'bold', 
    fontSize: 16,
    marginTop: 15,
  },
  resumenTextoSub: {
    color: 'gray', 
    fontSize: 12, 
    marginBottom: 8, 
    marginTop: 2,
  },
  resumenInput: {
    textAlign: 'left',
  },
  resumenDescuentoBox: {
    marginTop: 12, 
    padding: 10, 
    backgroundColor: 'rgba(76, 175, 80, 0.15)', 
    borderRadius: 8,
  },
  resumenDescuentoPorcentaje: {
    color: COLORS.negro, 
    fontWeight: 'bold', 
    fontSize: 14,
  },
  resumenDescuentoMonto: {
    color: COLORS.negro, 
    fontSize: 13, 
    marginTop: 2,
  },
  cartIconWrapper: {
    padding: 4,
    position: 'relative', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.morado,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});