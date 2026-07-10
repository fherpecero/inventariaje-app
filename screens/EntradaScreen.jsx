import React, { useState, useEffect, useRef, useContext } from 'react';
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

const COLORS = {
  turquesa: '#1a9ea1',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#a7342b',
  naranja: '#FF9800',
  rojito: '#f97272',
  morado: '#7e2b8d',
};

const FONT_SIZES = {
  titulo: 20,
  subtitulo: 16,
  normal: 14,
  pequeño: 12,
};



const SPACING = 10;

export default function EntradaScreen({ onNavigate, darkMode, themeColors }) {
  const { user, cuenta, cuentaId } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
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
  
  // ✅ Ref para trackear si el componente está montado
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ Cargar productos cuando monta o cuando cambia la cuenta
  useEffect(() => {
    if (user && cuenta) {
      cargarProductos();
    }
  }, [user, cuenta]);

  /**
   * FUNCIÓN: Cargar productos combinando catálogo global + inventario de cuenta
   */
  const cargarProductos = async () => {
    if (!isMountedRef.current) return;
    
    try {
      if (isMountedRef.current) setLoading(true);
      
      console.log('📦 Cargando productos para cuenta:', cuenta);

      // PASO 1: Leer catálogo global
      const catalogoRef = collection(db, 'catalogoGlobal');
      const catalogoSnap = await getDocs(catalogoRef);

      // PASO 2: Leer inventario de la cuenta (COMO DOCUMENTO MAPA)
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

      console.log('📊 Inventario cargado:', inventarioMap);

      // PASO 3: Combinar catálogo + inventario
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
        console.log('✅ Productos cargados:', productosCombinados.length);
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

  /**
   * FUNCIÓN: Confirmar entrada (agregar productos al inventario)
   */
  const confirmarEntrada = async () => {
  if (!selectedProduct || cantidad < 1) {
    mostrarToast('Cantidad inválida', 'error');
    return;
  }

  try {
    setLoading(true);

    // PASO 1: Referencia al documento del inventario
    const productoRef = doc(
      db,
      'cuentas',
      cuentaId.toString(),
      'inventarios',
      'vital_health_principal'
    );

    // PASO 2: Leer inventario actual
    const docSnap = await getDoc(productoRef);
    
    // ✅ IMPORTANTE: Asegurar que siempre sea un objeto
    let productosActuales = {};
    if (docSnap.exists() && docSnap.data().productos) {
      productosActuales = docSnap.data().productos;
    }

    console.log('📦 Productos actuales:', productosActuales);

    const cantidadActual = productosActuales[selectedProduct.id]?.cantidad || 0;
    const nuevaCantidad = cantidadActual + cantidad;

    // PASO 3: Actualizar el mapa de productos
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

    console.log('📦 Productos después de actualizar:', productosActualizados);

    // PASO 4: Guardar en Firestore
    await setDoc(productoRef, {
      productos: productosActualizados,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.log(`✅ ${selectedProduct.nombre}: ${cantidadActual} → ${nuevaCantidad}`);

    // PASO 5: Actualizar estado local
    const productosActualizadosLocal = productos.map((p) =>
      p.id === selectedProduct.id
        ? { ...p, cantidad: nuevaCantidad }
        : p
    );
    setProductos(productosActualizadosLocal);

    // PASO 6: Mostrar Toast y cerrar modal
    closeModal();
    mostrarToast(`${selectedProduct.nombre}: +${cantidad} unidades`, 'success');

  } catch (error) {
    console.error('❌ Error en confirmarEntrada:', error);
    console.error('📋 Detalles:', error.message);
    mostrarToast('Error al agregar producto', 'error');
  } finally {
    setLoading(false);
  }
};

  const renderProducto = ({ item }) => {
    const imagen = imagenes[item.codigo] || null;

    return (
      <TouchableOpacity
        style={styles.productCard}
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
          <Text style={styles.productName} numberOfLines={1}>
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
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.turquesa} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <Toast 
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        duration={1500}
        onHide={() => setToastConfig({ visible: false })}
      />
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>➕ Agregar Productos</Text>
        <Text style={styles.headerSubtitle}>Introduce la cantidad de productos a sumar a tu inventario</Text>
      </View>

      {/* GRID DE PRODUCTOS */}
      <FlatList
        data={productos}
        renderItem={renderProducto}
        keyExtractor={(item) => item.codigo}
        numColumns={3}
        columnWrapperStyle={styles.row}
        scrollEnabled={true}
        contentContainerStyle={styles.gridContent}
      />

      {/* MODAL - SELECCIONAR CANTIDAD */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={closeModal}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedProduct && (
              <>
                {/* IMAGEN PRODUCTO */}
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

                {/* INFORMACIÓN */}
                <View style={styles.modalInfo}>
                  <Text style={styles.modalProductName}>
                    {selectedProduct.nombre}
                  </Text>
                  <Text style={styles.modalProductCode}>
                    Código: {selectedProduct.codigo}
                  </Text>
                  <Text style={styles.modalProductStock}>
                    Stock actual: {selectedProduct.cantidad} unidades
                  </Text>
                </View>

                {/* SELECTOR DE CANTIDAD */}
                <View style={styles.cantidadSection}>
                  <Text style={styles.cantidadLabel}>Cantidad a agregar:</Text>

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

                {/* BOTONES */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={closeModal}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.acceptBtn, loading && styles.disabledBtn]}
                    onPress={confirmarEntrada}
                    disabled={loading}
                  >
                    <Text style={styles.acceptBtnText}>
                      {loading ? '⏳' : '✅'} Aceptar
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* HEADER */
  header: {
    backgroundColor: COLORS.turquesa,
    paddingHorizontal: SPACING,
    paddingVertical: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.blanco,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },

  /* GRID */
  gridContent: {
    padding: SPACING,
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
    borderColor: COLORS.morado,
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
    backgroundColor: COLORS.blanco,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.negro,
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

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.blanco,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalImageContainer: {
    width: '100%',
    height: 240,
    marginBottom: 20,
    borderRadius: 16,
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
  modalProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.negro,
    marginBottom: 8,
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

  /* CANTIDAD */
  cantidadSection: {
    backgroundColor: COLORS.gris,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  cantidadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 12,
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

  /* BUTTONS */
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.rojito,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.negro,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.verde,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
