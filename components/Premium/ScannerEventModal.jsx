import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ScannerEventModal({ visible, onClose, cuentaId, onEventCreated }) {
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [invitados, setInvitados] = useState('1');
  const [escaneos, setEscaneos] = useState('1');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculamos venta total dinámicamente
  const escaneoNum = parseInt(escaneos) || 0;
  const montoNum = parseFloat(monto) || 0;
  const ventaTotal = escaneoNum * montoNum;

  // Manejador de fecha
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFecha(selectedDate);
    }
  };

  // Guardar evento en Firestore
  const handleGuardar = async () => {
    // Validaciones básicas
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del evento es requerido');
      return;
    }
    if (ventaTotal <= 0) {
      Alert.alert('Error', 'La venta total debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, `cuentas/${cuentaId}/scannerEvents`), {
        nombre: nombre.trim(),
        fecha: fecha.toISOString(), // ISO string para consistencia
        fechaFormato: fecha.toLocaleDateString('es-MX'), // Para mostrar en UI
        invitados: parseInt(invitados) || 0,
        escaneos: escaneoNum,
        montoEscaneo: montoNum,
        ventaTotal: ventaTotal,
        createdAt: serverTimestamp(),
        scannerEventId: docRef.id, // Capturo el ID aquí (se sobrescribe después)
      });

      // Actualizo con el ID correcto
      await updateDoc(doc(db, `cuentas/${cuentaId}/scannerEvents`, docRef.id), {
        scannerEventId: docRef.id,
      });

      Alert.alert('Éxito', `Evento "${nombre}" registrado`);
      onEventCreated?.();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error guardando evento de escáner:', error);
      Alert.alert('Error', 'No se pudo guardar el evento');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setFecha(new Date());
    setInvitados('1');
    setEscaneos('1');
    setMonto('');
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Registrar Evento de Escáner</Text>

          <ScrollView style={styles.form}>
            {/* Nombre del evento */}
            <View style={styles.field}>
              <Text style={styles.label}>Nombre del evento</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Expo Salud 2026"
                value={nombre}
                onChangeText={setNombre}
                placeholderTextColor="#ccc"
              />
            </View>

            {/* Fecha */}
            <View style={styles.field}>
              <Text style={styles.label}>Fecha</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {fecha.toLocaleDateString('es-MX')}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={fecha}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Invitados y Escaneos en una fila */}
            <View style={styles.row}>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Invitados</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  value={invitados}
                  onChangeText={setInvitados}
                  keyboardType="numeric"
                  placeholderTextColor="#ccc"
                />
              </View>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Escaneos</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  value={escaneos}
                  onChangeText={setEscaneos}
                  keyboardType="numeric"
                  placeholderTextColor="#ccc"
                />
              </View>
            </View>

            {/* Monto por escaneo */}
            <View style={styles.field}>
              <Text style={styles.label}>Monto por escaneo ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={monto}
                onChangeText={setMonto}
                keyboardType="decimal-pad"
                placeholderTextColor="#ccc"
              />
            </View>

            {/* Venta Total (calculada, solo lectura) */}
            <View style={styles.totalField}>
              <Text style={styles.label}>Venta Total</Text>
              <View style={styles.totalBox}>
                <Text style={styles.totalText}>
                  ${ventaTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Botones */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleGuardar}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  form: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  field: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfField: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
  },
  totalField: {
    marginTop: 20,
  },
  totalBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  buttons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});