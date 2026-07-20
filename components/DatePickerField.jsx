import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = {
  turquesa: '#24c5c5',
  negro: '#000',
  blanco: '#fff',
};

export default function DatePickerField({
  label,
  value,
  onDateChange, // Renombrado para evitar confusiones
  minimumDate,
  containerStyle,
  inputStyle,
  labelStyle,
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 🛡️ BLINDAJE: Si 'value' se corrompe, usa la fecha de hoy por defecto
  const fechaSegura = value instanceof Date ? value : new Date();

  const handleChange = (event, selectedDate) => {
    // 1. Android: Cerramos el modal instantáneamente al tocar cualquier cosa
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    // 2. Solo guardamos si el usuario presionó 'OK' y existe la fecha
    if (event.type === 'set' && selectedDate) {
      onDateChange(selectedDate);
    }
  };

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={labelStyle || styles.label}>
          {label}
        </Text>
      ) : null}

      {/* Botón para abrir picker */}
      <TouchableOpacity
        style={inputStyle || styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.inputText}>
          {fechaSegura.toLocaleDateString('es-MX')}
        </Text>
      </TouchableOpacity>

      {/* 🍎 VERSIÓN iOS: Requiere un Modal y diseño de "Spinner" */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.acceptButtonText}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={fechaSegura}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* 🤖 VERSIÓN ANDROID: Abre su propia ventana nativa flotante */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={fechaSegura}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
}

const styles = {
  label: { fontSize: 14, fontWeight: '600', color: COLORS.negro, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, justifyContent: 'center', backgroundColor: COLORS.blanco },
  inputText: { fontSize: 16, color: COLORS.negro },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: COLORS.blanco, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 20 },
  iosHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  acceptButtonText: { color: COLORS.turquesa, fontWeight: 'bold', fontSize: 16 },
};