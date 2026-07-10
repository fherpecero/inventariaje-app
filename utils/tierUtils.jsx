import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
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
    // Paso 1: Obtener documento de la cuenta
    const cuentaDocRef = doc(db, 'cuentas', cuentaId.toString());
    const cuentaDocSnap = await getDoc(cuentaDocRef);

    if (!cuentaDocSnap.exists()) {
      console.warn(`⚠️ Cuenta ${cuentaId} no encontrada en Firestore`);
      await AsyncStorage.setItem('userTier', 'basic');
      return 'basic';
    }

    // Paso 2: Extraer tier del documento
    // Si el campo 'tier' no existe, default a 'basic'
    const tierValue = cuentaDocSnap.data().tier || 'basic';

    // Validar que sea un tier válido
    const validTiers = ['basic', 'premium'];
    const tier = validTiers.includes(tierValue) ? tierValue : 'basic';

    // Paso 3: Guardar en AsyncStorage (cache para acceso rápido)
    await AsyncStorage.setItem('userTier', tier);

    console.log(`✅ Tier cargado: ${tier} para cuenta ${cuentaId}`);
    return tier;
  } catch (error) {
    console.error('❌ Error fetching tier:', error);
    // Fallback seguro a 'basic'
    await AsyncStorage.setItem('userTier', 'basic');
    return 'basic';
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2️⃣ FUNCIÓN: Obtener tier del cache (sin llamar Firestore)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * EDUCACIÓN: Esta función SOLO lee el cache (AsyncStorage)
 * 
 * ¿Cuándo usarla?
 * - En condicionales de renderizado (mostrar/ocultar botones)
 * - Durante interacción del usuario (verificación rápida)
 * - NO para verificaciones de seguridad (usa Firestore Rules para eso)
 * 
 * ¿Por qué es rápida?
 * No hace llamadas a internet, lee de memoria local
 */
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

/**
 * Función de conveniencia para preguntar:
 * "¿Puede el usuario acceder a esto?"
 * 
 * MATRIZ DE ACCESO (Tabla de Verdad):
 * 
 * Feature      | Basic | Premium
 * ─────────────┼───────┼─────────
 * entrada      |  ✅   |   ✅
 * salida       |  ✅   |   ✅
 * existencias  |  ✅   |   ✅
 * bajo-stock   |  ✅   |   ✅
 * scanner      |  ❌   |   ✅
 * analytics    |  ❌   |   ✅
 * clientes     |  ❌   |   ✅
 */
export const hasAccessToFeature = async (featureName) => {
  const tier = await getTierFromCache();

  // Matriz de features disponibles por tier
  // Formato: 'feature': ['tier1', 'tier2']
  const featureMatrix = {
    // Features BASIC (todos tienen acceso)
    'entrada': ['basic', 'premium'],
    'entradas': ['basic', 'premium'],
    'salida': ['basic', 'premium'],
    'salidas': ['basic', 'premium'],
    'existencias': ['basic', 'premium'],
    'bajo-stock': ['basic', 'premium'],
    'bajo_stock': ['basic', 'premium'],
    'scannerEvents': { basic: false, premium: true }, 
    
    // Features PREMIUM (solo premium)
    'scanner': ['premium'],
    'escaner': ['premium'],
    'eventos': ['premium'],
    'analytics': ['premium'],
    'clientes': ['premium'],
    'creditos': ['premium'],
    'alertas': ['premium'],  
    'scannerEvents': { basic: false, premium: true }, 
  };

  const allowedTiers = featureMatrix[featureName] || [];
  const hasAccess = allowedTiers.includes(tier);

  console.log(`🔍 hasAccessToFeature('${featureName}'): ${hasAccess} (tier: ${tier})`);
  return hasAccess;
};

// ═══════════════════════════════════════════════════════════════════════════
// 4️⃣ FUNCIÓN: Información detallada del tier actual
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Retorna información completa del tier actual
 * 
 * ÚTIL PARA:
 * - Screens de upgrade (mostrar qué tiene cada tier)
 * - Debugging (verificar qué tier tiene el usuario)
 * - Settings screen (mostrar tu plan actual)
 */
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

export const calculateEffectiveTier = (tier, premiumTrialActive, trialStartDate) => {
  // Sin tier, retorna basic
  if (!tier) return 'basic';
  
  // Si no está en trial, retorna tier del documento
  if (!premiumTrialActive) return tier;
  
  // Si está en trial, verificar si expiró
  if (trialStartDate) {
    const now = new Date();
    const endDate = new Date(trialStartDate);
    endDate.setDate(endDate.getDate() + 30);
    
    return now < endDate ? 'premium' : tier;
  }
  
  return tier;
};

// ═══════════════════════════════════════════════════════════════════════════
// 5️⃣ FUNCIÓN: Obtener tier actual (para debugging/logging)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Simple función para obtener el string del tier actual
 * 
 * ÚTIL PARA:
 * - Logging y debugging
 * - Condicionales en código
 * - Testing
 */
export const getCurrentTier = async () => {
  return await getTierFromCache();
};

/**
 * Obtiene información del trial
 * 
 * Retorna:
 * - isActive: boolean (¿trial sigue válido?)
 * - daysRemaining: número de días
 * - expiresAt: fecha de expiración
 * - startDate: cuándo empezó
 */
export const getTrialInfo = async (uid) => {
  try {
    const userDocRef = doc(db, 'usuarios', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return null;
    }

    const userData = userDocSnap.data();
    const { trialStartDate, trialEndDate, isTrialActive } = userData;

    if (!isTrialActive || !trialEndDate) {
      return null;
    }

    const now = new Date();
    const endDate = new Date(trialEndDate);
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return {
      isActive: now < endDate,
      daysRemaining: Math.max(0, daysRemaining),
      expiresAt: endDate,
      startDate: new Date(trialStartDate),
    };
  } catch (error) {
    console.error('❌ Error getting trial info:', error);
    return null;
  }
};

/**
 * Inicia trial de 30 días
 * 
 * Se llama cuando un usuario se registra por primera vez
 * Automáticamente pone tier='premium' y calcula fecha de expiración
 */
export const startTrialPeriod = async (uid) => {
  try {
    const now = new Date();
    // Sumar 30 días a la fecha actual
    const trialEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const userDocRef = doc(db, 'usuarios', uid);
    
    await updateDoc(userDocRef, {
      tier: 'premium',                    // ← Comienza en premium
      isTrialActive: true,                // ← Trial activo
      trialStartDate: now,                // ← Cuándo empezó
      trialEndDate: trialEndDate,         // ← Cuándo termina
      updatedAt: now
    });

    console.log(`🎁 Trial iniciado para ${uid}. Válido hasta: ${trialEndDate.toLocaleDateString()}`);
    return trialEndDate;
  } catch (error) {
    console.error('❌ Error iniciando trial:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 6️⃣ FUNCIÓN: Limpiar cache (para logout o testing)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * EDUCACIÓN: Borra el tier del cache
 * 
 * CUÁNDO USARLA:
 * - En la función logout (limpiar datos del usuario)
 * - En testing
 * - Cuando usuario cambia de cuenta
 */
export const clearTierCache = async () => {
  try {
    await AsyncStorage.removeItem('userTier');
    console.log('✅ Tier cache cleared');
  } catch (error) {
    console.error('❌ Error clearing tier cache:', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR TODO
// ═══════════════════════════════════════════════════════════════════════════

export default {
  fetchAndCacheTier,
  getTierFromCache,
  hasAccessToFeature,
  getTierInfo,
  getCurrentTier,
  clearTierCache,
  calculateEffectiveTier,  // ← AGREGAR AQUÍ
  getTrialInfo,            // ← AGREGAR AQUÍ
  startTrialPeriod,        // ← AGREGAR AQUÍ
};
