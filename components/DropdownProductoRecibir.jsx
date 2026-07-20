/**
 * DropdownProductoRecibir - Selecciona producto a RECIBIR en intercambio
 * 
 * Qué hace:
 * - Dropdown con todos los productos activos del catálogo
 * - Muestra nombre + precio de venta
 * - Retorna: { codigo, nombre, precioVentaStandard } al seleccionar
 * 
 * Uso:
 * <DropdownProductoRecibir 
 *   onSelect={(producto) => setProductoRecibir(producto)}
 *   value={productoSeleccionado}
 * />
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getProductosActivos,
  getNombreProducto,
  getPrecioVenta
} from '../context/productCatalog';

const COLORS = {
  turquesa: '#24c5c5',
  gris: '#f5f5f5',
  blanco: '#fff',
  negro: '#000',
};

export default function DropdownProductoRecibir({ onSelect, value = null }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [productosActivos] = useState(getProductosActivos());
  
  // Filtrar productos según búsqueda
  const productosFiltrados = searchText.trim() === ''
    ? productosActivos
    : productosActivos.filter(p =>
        p.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchText.toLowerCase())
      );

  const handleSelect = (producto) => {
    onSelect({
      codigo: producto.codigo,
      nombre: producto.nombre,
      precioVentaStandard: producto.precioVentaStandard,
    });
    setModalVisible(false);
    setSearchText('');
  };

  return (
    <View style={styles.container}>
      {/* Botón que abre dropdown */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.buttonLabel}>
            {value ? value.nombre : 'Selecciona producto a recibir'}
          </Text>
          {value && (
            <Text style={styles.buttonPrecio}>
              ${value.precioVentaStandard}
            </Text>
          )}
        </View>
        <Ionicons
          name="chevron-down"
          size={20}
          color={COLORS.turquesa}
        />
      </TouchableOpacity>

      {/* Modal: Lista de productos */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setSearchText('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Título */}
            <Text style={styles.modalTitle}>
              Selecciona producto a RECIBIR
            </Text>

            {/* SearchBar dentro del modal */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={18}
                color="#999"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o código..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#bbb"
                autoFocus
              />
              {searchText && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Lista de productos */}
            <FlatList
              data={productosFiltrados}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productoItem}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.productoInfo}>
                    <Text style={styles.productoNombre}>
                      {item.nombre}
                    </Text>
                    <Text style={styles.productoCodigo}>
                      Código: {item.codigo}
                    </Text>
                  </View>
                  <Text style={styles.productoPrecio}>
                    ${item.precioVentaStandard}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.codigo}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={styles.noResultados}>
                  No se encontraron productos
                </Text>
              }
            />

            {/* Botón cerrar */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                setSearchText('');
              }}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.blanco,
  },
  buttonContent: {
    flex: 1,
  },
  buttonLabel: {
    fontSize: 14,
    color: COLORS.negro,
    fontWeight: '500',
    marginBottom: 2,
  },
  buttonPrecio: {
    fontSize: 12,
    color: COLORS.turquesa,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.blanco,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 15,
    maxHeight: '85%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 15,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.turquesa,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: COLORS.gris,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.negro,
  },
  productoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  productoInfo: {
    flex: 1,
  },
  productoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 3,
  },
  productoCodigo: {
    fontSize: 11,
    color: '#999',
  },
  productoPrecio: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.turquesa,
    marginLeft: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  noResultados: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  closeButton: {
    backgroundColor: COLORS.turquesa,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  closeButtonText: {
    color: COLORS.blanco,
    fontSize: 14,
    fontWeight: 'bold',
  },
});