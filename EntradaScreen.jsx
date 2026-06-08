import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { imagenes } from './productosData';

const COLORS = {
  turquesa: '#1a9ea1',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#a7342b',
  naranja: '#FF9800',
  rojito: '#f97272',
};

const FONT_SIZES = {
  titulo: 20,
  subtitulo: 16,
  normal: 14,
  pequeño: 12,
};

const SPACING = 10;

export default function EntradaScreen({ onNavigate, darkMode, themeColors }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://inventariaje-app.vercel.app/api/salida');
      const data = await response.json();

      if (data.exito && data.productos) {
        setProductos(data.productos);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
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
      Alert.alert('Error', 'Cantidad inválida');
      return;
    }

    try {
      const payload = {
        codigo: selectedProduct.codigo,
        producto: selectedProduct.nombre,
        cantidad: cantidad,
      };

      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/entrada',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (data.exito) {
        Alert.alert(
          'Producto aumentificado exitosamente',
          `${selectedProduct.nombre}\n+${cantidad} unidades`,
          [
            {
              text: 'OK',
              onPress: () => {
                closeModal();
                cargarProductos(); // Recargar para actualizar cantidades
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', data.mensaje || 'No se pudo agregar el producto');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar');
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
          <Text style={styles.productName} numberOfLines={2}>
            {item.nombre}
          </Text>
          <Text style={styles.productStock}>
            Stock: {item.cantidad || 0}
          </Text>
        </View>

        <View style={styles.addBtn}>
          <Text style={styles.addBtnText}>➕</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (

        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
        </View>

    );
  }

  return (

      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>➕ Agregar Productos al Inventario</Text>
          <Text style={styles.headerSubtitle}>Selecciona un producto para agregar stock</Text>
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
          animationType="fade"
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
                      Stock actual: {selectedProduct.cantidad || 0} unidades
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
                      style={styles.acceptBtn}
                      onPress={confirmarEntrada}
                    >
                      <Text style={styles.acceptBtnText}>Aceptar</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
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
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.blanco,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.pequeño,
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
    width: '32%',
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 90,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 90,
    backgroundColor: COLORS.gris,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImagePlaceholderText: {
    fontSize: 32,
  },
  productInfo: {
    padding: 8,
    backgroundColor: COLORS.blanco,
  },
  productName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.negro,
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
    justifyContent: 'flex-end',
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
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: '700',
    color: COLORS.negro,
    marginBottom: 8,
  },
  modalProductCode: {
    fontSize: FONT_SIZES.pequeño,
    color: '#999',
    marginBottom: 4,
  },
  modalProductStock: {
    fontSize: FONT_SIZES.pequeño,
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
    fontSize: FONT_SIZES.normal,
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
    fontSize: FONT_SIZES.normal,
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
    fontSize: FONT_SIZES.normal,
    fontWeight: '700',
    color: COLORS.blanco,
    backgroundColor: COLORS.verde,
  },
});
