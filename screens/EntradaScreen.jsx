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
import { collection, setDoc, getDocs, doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import SearchBar from '../components/SearchBar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getProductosActivos } from '../context/productCatalog';

// ✅ Importaciones Globales
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES, HEADER, } from '../context/theme';

export default function EntradaScreen({ onNavigate, darkMode, themeColors }) {
  // =====================================================================
  // 1. ESTADOS Y CONTEXTO
  // =====================================================================
  const { user, cuenta, cuentaId } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [toastConfig, setToastConfig] = useState({
    visible: false,
    message: '',
    type: 'success'
  });

  const [pedido, setPedido] = useState([]); 
  const [modalResumenVisible, setModalResumenVisible] = useState(false);
  const [costoTotalCalculado, setCostoTotalCalculado] = useState(0); 
  const [costoTotalFinal, setCostoTotalFinal] = useState(''); 
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);

  const isMountedRef = useRef(true);

  // =====================================================================
  // 2. EFECTOS
  // =====================================================================
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user && cuenta) {
      cargarProductos();
    }
  }, [user, cuenta]);

  // =====================================================================
  // 3. FUNCIONES DE LÓGICA Y DATOS
  // =====================================================================
  const cargarProductos = async () => {
    if (!isMountedRef.current) return;
    
    try {
      if (isMountedRef.current) setLoading(true);
      
      const catalogoRef = collection(db, 'catalogoGlobal');
      const catalogoSnap = await getDocs(catalogoRef);

      const docRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');
      const docSnap = await getDoc(docRef);
      const productosData = docSnap.data()?.productos || {};

      const inventarioMap = {};
      Object.keys(productosData).forEach((codigo) => {
        inventarioMap[codigo] = productosData[codigo].cantidad || 0;
      });

      const productosCombinados = catalogoSnap.docs.map((document) => {
        const catalogo = document.data();
        const stockActual = inventarioMap[document.id] || 0;

        return {
          id: document.id,
          nombre: catalogo.nombre,
          codigo: catalogo.codigo,
          descripcion: catalogo.descripcion,
          precioCosto: catalogo.precioCostoStandard || 0,
          precioVenta: catalogo.precioVentaStandard || 0,
          cantidad: stockActual,
          categoria: catalogo.categoria,
          bonoInfluencer: false,
        };
      });

      if (isMountedRef.current) {
        setProductos(productosCombinados);
        setProductosFiltrados(productosCombinados);
      }
    } catch (error) {
      console.error('❌ Error cargando productos:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'No se pudieron cargar los productos: ' + error.message);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

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
    setSelectedProduct(prev => ({
      ...prev,
      bonoInfluencer: !prev.bonoInfluencer
    }));
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
    
    // 🧠 REGLA DE NEGOCIO FINANCIERA: 
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

  // 🧮 CÁLCULO DINÁMICO DE DESCUENTO EN RESTOCK (Esta es la función que faltaba)
  const handleCostoFinalChange = (text) => {
    setCostoTotalFinal(text);

    if (text === '') {
      setPorcentajeDescuento(0);
      return;
    }

    const pagadoReal = parseFloat(text);

    // Si pagan menos de lo que cuesta, calculamos el % de ahorro
    if (!isNaN(pagadoReal) && costoTotalCalculado > 0 && pagadoReal < costoTotalCalculado) {
      const porcentaje = ((costoTotalCalculado - pagadoReal) / costoTotalCalculado) * 100;
      setPorcentajeDescuento(Math.round(porcentaje));
    } else {
      setPorcentajeDescuento(0);
    }
  };

  // =====================================================================
  // 5. TRANSACCIÓN BASE DE DATOS
  // =====================================================================
  const registrarEntradaInventario = async () => {
    if (pedido.length === 0) return;
    setLoading(true);

    try {
      const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
      const inventarioRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');

      await runTransaction(db, async (transaction) => {
        const cuentaDoc = await transaction.get(cuentaRef);
        const nuevoFolio = (cuentaDoc.data()?.ultimoFolioEntrada || 0) + 1;
        
        const nuevaEntradaRef = doc(db, `cuentas/${cuentaId}/entradas`, `ENT-${nuevoFolio}`);
        const analyticsRef = doc(db, `cuentas/${cuentaId}/analytics`, `ENT-${nuevoFolio}`);
        
        const inventarioSnap = await transaction.get(inventarioRef);
        let productosActuales = inventarioSnap.exists() ? (inventarioSnap.data().productos || {}) : {};

        pedido.forEach(item => {
          const cantidadActual = productosActuales[item.id]?.cantidad || 0;
          const piezasDescuentoActuales = productosActuales[item.id]?.piezasConDescuento || 0;
          const infoPrevia = productosActuales[item.id] || {}; 
          
          productosActuales[item.id] = {
            ...infoPrevia,
            cantidad: cantidadActual + item.cantidad,
            piezasConDescuento: item.bonoInfluencer 
                ? (piezasDescuentoActuales + item.cantidad) 
                : piezasDescuentoActuales,
            codigo: item.codigo || 'S/N',
            nombre: item.nombre || 'Desconocido',
            updatedAt: new Date().toISOString()
          };
        });

        const pedidoLimpio = pedido.map(item => ({
          id: item.id || '',
          codigo: item.codigo || '',
          nombre: item.nombre || '',
          cantidad: item.cantidad || 0,
          precioCosto: item.precioCosto || 0,
          costoUnitarioAplicado: item.costoUnitarioAplicado || 0,
          bonoInfluencer: !!item.bonoInfluencer
        }));

        const ordenEntrada = {
          folio: nuevoFolio,
          fecha: new Date().toISOString(),
          productos: pedidoLimpio,
          costoBase: costoTotalCalculado || 0,
          costoPagado: parseFloat(costoTotalFinal) || costoTotalCalculado || 0,
          descuentoAplicado: parseFloat(porcentajeDescuento) || 0,
          ahorroMonetario: (costoTotalCalculado - (parseFloat(costoTotalFinal) || costoTotalCalculado)) || 0,
          creadoPorUid: user.uid || 'sistema',
          creadoPorNombre: user.email,
          registradoPor: user.uid || 'sistema',
        };

        // E. EJECUTAR ESCRITURAS SIMULTÁNEAS PARA TODOS LOS USUARIOS
        transaction.set(inventarioRef, { productos: productosActuales, updatedAt: new Date().toISOString() }, { merge: true });
        transaction.set(nuevaEntradaRef, ordenEntrada);
        transaction.update(cuentaRef, { ultimoFolioEntrada: nuevoFolio });
        
        // El espejo siempre se guarda para nutrir la base de datos
        transaction.set(analyticsRef, { tipoMovimiento: 'ENTRADA_RESTOCK', ...ordenEntrada });
        });

      setPedido([]);
      setModalResumenVisible(false);
      cargarProductos();
      Alert.alert("¡Restock Exitoso!", "Inventario y costos guardados correctamente.");

    } catch (error) {
      console.error("❌ Error en transacción de restock:", error);
      Alert.alert("Error", "No se pudo registrar la entrada.");
    } finally {
      setLoading(false);
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
      <View style={GLOBAL_STYLES.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.turquesa} />
      </View>
    );
  }

  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
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
              
              {/* BADGE DEL CARRITO */}
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {pedido.reduce((acc, curr) => acc + curr.cantidad, 0)}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            /* 👻 ESPACIADOR FANTASMA: Mantiene el título centrado cuando no hay carrito */
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
        data={productosFiltrados}
        renderItem={renderProducto}
        keyExtractor={(item) => item.codigo}
        numColumns={3}
        columnWrapperStyle={styles.row}
        scrollEnabled={true}
        contentContainerStyle={styles.gridContent}
      />

      {/* MODAL DE SELECCIÓN DE PRODUCTO */}
      <Modal visible={modalVisible} transparent={true} animationType="none" onPress={() => setModalVisible(false)}>
        <Pressable style={GLOBAL_STYLES.modalOverlay} onPress={() => setModalVisible(false)}>
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
                  
                  {/* MAGIA DE COLUMNAS */}
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

                  {/* CONTROLES DE CANTIDAD */}
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

                    <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, loading && GLOBAL_STYLES.disabledBtn]} onPress={confirmarEntrada} disabled={loading}>
                      <Text style={GLOBAL_STYLES.btnText}>{loading ? '⏳' : '✅'} Aceptar</Text>
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
                {pedido.map((item, idx) => (
                  <Text key={idx} style={[styles.resumenItemText, { color: themeColors.text }]}>
                    {item.cantidad}x {item.nombre} {item.bonoInfluencer ? '⭐' : ''}
                  </Text>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.resumenFinancieroBox, { backgroundColor: darkMode ? '#333' : COLORS.gris }]}>
              <Text style={[styles.resumenTextoBase, { color: themeColors.text }]}>
                Total sin descuentos: ${costoTotalCalculado.toFixed(2)}
              </Text>
              
              <Text style={[styles.resumenTextoTitulo, { color: themeColors.text }]}>
                Total pagado:
              </Text>
              <Text style={styles.resumenTextoSub}>
                (Bono influencer, bono de lealtad, etc...)
              </Text>
              
              {/* AQUÍ ESTÁ EL INPUT QUE FALLABA */}
              <TextInput
                style={[
                  GLOBAL_STYLES.input, 
                  styles.resumenInput,
                  { backgroundColor: darkMode ? '#222' : '#FFF', color: themeColors.text }
                ]}
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

// =====================================================================
// 7. HOJA DE ESTILOS ESPECÍFICOS DE LA PANTALLA
// =====================================================================
const styles = StyleSheet.create({
  // Layout Base
  gridContent: {
    padding: SPACING.content_padding,
    paddingBottom: 30,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  
  // Header Componentes
  headerFlex: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
  },
  headerBtnWrapper: {
    width: 40,
  },
  headerIconText: {
    fontSize: 24,
  },
  headerTitleText: {
    flex: 1, 
    textAlign: 'center',
  },
  headerSpacer: {
    width: 50,
  },
  headerCartBtn: {
    backgroundColor: COLORS.morado,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCartText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Cards de Producto
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
    backgroundColor: 'transparent',
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

  // ==========================================
  // ESTRUCTURA 2 COLUMNAS (INFO VS BONO)
  // ==========================================
  modalHeaderColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Alinea el contenido arriba
    marginBottom: 20,
  },
  modalLeftColumn: {
    flex: 1, // Toma todo el espacio disponible a la izquierda
    paddingRight: 10,
    justifyContent: 'center',
  },
  modalRightColumn: {
    alignItems: 'center', // Centra el botón y su etiqueta dentro de la columna
    justifyContent: 'center',
    minWidth: 90, // Asegura que la etiqueta tenga espacio
  },
  modalProductNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 5, // Espacio entre el nombre y el texto del stock
    textAlign: 'left', // Garantiza alineación al margen izquierdo
    paddingVertical: 0, // Anula el padding del GLOBAL
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
    marginBottom: 2, // Espacio entre botón y etiqueta
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
  // ==========================================

  // Controles de Cantidad
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

  // Modal Resumen 
  modalResumenWidth: {
    width: '90%',
  },
  modalResumenTitle: {
    marginBottom: 15,
  },
  resumenListContainer: {
    height: 160, // Cambiado de maxHeight a height fijo para asegurar el marco del scroll
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0', // Borde sutil para delimitar el área de scroll
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
    borderWidth: 1,
    borderColor: COLORS.negro,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: 'bold',
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
    // position: 'relative' hace que el position: 'absolute' del badge 
    // tome como límite este botón, no la pantalla completa.
    position: 'relative', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.morado, // Un color que resalte (o rojo)
    minWidth: 20, // Min width permite que se estire si el número es "100"
    height: 20,
    borderRadius: 10, // Mitad de la altura para hacerlo perfectamente redondo
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4, // Da aire a los números de dos dígitos
    borderWidth: 1.5,
    borderColor: '#FFF', // Borde blanco (o del color del header) para recortar el ícono
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});