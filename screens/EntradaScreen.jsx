import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput, 
  ScrollView,
  Keyboard,
  KeyboardAvoidingView, 
  Platform,
  Pressable
} from 'react-native';
import { imagenes } from '../productosData';
import { collection, doc, writeBatch, onSnapshot, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { InventarioContext } from '../context/InventarioContext';
import Toast from '../components/Toast';
import SearchBar from '../components/SearchBar';
import { Ionicons, AwesomeFont6 } from '@expo/vector-icons';
import { getProductosActivos } from '../context/productCatalog';
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES, GradientDivider } from '../context/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function EntradaScreen({ onNavigate, darkMode, themeColors }) {
  // =====================================================================
  // 1. ESTADOS Y CONTEXTO
  // =====================================================================
  const { user, userData, cuenta, cuentaId } = useContext(AuthContext);
  const [allProducts, setAllProducts] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false); 
  
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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // =====================================================================
  // 2. CONSUMO DE INVENTARIO CENTRALIZADO 
  // =====================================================================
  const { inventarioGlobal, loadingInventario } = useContext(InventarioContext);

  useEffect(() => {
    if (inventarioGlobal && inventarioGlobal.length > 0) {
      setAllProducts(inventarioGlobal); 
      setProductosFiltrados(inventarioGlobal);
      setLoadingProducts(false); 
    }
  }, [inventarioGlobal]);

  // =====================================================================
  // 3. FUNCIONES DE BÚSQUEDA Y CARRITO
  // =====================================================================
  const handleSearch = useCallback((filtrados) => setProductosFiltrados(filtrados), []);
  const productosParaSearch = useMemo(() => { return allProducts; }, [allProducts]);

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
  const disminuirCantidad = () => { if (cantidad > 1) setCantidad(prev => prev - 1); };
  const toggleBonoInfluencer = () => setSelectedProduct(prev => ({ ...prev, bonoInfluencer: !prev.bonoInfluencer }));

  const mostrarToast = (mensaje, tipo = 'success') => setToastConfig({ visible: true, message: mensaje, type: tipo });

  const confirmarEntrada = () => {
    if (!selectedProduct || cantidad < 1) {
      mostrarToast('Cantidad inválida', 'error');
      return;
    }

      // 🧠 REGLA DE NEGOCIO FINANCIERA
    const esBono = !!selectedProduct.bonoInfluencer;
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
    pedido.forEach(item => { totalBase += (item.costoUnitarioAplicado * item.cantidad); });
    
    setCostoTotalCalculado(totalBase);
    setCostoTotalFinal(totalBase.toString()); 
    setPorcentajeDescuento(0);
    setModalResumenVisible(true);
  };

  const handleCostoFinalChange = (text) => {
    setCostoTotalFinal(text);
    if (text === '') return setPorcentajeDescuento(0);
    const pagadoReal = parseFloat(text);

    if (!isNaN(pagadoReal) && costoTotalCalculado > 0 && pagadoReal < costoTotalCalculado) {
      const porcentaje = ((costoTotalCalculado - pagadoReal) / costoTotalCalculado) * 100;
      setPorcentajeDescuento(Math.round(porcentaje));
    } else {
      setPorcentajeDescuento(0);
    }
  };

  // =====================================================================
  // 4. TRANSACCIÓN BASE DE DATOS (DOT NOTATION + ESQUEMA EXACTO)
  // =====================================================================
  const registrarEntradaInventario = async () => {
    if (pedido.length === 0) return;
    setLoading(true);

    try {
      const ahora = new Date();
      const timestampCompleto = ahora.toISOString();
      const folioLimpio = ordenProveedor.trim().replace(/[^a-zA-Z0-9-]/g, '');
      const folioUnico = folioLimpio ? `OC-${folioLimpio}` : `ENT-${ahora.getTime()}`;

      const batch = writeBatch(db);
      
      const inventarioRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');
      const entradaRef = doc(db, 'cuentas', cuentaId.toString(), 'entradas', folioUnico);
      const analyticsRef = doc(db, 'cuentas', cuentaId.toString(), 'analytics', folioUnico);

      // 1. Reconstruir el pedido
      const pedidoLimpio = pedido.map(item => ({
        ...item,
        bonoInfluencer: !!item.bonoInfluencer
      }));

      // 2. ESQUEMA 100% IDÉNTICO
      const ordenEntrada = {
        folio: folioUnico,
        fecha: timestampCompleto, 
        timestamp: timestampCompleto, 
        productos: pedidoLimpio,
        costoBase: Number(costoTotalCalculado) || 0,
        costoPagado: parseFloat(costoTotalFinal) || Number(costoTotalCalculado) || 0,
        descuentoAplicado: parseFloat(porcentajeDescuento) || 0,
        ahorroMonetario: Number(costoTotalCalculado) - (parseFloat(costoTotalFinal) || Number(costoTotalCalculado)) || 0,
        creadoPorUid: user?.uid || 'sistema',
        creadoPorNombre: userData?.nombre || user?.email || 'Usuario',
        registradoPor: user?.uid || 'sistema' 
      };

      batch.set(entradaRef, ordenEntrada);
      batch.set(analyticsRef, { tipoMovimiento: 'ENTRADA_RESTOCK', ...ordenEntrada });
      
      // 3. LA LLAVE MAESTRA: DOT NOTATION EN BATCH.UPDATE
      const inventarioUpdates = {
        updatedAt: timestampCompleto
      };

      pedido.forEach(item => {
        const key = item.id || item.codigo;
        inventarioUpdates[`productos.${key}.cantidad`] = increment(Number(item.cantidad) || 1);
        inventarioUpdates[`productos.${key}.codigo`] = item.codigo || 'SIN_CODIGO';
        inventarioUpdates[`productos.${key}.nombre`] = item.nombre || 'Producto Desconocido';
        inventarioUpdates[`productos.${key}.updatedAt`] = timestampCompleto;
      });

      batch.update(inventarioRef, inventarioUpdates);

      // 🔥 FIX OFFLINE: Liberamos la UI inmediatamente para que el usuario no sienta lag
      setPedido([]);
      setOrdenProveedor(''); 
      setCostoTotalFinal('');
      setPorcentajeDescuento(0);
      setModalResumenVisible(false);
      mostrarToast('Restock registrado correctamente', 'success');
      if (isMountedRef.current) setLoading(false);

      // Ejecutamos BATCH sin await bloqueante. Firebase lo guardará en caché y lo subirá cuando haya internet.
      batch.commit().catch(err => console.log('Sincronización en segundo plano:', err));

    } catch (error) {
      console.error('❌ Error guardando restock:', error);
      Alert.alert('Error', 'Fallo al procesar. Detalles: ' + error.message);
      if (isMountedRef.current) setLoading(false);
    }
  };

  // =====================================================================
  // 5. RENDERIZADO (Adaptado al Tema Minimalista)
  // =====================================================================
  const renderProducto = ({ item }) => {
    const imagen = imagenes[item.codigo] || null;

    return (
      <TouchableOpacity
        style={[
          GLOBAL_STYLES.cardStandard, 
          { 
            backgroundColor: themeColors.bgSecondary, 
            borderColor: themeColors.border, 
            width: '30%', 
            flexDirection: 'column', 
            alignItems: 'center',
            padding: 10, 
            marginBottom: 0 
          }
        ]}
        onPress={() => openModal(item)}
        activeOpacity={0.7}
      >
        {imagen ? (
          <Image source={imagen} style={styles.productImage} />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: themeColors.input }]}>
            <Text style={styles.productImagePlaceholderText}><FontAwesome6 name="box" size={20} color="black" /></Text>
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: themeColors.text }]} numberOfLines={2}>
            {item.nombre}
          </Text>
          <Text style={[styles.productStock, { color: themeColors.textSecondary }]}>
            Stock: {item.cantidad}
          </Text>
        </View>

        {/* 🔘 Ícono Flotante de Ionicons */}
        <View style={[styles.addBtnContainer, { backgroundColor: themeColors.bgSecondary }]}>
          <Ionicons name="add-circle" size={30} color={COLORS.turquesa} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      <Toast 
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        duration={1500}
        onHide={() => setToastConfig({ visible: false })}
      />
      
      <ScreenHeader 
        title="Agregar Inventario" 
        onPress={() => onNavigate('home')} 
        themeColors={themeColors} 
        rightAction={
          pedido.length > 0 ? (
            <TouchableOpacity onPress={prepararResumenPedido} style={styles.cartIconWrapper} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
      {/* RENDERIZADO CONDICIONAL INTERNO */}
      {(loadingProducts && allProducts.length === 0) ? (
        
        <View style={GLOBAL_STYLES.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
        </View>

      ) : (

        <>
          <SearchBar 
            data={productosParaSearch} 
            onSearch={handleSearch}
            searchKeys={['nombre', 'codigo']}
          />      
          <FlatList
            data={productosFiltrados.length > 0 ? productosFiltrados : allProducts}
            renderItem={renderProducto}
            keyExtractor={(item) => item.codigo}
            numColumns={3}
            columnWrapperStyle={styles.row}
            scrollEnabled={true}
            contentContainerStyle={styles.gridContent}
          />
        </>
        
      )}
      
      {/* MODAL DE SELECCIÓN DE PRODUCTO */}
      <Modal visible={modalVisible} transparent={true} animationType="none" onRequestClose={closeModal}>
        <TouchableOpacity style={GLOBAL_STYLES.modalOverlay} activeOpacity={1} onPress={closeModal}>
          <TouchableOpacity activeOpacity={1} style={[GLOBAL_STYLES.modalContent, { backgroundColor: themeColors.bg }]} onPress={Keyboard.dismiss}>
            {selectedProduct && (
              <>
                <View style={styles.modalImageContainer}>
                  {imagenes[selectedProduct.codigo] ? (
                    <Image source={imagenes[selectedProduct.codigo]} style={styles.modalImage} />
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <Text style={styles.modalImagePlaceholderText}><FontAwesome6 name="box" size={18} color="black" /></Text>
                    </View>
                  )}
                </View>
                  
                <View style={styles.modalInnerBody}>
                  
                  {/* 1. FILA SUPERIOR: TÍTULO Y BONO */}
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
                      <TouchableOpacity style={styles.bonoCheckboxBtn} onPress={toggleBonoInfluencer} activeOpacity={0.7}>
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

                  {/* 2. LÍNEA DIVISORIA (Ahora tiene el mismo margen real arriba y abajo) */}
                  <GradientDivider marginVertical={22} />

                  {/* 3. SECCIÓN DE CANTIDADES */}
                  <View style={[styles.cantidadSection, { backgroundColor: darkMode ? '#333' : COLORS.gris }]}>
                    
                    {/* 👇 AQUÍ ESTÁ EL TEXTO CENTRADO Y EN MAYÚSCULAS 👇 */}
                    <Text style={[GLOBAL_STYLES.modalLabel, styles.cantidadLabel, { color: themeColors.text }]}>
                      CANTIDAD A AGREGAR
                    </Text>
                    
                    <View style={styles.cantidadControls}>
                      <TouchableOpacity style={styles.cantidadBtn} onPress={disminuirCantidad}>
                        <Ionicons name="remove" size={28} color={COLORS.blanco} />
                      </TouchableOpacity>
                      
                      <View style={styles.cantidadDisplay}>
                        <Text style={styles.cantidadValue}>{cantidad}</Text>
                      </View>
                      
                      <TouchableOpacity style={styles.cantidadBtn} onPress={aumentarCantidad}>
                        <Ionicons name="add" size={28} color={COLORS.blanco} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 4. BOTONES DE ACCIÓN */}
                  <View style={GLOBAL_STYLES.modalButtons}>
                    <TouchableOpacity style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]} onPress={closeModal}>
                      <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf]} onPress={confirmarEntrada}>
                      <Text style={GLOBAL_STYLES.btnText}>Aceptar</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DE RESUMEN FINANCIERO */}
      <Modal visible={modalResumenVisible} animationType="slide" transparent={true} onRequestClose={() => setModalResumenVisible(false)}>
  
      {/* 1. KeyboardAvoidingView empuja la pantalla en iOS/Android */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        
        {/* 2. Fondo oscuro: Cierra el teclado Y el modal */}
        <Pressable 
          style={GLOBAL_STYLES.modalOverlay} 
          onPress={() => {
            Keyboard.dismiss();
            setModalResumenVisible(false);
          }}
        >
          
          {/* 3. Tarjeta Blanca: Oculta el teclado si tocan una parte en blanco sin cerrar el modal */}
          <Pressable 
            style={[GLOBAL_STYLES.modalContent, styles.modalResumenWidth, { backgroundColor: themeColors.bg }]} 
            onPress={() => Keyboard.dismiss()}
          >
            
            <Text style={[GLOBAL_STYLES.modalTitle, styles.modalResumenTitle, { color: themeColors.text }]}>
              Resumen de Restock
            </Text>
            
            <View style={[styles.resumenListContainer, { backgroundColor: darkMode ? '#2A2A2A' : '#F8F9FA' }]}>
              <ScrollView 
                nestedScrollEnabled={true} 
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled" 
                contentContainerStyle={styles.resumenScrollContent}
              >
                {pedido.map((item, idx) => {
                  const costoUnitario = Number(item.costoUnitarioAplicado) || 0;
                  const cantidadNum = Number(item.cantidad) || 0;

                  return (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
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
              <Text style={[styles.resumenTextoBase, { color: themeColors.text }]}>Total sin descuentos: ${costoTotalCalculado.toFixed(2)}</Text>
              <Text style={[styles.resumenTextoTitulo, { color: themeColors.text }]}>Total pagado:</Text>
              <Text style={styles.resumenTextoSub}>(Bono de lealtad, descuentos adicionales, etc...)</Text>
              
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
                  <Text style={styles.resumenDescuentoPorcentaje}>Descuento Aplicado: {porcentajeDescuento}%</Text>
                  <Text style={styles.resumenDescuentoMonto}>Margen adicional: ${(costoTotalCalculado - parseFloat(costoTotalFinal)).toFixed(2)}</Text>
                </View>
              )}
            </View>

            <View style={GLOBAL_STYLES.modalButtons}>
              <TouchableOpacity style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]} onPress={() => setModalResumenVisible(false)}>
                <Text style={GLOBAL_STYLES.btnText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, loadingProducts && GLOBAL_STYLES.disabledBtn]} onPress={registrarEntradaInventario} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={GLOBAL_STYLES.btnText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
    padding: 8,
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'transparent',
    marginBottom: 8,
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
  addBtnContainer: {
    position: 'absolute',
    bottom: 3,  // Lo "ancla" al borde inferior
    right: 3,   // Lo "ancla" al borde derecho
    borderRadius: 15,
  },
  modalImageContainer: {
    width: '100%',
    height: 220,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center', // 👈 Asegura que flote en el centro
    alignItems: 'center',
    padding: 10,
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
  },
  modalHeaderColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    color: COLORS.negro,
    fontWeight: '600',
    textAlign: 'left',
  },
  bonoCheckboxBtn: {
    padding: 4, 
    justifyContent: 'center',
    alignItems: 'center',
    color: COLORS.negro,
    marginBottom: 2,
  },
  bonoLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.negro,
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
  cantidadLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 15,
  },
  cantidadControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  cantidadBtn: {
    width: 40,
    height: 40,
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
    width: 40,
    height: 40,
    backgroundColor: COLORS.gris,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantidadValue: {
    fontSize: 24,
    fontWeight: '400',
    color: COLORS.negro,
  },
  modalResumenWidth: {
    width: '90%',
  },
  modalResumenTitle: {
    marginBottom: 15,
  },
  resumenListContainer: {
    maxHeight: 200, // 🚨 FIX SCROLL: Cambiado de height estricto a maxHeight dinámico
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