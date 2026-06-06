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
} from 'react-native';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
  naranja: '#FF9800',
};

export default function SalidaScreen() {
  const [searchText, setSearchText] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [cliente, setCliente] = useState('');
  const [descuento, setDescuento] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  // Cargar productos al iniciar
  useEffect(() => {
    cargarProductos();
  }, []);

  // Cargar productos desde Firebase
  const cargarProductos = async () => {
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
        Alert.alert('Error', 'Orita no tenemos joven, a la vuelta');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al cargar productos: ' + error.message);
      console.error('Error:', error);
    }
  };

  // Filtrar productos por búsqueda
  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim().length > 0) {
      const filtered = allProducts.filter((p) =>
        p.nombre.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowDropdown(true);
    } else {
      setFilteredProducts([]);
      setShowDropdown(false);
    }
  };

  // Seleccionar producto
  const selectProduct = (producto) => {
    setSelectedProduct(producto);
    setSearchText(producto.nombre);
    setShowDropdown(false);
    setCantidad('');
    setCliente('');
    setDescuento('');
  };

  // Calcular total
  const calcularTotal = () => {
    if (!selectedProduct || !cantidad) return 0;

    const cantidadNum = parseInt(cantidad) || 0;
    const precioUnitario = selectedProduct.precioVenta || 0;
    const subtotal = cantidadNum * precioUnitario;

    if (descuento) {
      const descuentoNum = parseFloat(descuento) || 0;
      const montoDescuento = (subtotal * descuentoNum) / 100;
      return subtotal - montoDescuento;
    }

    return subtotal;
  };

  // Registrar venta
  const registrarVenta = async () => {
    // Validaciones
    if (!selectedProduct) {
      Alert.alert('Error', 'Selecciona un producto primero');
      return;
    }

    if (!cantidad || isNaN(cantidad) || parseInt(cantidad) <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    const cantidadNum = parseInt(cantidad);
    if (cantidadNum > selectedProduct.cantidad) {
      Alert.alert(
        'Error',
        `Stock insuficiente.\nDisponible: ${selectedProduct.cantidad}\nSolicitado: ${cantidadNum}`
      );
      return;
    }

    setLoading(true);

    try {
      console.log('Enviando a /api/salida:', {
        codigo: selectedProduct.codigo,
        producto: selectedProduct.nombre,
        cantidad: cantidadNum,
        descuento: descuento || 0,
        cliente: cliente || 'Sin cliente',
      });

      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/salida',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: selectedProduct.codigo,
            producto: selectedProduct.nombre,
            cantidad: cantidadNum,
            descuento: descuento || 0,
            cliente: cliente || '',
          }),
        }
      );

      const data = await response.json();
      console.log('Respuesta:', data);

      if (data.exito) {
        Keyboard.dismiss();

        const totalFinal = calcularTotal();

        Alert.alert(
          '✅ Vendimia redimida con éxito',
          `${selectedProduct.nombre}\nCantidad: ${cantidad}\nTotal: $${totalFinal.toFixed(2)}\nStock restante: ${data.cantidadRestante}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Limpiar formulario
                setSelectedProduct(null);
                setSearchText('');
                setCantidad('');
                setCliente('');
                setDescuento('');
                setFilteredProducts([]);
                cargarProductos(); // Recargar lista
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', data.mensaje || 'Error al registrar venta');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al registrar: ' + error.message);
      console.error('Error completo:', error);
    } finally {
      setLoading(false);
    }
  };

  const total = calcularTotal();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💰 Registrar Venta</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Búsqueda de producto */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Buscar producto:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: lo que dice despues del V-"
              value={searchText}
              onChangeText={handleSearch}
              editable={!loading}
            />

            {/* Dropdown de resultados */}
            {showDropdown && filteredProducts.length > 0 && (
              <View style={styles.dropdown}>
                {filteredProducts.map((producto) => (
                  <TouchableOpacity
                    key={producto.codigo}
                    style={styles.dropdownItem}
                    onPress={() => selectProduct(producto)}
                  >
                    <Text style={styles.dropdownItemText}>
                      {producto.nombre}
                    </Text>
                    <Text style={styles.dropdownItemStock}>
                      Stock: {producto.cantidad}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Producto seleccionado */}
          {selectedProduct && (
            <View style={styles.productCard}>
              <Text style={styles.productName}>{selectedProduct.nombre}</Text>
              <Text style={styles.productCode}>
                Código: {selectedProduct.codigo}
              </Text>

              {/* Información de stock */}
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Stock disponible:</Text>
                <Text style={styles.infoValue}>
                  {selectedProduct.cantidad} unidades
                </Text>
              </View>

              {/* Información de precio */}
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Precio unitario:</Text>
                <Text style={styles.infoValue}>
                  ${selectedProduct.precioVenta}
                </Text>
              </View>

              {/* Cantidad a vender */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cantidad a vender:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 2"
                  value={cantidad}
                  onChangeText={setCantidad}
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>

              {/* Cliente (opcional) */}
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

              {/* Descuento % (opcional) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Descuento % (opcional):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 10 (para 10%)"
                  value={descuento}
                  onChangeText={setDescuento}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>

              {/* Resumen de total */}
              {cantidad && (
                <View style={styles.totalBox}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal:</Text>
                    <Text style={styles.totalValue}>
                      ${(parseInt(cantidad) * selectedProduct.precioVenta).toFixed(2)}
                    </Text>
                  </View>
                  {descuento && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Descuento ({descuento}%):</Text>
                      <Text style={styles.totalValue}>
                        -${(
                          ((parseInt(cantidad) * selectedProduct.precioVenta) *
                            parseFloat(descuento)) /
                          100
                        ).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.totalRowFinal}>
                    <Text style={styles.totalLabelFinal}>TOTAL:</Text>
                    <Text style={styles.totalValueFinal}>
                      ${total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Botones */}
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={registrarVenta}
                disabled={loading}
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
                  setSelectedProduct(null);
                  setSearchText('');
                  setCantidad('');
                  setCliente('');
                  setDescuento('');
                }}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
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
  header: {
    backgroundColor: COLORS.turquesa,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 15,
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
  dropdown: {
    backgroundColor: COLORS.blanco,
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
  },
  dropdownItemStock: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  productCard: {
    backgroundColor: COLORS.blanco,
    borderRadius: 8,
    padding: 15,
    borderWidth: 2,
    borderColor: COLORS.turquesa,
    marginBottom: 20,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 5,
  },
  productCode: {
    fontSize: 13,
    color: '#999',
    marginBottom: 15,
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.turquesa,
  },
  totalBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.naranja,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: COLORS.turquesa,
  },
  totalLabelFinal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.negro,
  },
  totalValueFinal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.naranja,
  },
  confirmBtn: {
    backgroundColor: COLORS.verde,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmBtnText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.negro,
    fontSize: 14,
    fontWeight: '600',
  },
});