import React, { useState, useMemo, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  turquesa: '#24c5c5',
  gris: '#f5f5f5',
};

/**
 * SearchBar - Componente para filtrar listas
 * @param {Array} data - Array de items a filtrar
 * @param {Function} onSearch - Callback con datos filtrados
 * @param {Array} searchKeys - Campos a buscar (default: ['nombre', 'codigo'])
 */
const SearchBar = ({ data, onSearch, searchKeys = ['nombre', 'codigo'] }) => {
  const [searchText, setSearchText] = useState('');

  // Filtrar en tiempo real (memoizado)
  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data;
    
    const query = searchText.toLowerCase();
    return data.filter(item =>
      searchKeys.some(key => 
        (item[key]?.toString() || '').toLowerCase().includes(query)
      )
    );
  }, [searchText, data, searchKeys]);

  // ✅ Notificar SOLO cuando searchText cambia, no cuando data cambia
  useEffect(() => {
    onSearch(filteredData);
  }, [searchText]);

  const clearSearch = () => setSearchText('');

  return (
    <View style={styles.container}>
      <Ionicons 
        name="search" 
        size={18} 
        color="#999" 
        style={styles.icon} 
      />
      <TextInput
        style={styles.input}
        placeholder="Buscar por nombre o código..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#bbb"
      />
      {searchText ? (
        <TouchableOpacity onPress={clearSearch} style={styles.clearIcon}>
          <Ionicons name="close-circle" size={18} color="#999" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gris,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.turquesa,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
  },
  icon: {
    marginRight: 4,
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
});

export default SearchBar;   