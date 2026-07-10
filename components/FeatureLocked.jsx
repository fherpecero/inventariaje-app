/**
 * 🎓 EDUCACIÓN: Componente para mostrar features premium bloqueadas
 * 
 * USO:
 * <FeatureLocked 
 *   icon="📱"
 *   title="Escáner"
 *   description="Escanea códigos QR y códigos de barras"
 * />
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const COLORS = {
  locked: '#F5F5F5',
  border: '#E0E0E0',
  text: '#999',
  icon: '#FFA726',
};

export default function FeatureLocked({ 
  icon = '🔒', 
  title = 'Feature Premium', 
  description = 'Haz upgrade a tu plan para tener acceso',
  onUpgradePress 
}) {
  return (
    <View style={styles.container}>
      {/* Header con ícono y título */}
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Descripción de la feature */}
      {description && (
        <Text style={styles.featureDescription}>{description}</Text>
      )}

      {/* Línea divisoria */}
      <View style={styles.divider} />

      {/* Leyenda de upgrade */}
      <Text style={styles.upgradeText}>
        Haz upgrade a tu plan para tener acceso a estas funciones
      </Text>

      {/* Botón Upgrade (opcional) */}
      {onUpgradePress && (
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={onUpgradePress}
        >
          <Text style={styles.upgradeButtonText}>Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.locked,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 24,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  featureDescription: {
    fontSize: 13,
    color: '#999',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  upgradeText: {
    fontSize: 12,
    color: COLORS.text,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
  },
  upgradeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});