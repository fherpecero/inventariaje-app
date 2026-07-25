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

// ✅ 1. Importamos la Fuente de la Verdad desde theme.jsx
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES, HEADER, } from '../context/theme';

export default function EntradaScreen({ onNavigate, darkMode, themeColors }) {
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

  // Estados del "Pedido" (Carrito)
  const [pedido, setPedido] = useState([]); // Lista de productos a ingresar
  const [modalResumenVisible, setModalResumenVisible] = useState(false);

  // Estados Financieros del Restock
  const [costoTotalCalculado, setCostoTotalCalculado] = useState(0); // Suma de precioCostoStandard
  const [costoTotalFinal, setCostoTotalFinal] = useState(''); // Lo que el usuario realmente pagó
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);

  // ✅ NUEVA LÓGICA: Solo agrega a la memoria de la app (Carrito)
  const confirmarEntrada = () => {
    if (!selectedProduct || cantidad < 1) {
      mostrarToast('Cantidad inválida', 'error');
      return;
    }

    // Checamos si el producto ya está en el pedido para sumar la cantidad, o si es nuevo
    const productoExistente = pedido.find(p => p.id === selectedProduct.id);
    
    if (productoExistente) {
      setPedido(pedido.map(p =>
        p.id === selectedProduct.id ? { ...p, cantidad: p.cantidad + cantidad } : p
      ));
    } else {
      setPedido([...pedido, { ...selectedProduct, cantidad }]);
    }

    closeModal();
    // Mantenemos el Toast, pero ahora confirma que se guardó en el carrito, no en Firestore
    mostrarToast(`${selectedProduct.nombre}: +${cantidad} añadidos al pedido`, 'success');
  };

  const mostrarToast = (msg, tipo = 'success') => {
    setToastConfig({ visible: true, message: msg, type: tipo });
  };
  
  const isMountedRef = useRef(true);

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

  const cargarProductos = async () => {
    if (!isMountedRef.current) return;
    
    try {
      if (isMountedRef.current) setLoading(true);
      
      console.log('📦 Cargando productos para cuenta:', cuenta);

      const catalogoRef = collection(db, 'catalogoGlobal');
      const catalogoSnap = await getDocs(catalogoRef);

      const docRef = doc(
        db,
        'cuentas',
        cuentaId.toString(),
        'inventarios',
        'vital_health_principal'
      );
      const docSnap = await getDoc(docRef);
      const productos = docSnap.data()?.productos || {};

      const inventarioMap = {};
      Object.keys(productos).forEach((codigo) => {
        inventarioMap[codigo] = productos[codigo].cantidad || 0;
      });

      const productosCombinados = catalogoSnap.docs.map((doc) => {
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
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const openModal = (product) => {
    setSelectedProduct(product);
    setCantidad(1);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedProduct(null);
    setCantidad(1);
  };

  const aumentarCantidad = () => {
    setCantidad(cantidad + 1);
  };

  const disminuirCantidad = () => {
    if (cantidad > 1) {
      setCantidad(cantidad - 1);
    }
  };

  const handleSearch = useCallback((filtrados) => {
    setProductosFiltrados(filtrados);
  }, []);

  const productosParaSearch = useMemo(() => {
    return productos;
  }, [productos]);

  // 1. Preparar el resumen y calcular costo estándar
  const prepararResumenPedido = () => {
    let totalBase = 0;
    pedido.forEach(item => {
      // Ya tienes precioCosto gracias a tu mapeo en cargarProductos()
      totalBase += (item.precioCosto * item.cantidad);
    });
    
    setCostoTotalCalculado(totalBase);
    setCostoTotalFinal(totalBase.toString()); 
    setPorcentajeDescuento(0);
    setModalResumenVisible(true);
  };

  // 2. Manejar descuentos si el socio edita el total
  const handleCostoFinalChange = (valorIngresado) => {
    setCostoTotalFinal(valorIngresado);
    const totalPagadoNum = parseFloat(valorIngresado) || 0;
    
    if (costoTotalCalculado > 0 && totalPagadoNum >= 0) {
      const descuento = ((costoTotalCalculado - totalPagadoNum) / costoTotalCalculado) * 100;
      setPorcentajeDescuento(descuento > 0 ? descuento.toFixed(2) : 0);
    } else {
      setPorcentajeDescuento(0);
    }
  };

  // 3. 🚨 La Transacción Maestra (ADAPTADA A TU ESQUEMA DE INVENTARIO)
  const registrarEntradaInventario = async () => {
    if (pedido.length === 0) return;
    setLoading(true);

    try {
      const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
      const inventarioRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');

      await runTransaction(db, async (transaction) => {
        // A. Obtener folio
        const cuentaDoc = await transaction.get(cuentaRef);
        const nuevoFolio = (cuentaDoc.data()?.ultimoFolioEntrada || 0) + 1;
        
        const nuevaEntradaRef = doc(db, `cuentas/${cuentaId}/entradas`, `ENT-${nuevoFolio}`);
        const analyticsRef = doc(db, `cuentas/${cuentaId}/analytics`, `ENT-${nuevoFolio}`);
        
        // B. Obtener Inventario Actual (Tú guardas todo en un solo doc)
        const inventarioSnap = await transaction.get(inventarioRef);
        let productosActuales = inventarioSnap.exists() ? (inventarioSnap.data().productos || {}) : {};

        // C. Sumar el carrito al inventario actual
        pedido.forEach(item => {
        const cantidadActual = productosActuales[item.id]?.cantidad || 0;
        const infoPrevia = productosActuales[item.id] || {}; // Evita undefined si es producto nuevo
        
        productosActuales[item.id] = {
          ...infoPrevia,
          cantidad: cantidadActual + item.cantidad,
          codigo: item.codigo || 'S/N',
          nombre: item.nombre || 'Desconocido',
          updatedAt: new Date().toISOString()
        };
      });

      // LIMPIEZA: Extraemos solo lo necesario y ponemos "fallbacks" (|| 0)
      const pedidoLimpio = pedido.map(item => ({
        id: item.id || '',
        codigo: item.codigo || '',
        nombre: item.nombre || '',
        cantidad: item.cantidad || 0,
        precioCosto: item.precioCosto || 0
      }));

        // D. Crear objeto del recibo (Totalmente sanitizado)
        const ordenEntrada = {
          folio: nuevoFolio,
          fecha: new Date().toISOString(),
          productos: pedidoLimpio, // 👈 Pasamos el carrito ya limpio sin undefined
          costoBase: costoTotalCalculado || 0,
          costoPagado: parseFloat(costoTotalFinal) || costoTotalCalculado || 0,
          descuentoAplicado: parseFloat(porcentajeDescuento) || 0,
          ahorroMonetario: (costoTotalCalculado - (parseFloat(costoTotalFinal) || costoTotalCalculado)) || 0,
          creadoPorUid: user.uid || 'sistema', // Protegemos en caso de que user tarde en cargar
          creadoPorNombre: userData?.nombre || user.email,
        };

        // E. EJECUTAR ESCRITURAS SIMULTÁNEAS
        transaction.set(inventarioRef, { productos: productosActuales, updatedAt: new Date().toISOString() }, { merge: true });
        transaction.set(nuevaEntradaRef, ordenEntrada);
        transaction.set(analyticsRef, { tipoMovimiento: 'ENTRADA_RESTOCK', ...ordenEntrada });
        transaction.update(cuentaRef, { ultimoFolioEntrada: nuevoFolio });
      });

      // Éxito: Limpiar estados y actualizar UI
      setPedido([]);
      setModalResumenVisible(false);
      cargarProductos(); // Refrescamos la pantalla para ver el nuevo stock
      Alert.alert("¡Restock Exitoso!", "Inventario y costos guardados correctamente.");

    } catch (error) {
      console.error("❌ Error en transacción de restock:", error);
      Alert.alert("Error", "No se pudo registrar la entrada.");
    } finally {
      setLoading(false);
    }
  };

  const renderProducto = ({ item }) => {
    const imagen = imagenes[item.codigo] || null;

    return (
      <TouchableOpacity
        style={[styles.productCard, { borderColor: COLORS.morado }]} // Forzamos color para que no se pierda al quitar COLORS local
        onPress={() => openModal(item)}
        activeOpacity={0.7}
      >
        {imagen ? (
          <Image
            source={imagen}
            style={styles.productImage}
          />
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
      
      {/* HEADER ESTILO SALIDAS (CON GRADIENTE) */}
      <View style={[HEADER.headerContainer, { backgroundColor: themeColors.bg }]}>
        <View style={[HEADER.headerContent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          
          {/* Botón de Regresar */}
          <TouchableOpacity onPress={() => onNavigate('home')} style={{ width: 40 }}>
            <Text style={{ color: themeColors.text, fontSize: 24 }}>←</Text>
          </TouchableOpacity>

          {/* Título */}
          <Text style={[HEADER.headerTitle, { color: themeColors.text, flex: 1, textAlign: 'center' }]}>
            Entradas
          </Text>

          {/* Botón de Pedido (Carrito) o un espacio vacío para balancear */}
          {pedido.length > 0 ? (
             <TouchableOpacity 
               onPress={prepararResumenPedido}
               style={{
                 backgroundColor: COLORS.morado,
                 paddingHorizontal: 12,
                 paddingVertical: 8,
                 borderRadius: 20,
                 minWidth: 50,
                 alignItems: 'center',
                 justifyContent: 'center'
               }}
             >
               <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                 🛒 {pedido.length}
               </Text>
             </TouchableOpacity>
          ) : (
             <View style={{ width: 50 }} /> /* Espaciador invisible para mantener "Entradas" centrado */
          )}
        </View>

        {/* Borde Gradiente Inferior (Igual que en Salidas) */}
        <LinearGradient
          colors={['rgba(68, 194, 194, 1)', 'rgba(122, 122, 236, 0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0.27, 0.90]}
          style={HEADER.headerBorderGradient}
        />
      </View>

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

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <Pressable
          style={GLOBAL_STYLES.modalOverlay}
          onPress={closeModal}
        >
          <Pressable
            style={[GLOBAL_STYLES.modalContent, { backgroundColor: themeColors.bg, padding: 0 }]} // Quitamos el padding para la imagen de arriba
            onPress={(e) => e.stopPropagation()}
          >
            {selectedProduct && (
              <>
                <View style={styles.modalImageContainer}>
                  {imagenes[selectedProduct.codigo] ? (
                    <Image
                      source={imagenes[selectedProduct.codigo]}
                      style={styles.modalImage}
                    />
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <Text style={styles.modalImagePlaceholderText}>📦</Text>
                    </View>
                  )}
                </View>

                {/* Envolvemos el resto en un View con padding */}
                <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                  <View style={styles.modalInfo}>
                    <Text style={[GLOBAL_STYLES.modalTitle, { textAlign: 'left', marginBottom: 5, color: themeColors.text }]}>
                      {selectedProduct.nombre}
                    </Text>
                    <Text style={styles.modalProductCode}>
                      Código: {selectedProduct.codigo}
                    </Text>
                    <Text style={styles.modalProductStock}>
                      Stock actual: {selectedProduct.cantidad} unidades
                    </Text>
                  </View>

                  <View style={[styles.cantidadSection, { backgroundColor: darkMode ? '#333' : COLORS.gris }]}>
                    <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text }]}>Cantidad a agregar:</Text>

                    <View style={styles.cantidadControls}>
                      <TouchableOpacity
                        style={styles.cantidadBtn}
                        onPress={disminuirCantidad}
                      >
                        <Text style={styles.cantidadBtnText}>−</Text>
                      </TouchableOpacity>

                      <View style={styles.cantidadDisplay}>
                        <Text style={styles.cantidadValue}>{cantidad}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.cantidadBtn}
                        onPress={aumentarCantidad}
                      >
                        <Text style={styles.cantidadBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* ✅ 3. Usamos los botones Globales */}
                  <View style={GLOBAL_STYLES.modalButtons}>
                    <TouchableOpacity
                      style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]}
                      onPress={closeModal}
                    >
                      <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, loading && GLOBAL_STYLES.disabledBtn]}
                      onPress={confirmarEntrada}
                      disabled={loading}
                    >
                      <Text style={GLOBAL_STYLES.btnText}>
                        {loading ? '⏳' : '✅'} Aceptar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      {/* ========================================================= */}
      {/* 2. NUEVO MODAL DE RESUMEN Y COSTOS  */}
      {/* ========================================================= */}
      <Modal 
        visible={modalResumenVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => setModalResumenVisible(false)}
      >
        <Pressable 
          style={GLOBAL_STYLES.modalOverlay}
          onPress={() => setModalResumenVisible(false)}
        >
          <Pressable 
            style={[GLOBAL_STYLES.modalContent, { backgroundColor: themeColors.bg, width: '90%' }]}
            onPress={(e) => e.stopPropagation()} // Evita que se cierre al picar dentro del cuadro blanco
          >
            <Text style={[GLOBAL_STYLES.modalTitle, { color: themeColors.text, marginBottom: 15 }]}>
              Resumen de Restock
            </Text>
            
            {/* Lista de productos seleccionados */}
            <View style={{ maxHeight: 120, marginBottom: 15 }}>
              <ScrollView>
                {pedido.map((item, idx) => (
                  <Text key={idx} style={{ color: themeColors.text, fontSize: 16, marginVertical: 3 }}>
                    {item.cantidad}x {item.nombre}
                  </Text>
                ))}
              </ScrollView>
            </View>

            {/* Contenedor financiero editable */}
            <View style={{ backgroundColor: darkMode ? '#333' : COLORS.gris, padding: 15, borderRadius: 10, marginBottom: 20 }}>
              <Text style={{ color: themeColors.text, fontSize: 14 }}>
                Total sin descuentos: ${costoTotalCalculado.toFixed(2)}
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
                <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 16 }}>
                  Total pagado:
                </Text>
              </View>
              <Text style={{ color: 'gray', fontSize: 12, marginBottom: 8, marginTop: 2 }}>
                (Bono influencer, bono de lealtad, etc...)
              </Text>
              
              <TextInput
                style={[
                  GLOBAL_STYLES.input, 
                  { 
                    backgroundColor: darkMode ? '#222' : '#FFF', 
                    color: themeColors.text,
                    borderWidth: 1,
                    borderColor: COLORS.negro,
                    borderRadius: 10,
                    paddingVertical: 8, // Lo hace más alto y fácil de tocar con el dedo
                    paddingHorizontal: 10,
                    fontSize: 14, // Letra más grande para los números
                    fontWeight: 'bold',
                    textAlign: 'left', // Centrado parece más una calculadora/caja de pago
                  }
                ]}
                keyboardType="numeric"
                value={costoTotalFinal}
                onChangeText={handleCostoFinalChange}
                selectTextOnFocus={true} // ✨ Magia de UX: Selecciona todo al tocar
                placeholderTextColor="gray"
              />


              {/* Si se calcula un descuento válido, mostramos los globos verdes de ahorro */}
              {parseFloat(porcentajeDescuento) > 0 && (
                <View style={{ marginTop: 12, padding: 10, backgroundColor: 'rgba(76, 175, 80, 0.15)', borderRadius: 8 }}>
                  <Text style={{ color: COLORS.negro, fontWeight: 'bold', fontSize: 14 }}>
                    Descuento Aplicado: {porcentajeDescuento}%
                  </Text>
                  <Text style={{ color: COLORS.negro, fontSize: 13, marginTop: 2 }}>
                    Margen de ganancia adicional: ${(costoTotalCalculado - parseFloat(costoTotalFinal)).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Botones de acción globales */}
            <View style={GLOBAL_STYLES.modalButtons}>
              <TouchableOpacity 
                style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]} 
                onPress={() => setModalResumenVisible(false)}
              >
                <Text style={GLOBAL_STYLES.btnText}>Volver</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, loading && GLOBAL_STYLES.disabledBtn]} 
                onPress={registrarEntradaInventario}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={GLOBAL_STYLES.btnText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ✅ 4. StyleSheet purificado (Solo estilos de Grid/Imágenes que son únicos aquí)
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
    height: 240,
    marginBottom: 20,
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
  modalInfo: {
    marginBottom: 20,
  },
  modalProductCode: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  modalProductStock: {
    fontSize: 12,
    color: COLORS.turquesa,
    fontWeight: '600',
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
});