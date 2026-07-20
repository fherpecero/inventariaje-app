/**
 * AutocompleteSearchSocios - Busca socios (titulares) en tiempo real
 * 
 * Qué hace:
 * - Input que filtra cuentas mientras escribes
 * - Busca por nombre EXACTO del titular (cuentaNombre)
 * - Busca también por cuentaId (ej: 10001)
 * - Dropdown visual con resultados
 * - Retorna: { cuentaId, cuentaNombre } al seleccionar
 * 
 * Uso:
 * <AutocompleteSearchSocios 
 *   onSelect={(socio) => setSocio(socio)}
 *   value={socioSeleccionado}
 * />
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';

const COLORS = {
  turquesa: '#24c5c5',
  gris: '#f5f5f5',
  blanco: '#fff',
  negro: '#000',
  rojo: '#f44336',
};

export default function AutocompleteSearchSocios({ onSelect, value = '' }) {
  const { cuentaId } = useContext(AuthContext);
  
  const [inputValue, setInputValue] = useState(value);
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allCuentas, setAllCuentas] = useState([]);
  const [tab, setTab] = useState('app'); // 'app' | 'manual'
  const [nombreManual, setNombreManual] = useState('');

  // ==========================================
  // FUNCIÓN: Cargar todas las cuentas (una sola vez)
  // ==========================================
  useEffect(() => {
    const cargarCuentas = async () => {
      try {
        setLoading(true);
        const cuentasRef = collection(db, 'cuentas');
        const snapshot = await getDocs(cuentasRef);
        
        const cuentas = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              ...data,
              cuentaId: doc.id,
              cuentaNombre: data.nombre || 'Sin nombre',
          };
         })
          .filter(c => c.cuentaId !== cuentaId.toString()); // Excluir cuenta actual
        
        setAllCuentas(cuentas);
        console.log(`✅ Cargadas ${cuentas.length} cuentas`);
      } catch (error) {
        console.error('❌ Error cargando cuentas:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarCuentas();
  }, [cuentaId]);

  // ==========================================
  // FUNCIÓN: Filtrar socios (Blindaje de Privacidad)
  // ==========================================
  const handleSearch = (text) => {
    setInputValue(text);
    
    const query = text.trim().toLowerCase();

    // 1. Si borran todo, ocultamos el menú
    if (!query) {
      setSugerencias([]);
      setShowDropdown(false);
      return;
    }

    // 2. Evaluamos si el usuario está escribiendo un ID (solo números) o un Nombre
    const esSoloNumeros = /^\d+$/.test(query);
    let filtradas = [];

    if (esSoloNumeros) {
      // 🔒 REGLA DE PRIVACIDAD: Si es número, buscar SOLO si tiene exactamente 5 dígitos (ID completo)
      if (query.length === 5) {
        filtradas = allCuentas.filter(cuenta => cuenta.cuentaId.toString() === query);
        setShowDropdown(true);
      } else {
        // Si tiene 1, 2, 3 o 4 números, no mostramos nada
        setSugerencias([]);
        setShowDropdown(false);
        return;
      }
    } else {
      // 🔒 REGLA DE PRIVACIDAD: Si son letras, buscar SOLO si ha escrito 3 o más caracteres
      if (query.length >= 3) {
        filtradas = allCuentas.filter(cuenta => 
          cuenta.cuentaNombre.toLowerCase().includes(query)
        );
        setShowDropdown(true);
      } else {
        // Si tiene 1 o 2 letras, no mostramos nada
        setSugerencias([]);
        setShowDropdown(false);
        return;
      }
    }

    setSugerencias(filtradas.slice(0, 5)); // Máximo 5 resultados para no saturar la pantalla
  };

  // ==========================================
  // FUNCIÓN: Al seleccionar un socio de la app
  // ==========================================
  const handleSelect = (socio) => {
    setInputValue(`${socio.cuentaId} ${socio.cuentaNombre}`);
    setShowDropdown(false);
    setSugerencias([]);
    onSelect({ 
      ...socio,
      esManual: false 
    }); // Notifica al padre
  };

  // ==========================================
  // FUNCIÓN: Guardar socio manual (sin app)
  // ==========================================
  const handleSelectManual = () => {
    if (!nombreManual.trim()) {
      alert('Ingresa el nombre del socio');
      return;
    }
    
    setInputValue(nombreManual);
    setTab('app'); // Vuelve a tab de app
    onSelect({
      cuentaId: null, // Sin ID en Firestore
      cuentaNombre: nombreManual,
      esManual: true // Marcador de socio manual
    });
    setNombreManual('');
  };

  // ==========================================
  // FUNCIÓN: Limpiar búsqueda
  // ==========================================
  const clearSearch = () => {
    setInputValue('');
    setSugerencias([]);
    setShowDropdown(false);
    onSelect(null);
  };

  // ==========================================
  // RENDERIZADOR: Cada sugerencia
  // ==========================================
  const renderSugerencia = ({ item }) => (
    <TouchableOpacity
      style={styles.sugerenciaItem}
      onPress={() => handleSelect(item)}
    >
      <View>
        <Text style={styles.sugerenciaNombre}>{item.cuentaNombre}</Text>
        <Text style={styles.sugerenciaId}>ID: {item.cuentaId}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tabs: App | Manual */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'app' && styles.tabActive]}
          onPress={() => setTab('app')}
        >
          <Text style={[styles.tabText, tab === 'app' && styles.tabTextActive]}>
            📱 Con App
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'manual' && styles.tabActive]}
          onPress={() => setTab('manual')}
        >
          <Text style={[styles.tabText, tab === 'manual' && styles.tabTextActive]}>
            ✏️ Sin App
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB: CON APP */}
      {tab === 'app' && (
        <>
          {/* Input */}
          <View style={styles.inputContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#999"
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder="Buscar socio (nombre o ID)..."
          value={inputValue}
          onChangeText={handleSearch}
          onFocus={() => inputValue && setShowDropdown(true)}
          placeholderTextColor="#bbb"
        />
        {inputValue ? (
          <TouchableOpacity onPress={clearSearch} style={styles.clearIcon}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Dropdown de sugerencias */}
      {showDropdown && sugerencias.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={sugerencias}
            renderItem={renderSugerencia}
            keyExtractor={(item) => item.cuentaId.toString()}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Mensaje: Sin resultados */}
      {showDropdown && inputValue && sugerencias.length === 0 && !loading && (
        <View style={styles.dropdown}>
          <Text style={styles.noResultados}>
            No se encontraron socios
          </Text>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.turquesa} />
        </View>
      )}
        </>
      )}

      {/* TAB: SIN APP */}
      {tab === 'manual' && (
        <View style={styles.manualContainer}>
          <Text style={styles.manualLabel}>
            Ingresa el nombre del socio (sin app):
          </Text>
          <TextInput
            style={styles.manualInput}
            placeholder="Ej: Juan García - Veracruz"
            value={nombreManual}
            onChangeText={setNombreManual}
            placeholderTextColor="#bbb"
          />
          <TouchableOpacity
            style={styles.manualButton}
            onPress={handleSelectManual}
          >
            <Text style={styles.manualButtonText}>✅ Guardar socio</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gris,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.turquesa,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    marginLeft: 8,
    color: COLORS.negro,
  },
  icon: {
    marginRight: 4,
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: COLORS.blanco,
    borderWidth: 1,
    borderColor: COLORS.turquesa,
    borderRadius: 8,
    zIndex: 1000,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sugerenciaItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sugerenciaNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 2,
  },
  sugerenciaId: {
    fontSize: 12,
    color: '#999',
  },
  noResultados: {
    paddingHorizontal: 12,
    paddingVertical: 15,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  tabActive: {
    borderColor: COLORS.turquesa,
    backgroundColor: '#e0f7fa',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: COLORS.turquesa,
  },
  manualContainer: {
    paddingVertical: 12,
  },
  manualLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 10,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.blanco,
    marginBottom: 10,
    color: COLORS.negro,
  },
  manualButton: {
    backgroundColor: COLORS.turquesa,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualButtonText: {
    color: COLORS.blanco,
    fontSize: 14,
    fontWeight: 'bold',
  },
});