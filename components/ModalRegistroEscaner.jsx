import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import DatePickerField from '../components/DatePickerField';

const COLORS = {
  turquesa: '#24c5c5',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojito: '#f97272',
  naranja: '#FF9800',
};

/**
 * ModalRegistroEscaner
 * Modal para crear o editar eventos de escáner biométrico
 * 
 * Props:
 * - visible: boolean - Controla visibilidad del modal
 * - onClose: function - Callback al cerrar
 * - onSuccess: function - Callback cuando se guarda exitosamente
 * - cuentaId: string - ID de la cuenta
 * - eventoEdicion: object - Evento a editar (null si es crear nuevo)
 */
const ModalRegistroEscaner = ({ visible, onClose, onSuccess, cuentaId, eventoEdicion = null }) => {
  const [evento, setEvento] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [fechaFormato, setFechaFormato] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [personas, setPersonas] = useState(0);
  const [escaneos, setEscaneos] = useState(0);
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);

  // Calcular total automático
  const total = parseInt(escaneos || 0) * parseFloat(monto || 0);

  /**
   * Cargar datos del evento si estamos editando
   */
  useEffect(() => {
    if (visible && eventoEdicion) {
      // Modo edición: cargar datos del evento
      console.log('📝 Cargando evento para editar:', eventoEdicion.evento);
      setEvento(eventoEdicion.evento);
      setFechaFormato(eventoEdicion.fecha);
      setFecha(new Date(eventoEdicion.fechaISO));
      setPersonas(eventoEdicion.personas);
      setEscaneos(eventoEdicion.escaneos);
      setMonto(eventoEdicion.montoCobrado.toString());
    } else if (visible && !eventoEdicion) {
      // Modo crear: limpiar formulario
      console.log('🆕 Nuevo evento - limpiando formulario');
      resetForm();
    }
  }, [visible, eventoEdicion]);

  /**
   * Validar campos antes de guardar
   */
  const validarCampos = () => {
    if (!evento.trim()) {
      Alert.alert('Error', 'El nombre del evento es requerido');
      return false;
    }
    if (!fechaFormato) {
      Alert.alert('Error', 'La fecha es requerida');
      return false;
    }
    if (escaneos < 0 || personas < 0) {
      Alert.alert('Error', 'Las cantidades no pueden ser negativas');
      return false;
    }
    if (monto && parseFloat(monto) < 0) {
      Alert.alert('Error', 'El monto no puede ser negativo');
      return false;
    }
    return true;
  };

  /**
   * Guardar o actualizar evento en Firestore
   */
  const guardarEvento = async () => {
    if (!validarCampos()) return;

    try {
      setLoading(true);

      const ahora = new Date();
      const fechaISO = new Date(fechaFormato + 'T00:00:00Z').toISOString();

      // Datos del evento
      const eventoData = {
        evento: evento.trim(),
        fecha: fechaFormato,
        fechaISO: fechaISO,
        personas: parseInt(personas) || 0,
        escaneos: parseInt(escaneos) || 0,
        montoCobrado: parseFloat(monto) || 0,
        ventaTotal: total,
        estado: 'activo',
        updatedAt: ahora.toISOString(),
      };

      if (eventoEdicion) {
        // MODO EDICIÓN: Actualizar documento existente
        console.log('✏️ Actualizando evento:', eventoEdicion.id);
        
        const eventoRef = doc(db, 'cuentas', cuentaId.toString(), 'escaneres', eventoEdicion.id);
        await updateDoc(eventoRef, eventoData);

        console.log('✅ Evento actualizado');
        
        // Limpiar form y notificar
        resetForm();
        onClose();
        
        if (onSuccess) {
          onSuccess({ ...eventoData, id: eventoEdicion.id });
        }
        
        Alert.alert('✅ Éxito', `Evento "${evento}" actualizado correctamente`);
      } else {
        // MODO CREAR: Crear nuevo documento
        console.log('📌 Guardando evento nuevo');

        const eventoDataNuevo = {
          ...eventoData,
          createdAt: ahora.toISOString(),
        };

        // Guardar en Firestore
        const escanerRef = collection(db, 'cuentas', cuentaId.toString(), 'escaneres');
        const docRef = await addDoc(escanerRef, eventoDataNuevo);

        console.log('✅ Evento guardado con ID:', docRef.id);
        
        // Limpiar form y notificar
        resetForm();
        onClose();
        
        if (onSuccess) {
          onSuccess({ ...eventoDataNuevo, id: docRef.id });
        }
        
        Alert.alert('✅ Éxito', `Evento "${evento}" creado correctamente`);
      }
    } catch (error) {
      console.error('❌ Error guardando evento:', error);
      Alert.alert('Error', 'No se pudo guardar el evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Limpiar formulario
   */
  const resetForm = () => {
    setEvento('');
    setFecha(new Date());
    setFechaFormato(new Date().toISOString().split('T')[0]);
    setPersonas(0);
    setEscaneos(0);
    setMonto('');
  };

  /**
   * Cerrar modal
   */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  /**
   * Incrementar/decrementar valores
   */
  const incrementar = (setter, valor) => {
    setter(Math.max(0, valor + 1));
  };

  const decrementar = (setter, valor) => {
    setter(Math.max(0, valor - 1));
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {eventoEdicion ? '✏️ Editar Evento' : '💻 Crear Evento de Escáner'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* CONTENIDO SCROLLEABLE */}
          <ScrollView 
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* NOMBRE DEL EVENTO */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre del evento/cliente:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Scanner Party Lola"
                value={evento}
                onChangeText={setEvento}
                editable={!loading}
              />
            </View>

            {/* IMPLEMENTACION HOMOLOGADA */}
            <DatePickerField
            label="Fecha del evento:"
            value={fecha}
            onDateChange={(nuevaFecha) => {
              setFecha(nuevaFecha);
              // Sigues conservando tu formato de string para Firestore
              const formattedDate = nuevaFecha.toISOString().split('T')[0];
              setFechaFormato(formattedDate);
            }}
            containerStyle={styles.formGroup}
          />

            {/* DATE PICKER */}
            {showDatePicker && (
              <DateTimePicker
                value={fecha}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onValueChange={(selectedDate) => {
                  setFecha(selectedDate);
                  const formattedDate = selectedDate.toISOString().split('T')[0];
                  setFechaFormato(formattedDate);
                }}
                onDismiss={() => setShowDatePicker(false)}
              />
            )}

            {/* PERSONAS Y ESCANEOS EN UNA LÍNEA */}
            <View style={styles.doubleFormGroup}>
              {/* INVITADOS */}
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Invitados al evento:</Text>
                <View style={styles.counterContainerHorizontal}>
                  <TouchableOpacity
                    style={styles.counterBtnSmall}
                    onPress={() => decrementar(setPersonas, personas)}
                    disabled={loading}
                  >
                    <Text style={styles.counterBtnText}>−</Text>
                  </TouchableOpacity>

                  <Text style={styles.counterValueHorizontal}>{personas}</Text>

                  <TouchableOpacity
                    style={styles.counterBtnSmall}
                    onPress={() => incrementar(setPersonas, personas)}
                    disabled={loading}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ESCANEOS */}
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Escaneos cobrados:</Text>
                <View style={styles.counterContainerHorizontal}>
                  <TouchableOpacity
                    style={styles.counterBtnSmall}
                    onPress={() => decrementar(setEscaneos, escaneos)}
                    disabled={loading}
                  >
                    <Text style={styles.counterBtnText}>−</Text>
                  </TouchableOpacity>

                  <Text style={styles.counterValueHorizontal}>{escaneos}</Text>

                  <TouchableOpacity
                    style={styles.counterBtnSmall}
                    onPress={() => incrementar(setEscaneos, escaneos)}
                    disabled={loading}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* MONTO COBRADO */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Monto por escaneo ($):</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={monto}
                onChangeText={setMonto}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>

            {/* TOTAL CALCULADO */}
            <View style={styles.totalBox}>
              <View style={styles.totalRowFinal}>
                <Text style={styles.totalLabelFinal}>TOTAL INGRESO:</Text>
                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.totalRowFinal}>
                <Text style={styles.totalLabelFinal}>Las ventas registradas durante el evento se vincularán automáticamente a los reportes de Analytics.</Text>
              </View>

            {/* ESPACIADOR */}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* BOTONES (Fuera del scroll) */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, loading && styles.disabledBtn]}
              onPress={guardarEvento}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.blanco} />
              ) : (
                <Text style={styles.acceptBtnText}>
                  {eventoEdicion ? '✏️ Actualizar' : 'Crear Evento'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.blanco,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gris,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.negro,
  },
  closeBtn: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.negro,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  doubleFormGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formGroupHalf: {
    flex: 1,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontStyle: 'italic',
    backgroundColor: COLORS.gris,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.gris,
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
  },
  counterContainerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  counterBtnSmall: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: COLORS.turquesa,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.blanco,
  },
  counterValueHorizontal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.turquesa,
    minWidth: 40,
    textAlign: 'center',
  },
  totalBox: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.naranja,
    borderRadius: 8,
    padding: 14,
    marginVertical: 16,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabelFinal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.negro,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.naranja,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.rojito,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.verde,
    borderRadius: 8,
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

export default ModalRegistroEscaner;