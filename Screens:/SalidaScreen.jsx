// screens/SalidaScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../app-inventariaje';

const API_URL = 'https://inventariaje-app.vercel.app';

export default function SalidaScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [productoBuscado, setProductoBuscado] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [descuento, setDescuento] = useState('0');
  const [cliente, setCliente] = useState('');
  const [esGratis, setEsGratis] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [mostrarScanner, setMostrarScanner] = useState(false);

  useEffect(() => {
    obtenerPermisos();
    obtenerUsuario();
  }, []);

  const obtenerPermisos = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const obtenerUsuario = async () => {
    const user = await AsyncStorage.getItem('usuario');
    setUsuario(user);
  };

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);
    setMostrarScanner(false);
    await buscarProducto(data);
  };

  const buscarProducto = async (codigo) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getProductByBarcode',
          codigo,
        }),
      });

      const data = await response.json();
      if (data.success && data.producto) {
        setProductoBuscado(data.producto);
        setCantidad('');
        setDescuento('0');
        setCliente('');
        setEsGratis(false);
      } else {
        Alert.alert('No encontrado', 'El código de barras no existe en el sistema');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo buscar el producto');
    } finally {
      setLoading(false);
    }
  };

  const calcularGanancia = () => {
    if (!productoBuscado || !cantidad) return 0;
    
    const cant = parseInt(cantidad);
    const precio = productoBuscado.precioVenta;
    const desc = parseInt(descuento) || 0;
    
    if (esGratis) return 0;
    
    const total = precio * cant;
    const conDescuento = total - (total * (desc / 100));
    const ganancia = conDescuento - (productoBuscado.costo * cant);
    
    return ganancia;
  };

  const registrarSalida = async () => {
    if (!productoBuscado || !cantidad) {
      Alert.alert('Error', 'Completa producto y cantidad');
      return;
    }

    try {
      setLoading(true);
      const cant = parseInt(cantidad);
      const precio = esGratis ? 0 : productoBuscado.precioVenta;
      const desc = esGratis ? 0 : (parseInt(descuento) || 0);
      const ganancia = calcularGanancia();

      const response = await fetch(`${API_URL}/api/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'registerSalida',
          nombre: productoBuscado.nombre,
          cantidad: cant,
          precio,
          descuento: desc,
          usuario,
          cliente: cliente || 'Sin especificar',
        }),
      });

      const data = await response.json();
      if (data.success) {
        const tipo = esGratis ? '(GRATIS)' : '';
        Alert.alert(
          '✅ Éxito',
          `Venta registrada\nProducto: ${productoBuscado.nombre}\nCantidad: ${cant}\nGanancia: $${ganancia.toFixed(2)} ${tipo}`
        );

        // Agregar al historial
        setHistorial([
          {
            nombre: productoBuscado.nombre,
            cantidad: cant,
            precio: esGratis ? 0 : precio,
            descuento: desc,
            ganancia: ganancia.toFixed(2),
            cliente,
            fecha: new Date().toLocaleDateString(),
            hora: new Date().toLocaleTimeString(),
          },
          ...historial,
        ]);

        // Limpiar
        setProductoBuscado(null);
        setCantidad('');
        setDescuento('0');
        setCliente('');
        setEsGratis(false);
        setScanned(false);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la venta');
    } finally {
      setLoading(false);
    }
  };

  if (mostrarScanner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={() => setMostrarScanner(false)}
          >
            <Ionicons name="close" size={28} color={COLORS.blanco} />
          </TouchableOpacity>
          <Text style={styles.scannerTitulo}>Escanear código</Text>
          <View style={{ width: 28 }} />
        </View>

        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={styles.scanner}
        />

        {scanned && (
          <View style={styles.scanAgain}>
            <TouchableOpacity
              style={styles.botonScanAgain}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.botonScanAgainTexto}>Escanear de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titulo}>💰 Nueva Venta</Text>
          <Text style={styles.subtitulo}>Registrar salida de productos</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.morado} />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        ) : (
          <>
            {/* Botón Scanner */}
            <TouchableOpacity
              style={styles.botonScanner}
              onPress={() => setMostrarScanner(true)}
            >
              <Ionicons name="camera" size={24} color={COLORS.blanco} />
              <Text style={styles.botonScannerTexto}>Escanear código de barras</Text>
            </TouchableOpacity>

            {/* Producto encontrado */}
            {productoBuscado && (
              <View style={styles.productoCard}>
                <View style={styles.productoHeader}>
                  <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                  <Text style={styles.productoNombre}>{productoBuscado.nombre}</Text>
                </View>

                {/* Precios */}
                <View style={styles.preciosContainer}>
                  <View style={styles.precioItem}>
                    <Text style={styles.precioLabel}>Costo:</Text>
                    <Text style={styles.precioValor}>${productoBuscado.costo.toFixed(2)}</Text>
                  </View>
                  <View style={styles.precioItem}>
                    <Text style={styles.precioLabel}>Venta:</Text>
                    <Text style={styles.precioValor}>${productoBuscado.precioVenta.toFixed(2)}</Text>
                  </View>
                  <View style={styles.precioItem}>
                    <Text style={styles.precioLabel}>Margen:</Text>
                    <Text style={[styles.precioValor, { color: '#4CAF50' }]}>
                      {(((productoBuscado.precioVenta - productoBuscado.costo) / productoBuscado.costo) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>

                {/* Cantidad */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Cantidad:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Escribe cantidad"
                    keyboardType="numeric"
                    value={cantidad}
                    onChangeText={setCantidad}
                    placeholderTextColor={COLORS.gris}
                  />
                </View>

                {/* Cliente */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Cliente (opcional):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre del cliente"
                    value={cliente}
                    onChangeText={setCliente}
                    placeholderTextColor={COLORS.gris}
                  />
                </View>

                {/* Opciones de Venta */}
                <View style={styles.opcionesContainer}>
                  <TouchableOpacity
                    style={[styles.opcion, !esGratis && styles.opcionActiva]}
                    onPress={() => setEsGratis(false)}
                  >
                    <Text style={[
                      styles.opcionTexto,
                      !esGratis && styles.opcionTextoActiva
                    ]}>
                      Venta Normal
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.opcion, esGratis && styles.opcionActiva]}
                    onPress={() => setEsGratis(true)}
                  >
                    <Text style={[
                      styles.opcionTexto,
                      esGratis && styles.opcionTextoActiva
                    ]}>
                      Gratis
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Descuento */}
                {!esGratis && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Descuento (%):</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={descuento}
                      onChangeText={setDescuento}
                      placeholderTextColor={COLORS.gris}
                    />
                  </View>
                )}

                {/* Resumen */}
                {cantidad && (
                  <View style={styles.resumenContainer}>
                    <View style={styles.resumenItem}>
                      <Text style={styles.resumenLabel}>Subtotal:</Text>
                      <Text style={styles.resumenValor}>
                        ${(productoBuscado.precioVenta * parseInt(cantidad)).toFixed(2)}
                      </Text>
                    </View>
                    {!esGratis && parseInt(descuento) > 0 && (
                      <View style={styles.resumenItem}>
                        <Text style={styles.resumenLabel}>Descuento ({descuento}%):</Text>
                        <Text style={[styles.resumenValor, { color: COLORS.rojo }]}>
                          -${(productoBuscado.precioVenta * parseInt(cantidad) * (parseInt(descuento) / 100)).toFixed(2)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.resumenDivider} />
                    <View style={styles.resumenItem}>
                      <Text style={[styles.resumenLabel, { fontWeight: 'bold' }]}>Ganancia:</Text>
                      <Text style={[styles.resumenValor, { 
                        color: calcularGanancia() > 0 ? '#4CAF50' : COLORS.rojo,
                        fontWeight: 'bold'
                      }]}>
                        ${calcularGanancia().toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Botones */}
                <View style={styles.botonesContainer}>
                  <TouchableOpacity
                    style={styles.botonCancelar}
                    onPress={() => setProductoBuscado(null)}
                  >
                    <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botonRegistrar}
                    onPress={registrarSalida}
                  >
                    <Ionicons name="checkmark" size={20} color={COLORS.blanco} />
                    <Text style={styles.botonRegistrarTexto}>Registrar Venta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Historial */}
            {historial.length > 0 && (
              <View style={styles.historialContainer}>
                <Text style={styles.historialTitulo}>📋 Últimas Ventas</Text>
                <FlatList
                  data={historial}
                  keyExtractor={(item, idx) => idx.toString()}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.historialItem}>
                      <View style={styles.historialInfo}>
                        <Text style={styles.historialProducto}>{item.nombre}</Text>
                        <Text style={styles.historialDetalle}>
                          {item.cliente} • {item.fecha}
                        </Text>
                      </View>
                      <View style={styles.historialValores}>
                        <Text style={styles.historialCantidad}>x{item.cantidad}</Text>
                        <Text style={[
                          styles.historialGanancia,
                          { color: parseFloat(item.ganancia) > 0 ? '#4CAF50' : COLORS.rojo }
                        ]}>
                          ${item.ganancia}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}

            {/* Instrucciones */}
            {!productoBuscado && (
              <View style={styles.instrucciones}>
                <Ionicons name="information-circle" size={24} color={COLORS.morado} />
                <Text style={styles.instruccionesTexto}>
                  Presiona el botón de cámara para escanear un código de barras
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.morado,
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.blanco,
    marginBottom: 5,
  },
  subtitulo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.morado,
    paddingVertical: 16,
    paddingHorizontal: 15,
  },
  botonCerrar: {
    padding: 4,
  },
  scannerTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.blanco,
  },
  scanner: {
    flex: 1,
  },
  scanAgain: {
    padding: 15,
    backgroundColor: COLORS.blanco,
  },
  botonScanAgain: {
    backgroundColor: COLORS.morado,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonScanAgainTexto: {
    color: COLORS.blanco,
    fontWeight: '600',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.negro,
    fontSize: 14,
  },
  botonScanner: {
    backgroundColor: COLORS.morado,
    marginHorizontal: 15,
    marginVertical: 15,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  botonScannerTexto: {
    color: COLORS.blanco,
    fontWeight: '600',
    marginLeft: 10,
    fontSize: 16,
  },
  productoCard: {
    backgroundColor: COLORS.blanco,
    marginHorizontal: 15,
    marginVertical: 15,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productoNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginLeft: 10,
  },
  preciosContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  precioItem: {
    flex: 1,
    backgroundColor: COLORS.gris,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  precioLabel: {
    fontSize: 11,
    color: COLORS.gris,
    marginBottom: 2,
  },
  precioValor: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.negro,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.gris,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.negro,
    borderWidth: 2,
    borderColor: COLORS.morado,
  },
  opcionesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  opcion: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: COLORS.gris,
    alignItems: 'center',
  },
  opcionActiva: {
    backgroundColor: COLORS.morado,
    borderColor: COLORS.morado,
  },
  opcionTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gris,
  },
  opcionTextoActiva: {
    color: COLORS.blanco,
  },
  resumenContainer: {
    backgroundColor: 'rgba(156,39,176,0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  resumenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resumenLabel: {
    fontSize: 13,
    color: COLORS.negro,
  },
  resumenValor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.negro,
  },
  resumenDivider: {
    height: 1,
    backgroundColor: COLORS.gris,
    marginVertical: 8,
  },
  botonesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  botonCancelar: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: COLORS.gris,
    alignItems: 'center',
  },
  botonCancelarTexto: {
    color: COLORS.gris,
    fontWeight: '600',
  },
  botonRegistrar: {
    flex: 1,
    backgroundColor: COLORS.morado,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonRegistrarTexto: {
    color: COLORS.blanco,
    fontWeight: '600',
    marginLeft: 6,
  },
  historialContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  historialTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 12,
  },
  historialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.blanco,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  historialInfo: {
    flex: 1,
  },
  historialProducto: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 2,
  },
  historialDetalle: {
    fontSize: 12,
    color: COLORS.gris,
  },
  historialValores: {
    alignItems: 'flex-end',
  },
  historialCantidad: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.morado,
    marginBottom: 2,
  },
  historialGanancia: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  instrucciones: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(156,39,176,0.1)',
    marginHorizontal: 15,
    marginVertical: 20,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  instruccionesTexto: {
    fontSize: 14,
    color: COLORS.negro,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});
