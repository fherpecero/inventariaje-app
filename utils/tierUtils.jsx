import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // Asegurado updateDoc
import { db } from '../config/firebase';

// ═══════════════════════════════════════════════════════════════════════════
// 1️⃣ FUNCIÓN PRINCIPAL: Obtener tier desde Firestore y cachear
// ═══════════════════════════════════════════════════════════════════════════

export const fetchAndCacheTier = async (cuentaId) => {
  if (!cuentaId) {
    console.warn('⚠️ fetchAndCacheTier: No cuentaId provided');
    await AsyncStorage.setItem('userTier', 'basic');
    return 'basic';
  }

  try {
    const cuentaDocRef = doc(db, 'cuentas', cuentaId.toString());
    const cuentaDocSnap = await getDoc(cuentaDocRef);

    if (!cuentaDocSnap.exists()) {
      console.warn(`⚠️ Cuenta ${cuentaId} no encontrada en Firestore`);
      await AsyncStorage.setItem('userTier', 'basic');
      return 'basic';
    }

    const tierValue = cuentaDocSnap.data().tier || 'basic';
    const validTiers = ['basic', 'premium'];
    const tier = validTiers.includes(tierValue) ? tierValue : 'basic';

    await AsyncStorage.setItem('userTier', tier);
    console.log(`✅ Tier cargado: ${tier} para cuenta ${cuentaId}`);
    return tier;
  } catch (error) {
    console.error('❌ Error fetching tier:', error);
    await AsyncStorage.setItem('userTier', 'basic');
    return 'basic';
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2️⃣ FUNCIÓN: Obtener tier del cache (sin llamar Firestore)
// ═══════════════════════════════════════════════════════════════════════════

export const getTierFromCache = async () => {
  try {
    const tier = await AsyncStorage.getItem('userTier');
    return tier || 'basic';
  } catch (error) {
    console.error('❌ Error reading tier from cache:', error);
    return 'basic';
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 3️⃣ FUNCIÓN: Verificar si usuario tiene acceso a una feature
// ═══════════════════════════════════════════════════════════════════════════

export const hasAccessToFeature = async (featureName) => {
  const tier = await getTierFromCache();

  const featureMatrix = {
    'entrada': ['basic', 'premium'],
    'entradas': ['basic', 'premium'],
    'salida': ['basic', 'premium'],
    'salidas': ['basic', 'premium'],
    'existencias': ['basic', 'premium'],
    'bajo-stock': ['basic', 'premium'],
    'bajo_stock': ['basic', 'premium'],
    
    // Features PREMIUM
    'scanner': ['premium'],
    'escaner': ['premium'],
    'eventos': ['premium'],
    'analytics': ['premium'],
    'clientes': ['premium'],
    'creditos': ['premium'],
    'alertas': ['premium'],  
    'scannerEvents': ['premium'], 
  };

  const allowedTiers = featureMatrix[featureName] || [];
  const hasAccess = allowedTiers.includes(tier);

  console.log(`🔍 hasAccessToFeature('${featureName}'): ${hasAccess} (tier: ${tier})`);
  return hasAccess;
};

// ═══════════════════════════════════════════════════════════════════════════
// 4️⃣ FUNCIÓN: Información detallada del tier actual
// ═══════════════════════════════════════════════════════════════════════════

export const getTierInfo = async () => {
  const tier = await getTierFromCache();

  const tierInfo = {
    basic: {
      name: 'Basic',
      price: 'Pago único',
      description: 'Versión básica de InventariAJE',
      features: [
        '✅ Registrar entradas',
        '✅ Registrar salidas',
        '✅ Ver existencias',
        '✅ Alertas de bajo stock',
      ],
      icon: '📦',
    },
    premium: {
      name: 'Premium',
      price: 'Acceso completo',
      description: 'Todas las features avanzadas',
      features: [
        '✅ Registrar entradas',
        '✅ Registrar salidas',
        '✅ Ver existencias',
        '✅ Alertas de bajo stock',
        '✅ Escáner QR/Barcode',
        '✅ Analytics y reportes',
        '✅ Gestión de clientes',
        '✅ Futuras mejoras',
      ],
      icon: '🚀',
    },
  };

  return tierInfo[tier] || tierInfo.basic;
};

// ═══════════════════════════════════════════════════════════════════════════
// 5️⃣ FUNCIONES DE CÁLCULO DE TRIAL Y TIER ACTIVO (BLINDADAS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🛡️ BLINDADA: Calcula el tier efectivo interpretando Fechas y Timestamps
 */
export const calculateEffectiveTier = (tier, premiumTrialActive, trialStartDate) => {
  // 1. Si la cuenta ya fue pagada como 'premium', es inamovible
  if (tier === 'premium') return 'premium';

  // 2. Si no hay trial activo o fecha, cae a basic
  if (!premiumTrialActive || !trialStartDate) return 'basic';

  try {
    // 3. Normalizar la fecha (Firestore Timestamp vs JS Date vs String)
    let fechaInicio;
    if (trialStartDate?.toDate && typeof trialStartDate.toDate === 'function') {
      fechaInicio = trialStartDate.toDate(); // Es Timestamp de Firestore
    } else if (trialStartDate?.seconds) {
      fechaInicio = new Date(trialStartDate.seconds * 1000); // Es Timestamp crudo
    } else {
      fechaInicio = new Date(trialStartDate); // Es String ISO
    }

    const startMs = fechaInicio.getTime();
    const nowMs = new Date().getTime();

    // 4. Protección contra fecha corrupta
    if (isNaN(startMs)) return 'basic'; 

    // 5. Diferencia en días
    const diffDays = (nowMs - startMs) / (1000 * 60 * 60 * 24);

    // 6. Trial válido (30 días estrictos)
    if (diffDays >= 0 && diffDays <= 30) {
      return 'premium';
    }

    // Trial expirado
    return 'basic';
  } catch (error) {
    console.error("❌ Error calculando effectiveTier:", error);
    return 'basic';
  }
};

export const getCurrentTier = async () => {
  return await getTierFromCache();
};

/**
 * 🛡️ BLINDADA: Retorna días restantes del Trial leyendo la "Cuenta" (no el uid)
 */
export const getTrialInfo = async (cuentaId) => {
  if (!cuentaId) return null;

  try {
    const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
    const cuentaSnap = await getDoc(cuentaRef);

    if (!cuentaSnap.exists()) return null;

    const data = cuentaSnap.data();
    const { trialStartDate, premiumTrialActive } = data;

    // Si no está el trial activo
    if (!premiumTrialActive || !trialStartDate) return null;

    // Normalizar la fecha
    let fechaInicio;
    if (trialStartDate?.toDate && typeof trialStartDate.toDate === 'function') {
      fechaInicio = trialStartDate.toDate(); 
    } else if (trialStartDate?.seconds) {
      fechaInicio = new Date(trialStartDate.seconds * 1000); 
    } else {
      fechaInicio = new Date(trialStartDate); 
    }

    if (isNaN(fechaInicio.getTime())) return null;

    const endDate = new Date(fechaInicio.getTime() + (30 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return {
      isActive: now < endDate,
      daysRemaining: Math.max(0, daysRemaining),
      expiresAt: endDate,
      startDate: fechaInicio,
    };
  } catch (error) {
    console.error('❌ Error getting trial info:', error);
    return null;
  }
};

/**
 * Inicia trial de 30 días en el documento de CUENTA
 */
export const startTrialPeriod = async (cuentaId) => {
  if (!cuentaId) throw new Error("Se requiere cuentaId para iniciar trial");

  try {
    const now = new Date();
    const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
    
    await updateDoc(cuentaRef, {
      tier: 'basic',                      // Tier base
      premiumTrialActive: true,           // Flag de trial encendido
      trialStartDate: now.toISOString(),  // Formato universal y seguro
      updatedAt: now.toISOString()
    });

    console.log(`🎁 Trial de 30 días iniciado para cuenta ${cuentaId}`);
    return true;
  } catch (error) {
    console.error('❌ Error iniciando trial en cuenta:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 6️⃣ FUNCIÓN: Limpiar cache
// ═══════════════════════════════════════════════════════════════════════════

export const clearTierCache = async () => {
  try {
    await AsyncStorage.removeItem('userTier');
    console.log('✅ Tier cache cleared');
  } catch (error) {
    console.error('❌ Error clearing tier cache:', error);
  }
};

export default {
  fetchAndCacheTier,
  getTierFromCache,
  hasAccessToFeature,
  getTierInfo,
  getCurrentTier,
  clearTierCache,
  calculateEffectiveTier, 
  getTrialInfo,            
  startTrialPeriod,       
};