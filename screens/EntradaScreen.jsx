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
} from 'react-native';
import { imagenes } from '../productosData';
import { collection, setDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import Toast from '../components/Toast';
import SearchBar from '../components/SearchBar';

// ✅ 1. Importamos la Fuente de la Verdad desde theme.jsx
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES } from '../context/theme';

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

  const confirmarEntrada = async () => {
    if (!selectedProduct || cantidad < 1) {
      mostrarToast('Cantidad inválida', 'error');
      return;
    }

    try {
      setLoading(true);

      const productoRef = doc(
        db,
        'cuentas',
        cuentaId.toString(),
        'inventarios',
        'vital_health_principal'
      );

      const docSnap = await getDoc(productoRef);
      
      let productosActuales = {};
      if (docSnap.exists() && docSnap.data().productos) {
        productosActuales = docSnap.data().productos;
      }

      const cantidadActual = productosActuales[selectedProduct.id]?.cantidad || 0;
      const nuevaCantidad = cantidadActual + cantidad;

      const productosActualizados = {
        ...productosActuales,
        [selectedProduct.id]: {
          ...productosActuales[selectedProduct.id],
          cantidad: nuevaCantidad,
          codigo: selectedProduct.codigo,
          nombre: selectedProduct.nombre,
          updatedAt: new Date().toISOString(),
          createdAt: productosActuales[selectedProduct.id]?.createdAt || new Date().toISOString(),
        }
      };

      await setDoc(productoRef, {
        productos: productosActualizados,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      const productosActualizadosLocal = productos.map((p) =>
        p.id === selectedProduct.id
          ? { ...p, cantidad: nuevaCantidad }
          : p
      );
      setProductos(productosActualizadosLocal);

      closeModal();
      mostrarToast(`${selectedProduct.nombre}: +${cantidad} unidades`, 'success');

    } catch (error) {
      console.error('❌ Error en confirmarEntrada:', error);
      mostrarToast('Error al agregar producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((filtrados) => {
    setProductosFiltrados(filtrados);
  }, []);

  const productosParaSearch = useMemo(() => {
    return productos;
  }, [productos]);

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
      
      {/* ✅ 2. Cambiamos el header manual por el ScreenHeader Global */}
      <ScreenHeader
        title="➕ Entradas"
        onBackPress={() => onNavigate('home')}
        themeColors={themeColors}
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