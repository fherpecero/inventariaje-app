import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList
} from 'react-native';
import { getImagenProducto } from './productosData';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
  amarillo: '#FFC107',
};

export default function SalidaScreen() {
  const [productos, setProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [cliente, setCliente] = useState('');
  const [fecha, setFecha] = useState(new Date().toLocaleString('es-MX'));
  const [loading, setLoading] = useState(true);
  const [mostraCatalogo, setMostraCatalogo] = useState(true);

  // Obtener todos los productos al cargar
  useEffect(() => {
    obtenerProductos();
  }, []);

  const obtenerProductos = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/inventario'
      );
      
      // Por ahora simulamos con datos locales
      // Después conectamos con API real que devuelva todos los productos
      const productosSimulados = [
        { codigo: '783495591689', nombre: 'Vitamina C 500mg', cantidad: 25, precioCosto: 50, precioVenta: 120 },
        { codigo: '704001043645', nombre: 'Proteína Whey', cantidad: 12, precioCosto: 200, precioVenta: 450 },
        { codigo: '742761499890', nombre: 'Omega 3', cantidad: 8, precioCosto: 150, precioVenta: 350 },
        { codigo: '789232455740', nombre: 'Multivitamínico', cantidad: 15, precioCosto: 80, precioVenta: 200 },
        { codigo: '782706461186', nombre: 'Magnesio', cantidad: 20, precioCosto: 60, precioVenta: 150 },
        { codigo: '782706461193', nombre: 'Zinc', cantidad: 18, precioCosto: 45, precioVenta: 120 },
      ];
      
      setProductos(productosSimulados);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar productos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar producto del catálogo
  const seleccionarProducto = (producto) => {
    setProductoSeleccionado(producto);
    setMostraCatalogo(false);
    setCantidad('');
    setCliente('');
    setFecha(new Date().toLocaleString('es-MX'));
  };

  // Registrar venta
  const registrarVenta = async () => {
    if (!cantidad || isNaN(cantidad) || parseInt(cantidad) <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    if (!cliente.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del cliente');
      return;
    }

    const cantidadVenta = parseInt(cantidad);

    if (cantidadVenta > productoSeleccionado.cantidad) {
      Alert.alert(
        'Stock insuficiente',
        `Solo hay ${productoSeleccionado.cantidad} unidades disponibles`
      );
      return;
    }

    setLoading(true);
    try {
      // Restar del inventario
      const nuevaCantidad = productoSeleccionado.cantidad - cantidadVenta;
      
      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/inventario',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            codigo: productoSeleccionado.codigo,
            cantidad: nuevaCantidad,
          }),
        }
      );

      const data = await response.json();

      if (data.exito) {
        // Calcular totales
        const totalCosto = cantidadVenta * productoSeleccionado.precioCosto;
        const totalVenta = cantidadVenta * productoSeleccionado.precioVenta;
        const ganancia = totalVenta - totalCosto;

        Alert.alert(
          '✅ Venta registrada',
          `
Producto: ${productoSeleccionado.nombre}
Cantidad: ${cantidadVenta} unidades
Cliente: ${cliente}
Fecha: ${fecha}

Costo total: $${totalCosto}
Venta total: $${totalVenta}
Ganancia: $${ganancia}
          `,
          [
            {
              text: 'OK',
              onPress: () => {
                setProductoSeleccionado(null);
                setCantidad('');
                setCliente('');
                setMostraCatalogo(true);
                obtenerProductos(); // Recargar productos
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Error al registrar venta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // UI: Catálogo de productos
  if (mostraCatalogo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📤 Salida de Inventario</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.turquesa} />
            <Text style={styles.loadingText}>Cargando catálogo...</Text>
          </View>
        ) : (
          <FlatList
            data={productos}
            keyExtractor={(item) => item.codigo}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productItem}
                onPress={() => seleccionarProducto(item)}
              >
                <View style={styles.productItemImage}>
                  <Image
                    source={getImagenProducto(item.codigo)}
                    style={styles.productItemImg}
                  />
                </View>

                <View style={styles.productItemInfo}>
                  <Text style={styles.productItemName}>{item.nombre}</Text>
                  <Text style={styles.productItemCode}>Código: {item.codigo}</Text>
                  <View style={styles.productItemFooter}>
                    <Text style={styles.productItemStock}>
                      Stock: {item.cantidad}
                    </Text>
                    <Text style={styles.productItemPrice}>
                      ${item.precioVenta}
                    </Text>
                  </View>
                </View>

                <View style={styles.productItemSelect}>
                  <Text style={styles.selectArrow}>→</Text>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={true}
          />
        )}
      </View>
    );
  }

  // UI: Formulario de venta
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📤 Registrar Venta</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Producto seleccionado */}
        <View style={styles.productCard}>
          <View style={styles.productCardImage}>
            <Image
              source={getImagenProducto(productoSeleccionado.codigo)}
              style={styles.productCardImg}
            />
          </View>

          <Text style={styles.productCardName}>{productoSeleccionado.nombre}</Text>
          <Text style={styles.productCardCode}>
            Código: {productoSeleccionado.codigo}
          </Text>

          <View style={styles.productCardInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Stock disponible:</Text>
              <Text style={styles.infoValue}>{productoSeleccionado.cantidad}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Precio venta:</Text>
              <Text style={styles.infoValue}>${productoSeleccionado.precioVenta}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.changeProductBtn}
            onPress={() => {
              setProductoSeleccionado(null);
              setMostraCatalogo(true);
            }}
          >
            <Text style={styles.changeProductBtnText}>← Cambiar producto</Text>
          </TouchableOpacity>
        </View>

        {/* Cantidad */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Cantidad a vender:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 2"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="numeric"
            editable={!loading}
          />
        </View>

        {/* Cliente */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre del cliente:</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre o empresa"
            value={cliente}
            onChangeText={setCliente}
            editable={!loading}
          />
        </View>

        {/* Fecha/Hora */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Fecha y hora:</Text>
          <TextInput
            style={styles.input}
            value={fecha}
            onChangeText={setFecha}
          />
          <TouchableOpacity
            style={styles.updateDateBtn}
            onPress={() => setFecha(new Date().toLocaleString('es-MX'))}
          >
            <Text style={styles.updateDateBtnText}>Actualizar a ahora</Text>
          </TouchableOpacity>
        </View>

        {/* Resumen */}
        {cantidad && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen de venta:</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cantidad:</Text>
              <Text style={styles.summaryValue}>{cantidad} unidades</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Precio unitario:</Text>
              <Text style={styles.summaryValue}>${productoSeleccionado.precioVenta}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryLabel}>Total venta:</Text>
              <Text style={styles.summaryTotalValue}>
                ${parseInt(cantidad) * productoSeleccionado.precioVenta}
              </Text>
            </View>
          </View>
        )}

        {/* Botón Vender */}
        <TouchableOpacity
          style={styles.sellBtn}
          onPress={registrarVenta}
          disabled={loading}
        >
          <Text style={styles.sellBtnText}>✅ Registrar Venta</Text>
        </TouchableOpacity>

        {/* Botón Cancelar */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            setProductoSeleccionado(null);
            setMostraCatalogo(true);
          }}
          disabled={loading}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: 40,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.blanco,
    borderRadius: 8,
    marginBottom: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.turquesa,
  },
  productItemImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productItemImg: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  productItemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 4,
  },
  productItemCode: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  productItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productItemStock: {
    fontSize: 13,
    color: COLORS.turquesa,
    fontWeight: '600',
  },
  productItemPrice: {
    fontSize: 14,
    color: COLORS.verde,
    fontWeight: 'bold',
  },
  productItemSelect: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
  selectArrow: {
    fontSize: 20,
    color: COLORS.turquesa,
  },
  productCard: {
    backgroundColor: COLORS.blanco,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.turquesa,
  },
  productCardImage: {
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 6,
  },
  productCardImg: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  productCardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 5,
  },
  productCardCode: {
    fontSize: 13,
    color: '#999',
    marginBottom: 15,
  },
  productCardInfo: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.turquesa,
  },
  changeProductBtn: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  changeProductBtnText: {
    color: COLORS.negro,
    fontSize: 13,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 15,
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
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    backgroundColor: COLORS.blanco,
  },
  updateDateBtn: {
    backgroundColor: COLORS.amarillo,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  updateDateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.negro,
  },
  summaryCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.verde,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.negro,
  },
  summaryTotal: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    marginTop: 10,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.verde,
  },
  sellBtn: {
    backgroundColor: COLORS.verde,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  sellBtnText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  cancelBtnText: {
    color: COLORS.negro,
    fontSize: 14,
    fontWeight: '600',
  },
});