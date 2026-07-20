# Changelog - Inventariaje App
 

 ## [2.0.0] - 2026-07-20

### 🎯 Major: Arquitectura Serverless, Escalabilidad y Módulos Colaborativos
Migración de la lógica crítica al backend (Cloud Functions), reestructuración masiva del esquema de inventarios para soportar alta escalabilidad, y lanzamiento de los módulos de Intercambios y Créditos.

### ✨ Features
- **Módulo Eventos Escáner (Fase 4A)**: Implementación de `ModalRegistroEscaner` con fecha y guardado de estado `activo`/`finalizado`.
- **Módulo Créditos / CRD (Fase 4B)**: Reemplazo de "PTP" en `SalidaScreen`. Abre modal para capturar nombre, fecha y notas, registrándose paralelamente en `/salidas/` y `/creditos/`.
- **Gestión de Cobranza (`ClientesScreen`)**: Interfaz de tabla para visualizar créditos. Modal dinámico que permite registrar "Adelantos" (pagos parciales) o "Liquidación" total de la deuda.
- **Módulo de Intercambios Colaborativo**: Implementado en `SalidaScreen` (botón 🔁). Soporta selección de socio ("Con App" / "Sin App" vía `AutocompleteSearchSocios`) y cálculo automático de saldos a favor/en contra.
- **Buzón de Intercambios (`ModalExchange.jsx`)**: Componente *listener* en tiempo real (`onSnapshot`) en el HomeScreen que notifica al usuario receptor y permite aceptar/rechazar solicitudes de intercambio cruzado.
- **Feedback de Testers**: Nuevo buzón de sugerencias en el menú lateral.

### 🔧 Technical Changes
- **Cloud Functions (`crearNuevaCuenta`)**: Transición a transacciones en backend (`batch.commit()`) para crear cuentas nuevas. Previene recursión, elimina riesgo de duplicidad de ID (*race conditions*) y blinda la base de datos de escrituras del cliente.
- [cite_start]**Subcolecciones de Inventario**: Migración del esquema `productos` (antiguo mapa único límite 1MB) a subcolecciones atómicas (`/cuentas/{cuentaId}/inventarios/{productoId}`) para soportar la escalabilidad a 1000+ usuarios[cite: 5, 2].
- [cite_start]**Auth Initialization Guard**: Implementación de bandera de estado `loadingAuth` (`onAuthStateChanged`) en `AuthContext` para frenar peticiones prematuras a Firestore que provocaban errores de permisos[cite: 4].
- [cite_start]**UI & Styling Centralizado**: Creación de `context/theme.jsx` como *Single Source of Truth* para colores (`getThemeColors` Dark/Light), tipografías, el nuevo `ScreenHeader` global y gradientes (`expo-linear-gradient`)[cite: 5].
- [cite_start]**Safe Area Context**: Integración nativa de `useSafeAreaInsets` de `react-native-safe-area-context` en `HomeScreen` para evitar solapamiento visual con la barra de navegación del hardware[cite: 6].
- [cite_start]**Soporte SVG**: Integración en `metro.config.js` de `react-native-svg-transformer` para importar archivos `.svg` vectoriales[cite: 3].
- [cite_start]**Refactorización de Renders**: Optimización del JSX sacando cálculos pesados (ej. `calcularDiferenciaIntercambio()`) de las funciones anónimas autoejecutables para mejorar la velocidad[cite: 3].

### 🐛 Bug Fixes
- [cite_start]**Firestore Rules Arrays**: Corrección crítica cambiando el operador `in` por `miembros.contains()` para iterar arreglos correctamente, solucionando el bloqueo "Missing or insufficient permissions" en Analytics[cite: 4].
- [cite_start]**Inflación de Ventas del Mes**: Se añadió un filtro (`if (tipoPago !== 'crd')`) para que el "Dinero Líquido" en la caja de la HomeScreen no sume las ventas a crédito aún no pagadas[cite: 3].
- [cite_start]**Choque de Modales (Animaciones)**: Implementación de *Retraso Táctico* (`setTimeout`) en el Menú lateral para permitir el cierre total del Drawer antes de montar modales secundarios, evitando que la app se congele[cite: 3].
- **Loop Infinito en `SearchBar`**: Corrección de arreglo de dependencias en el `useEffect`, cambiando `[filteredData]` por `[searchText]` para prevenir ciclos de renderizado.

### 📋 Modified Files
- `HomeScreen.jsx`: Safe Area insets, Métricas limpias, Buzón de intercambios, *timeout* de Feedback.
- `AuthContext.js`: Integración de estado `loadingAuth` y eliminación de lógica de creación de cuentas de frontend.
- `SalidaScreen.jsx`: Integración Módulo de Intercambios optimizado y CRD.
- `ClientesScreen.jsx`: Remoción de *StyleSheets* a tema global, nueva tabla de clientes.
- `context/theme.jsx` (Nuevo): Contexto global de diseño UI.
- `components/ModalExchange.jsx` (Nuevo): Lógica y modal de buzón colaborativo.
- `functions/index.js` (Nuevo): Backend serverless para creación de cuentas.
- `firestore.rules`: Ajustes de seguridad, uso de `.contains()` y bloqueo de la colección `_config`.

### ⚠️ Breaking Changes
- La inicialización de nuevos usuarios ahora depende estrictamente de Firebase Cloud Functions (la función debe estar desplegada).
- Esquema de base de datos alterado: Las consultas a inventarios ahora apuntan a subcolecciones.
- Las reglas de seguridad bloquean toda lectura/escritura de clientes en la colección `_config`.
---

## [1.4.0] - 2026-07-10

### 🎯 Major: Tier System Hybrid Architecture
Rediseño completo del sistema de tiers con separación clara entre datos Firestore y lógica frontend.

### ✨ Features
- **Tier System Híbrido**: `premiumTrialActive` + `trialStartDate` guardados en Firestore
- **Trial de 30 días**: Cálculo frontend automático, `updateDoc()` al expirar
- **Premium Features Visible**: Escáner, Analytics, Clientes, Créditos desbloqueados para tier premium
- **Trial Info Banner**: Muestra días restantes en HomeScreen
- **MembersScreen Optimizado**: Solo descarga miembros autorizados de `cuentaId`

### 🔧 Technical Changes
- Separación clara: `cuentaId` (string ID) vs `cuenta` (documento completo)
- AuthContext pasa documento completo vía `getDoc()`
- HomeScreen usa `cuentaId` para queries, `cuenta` para datos
- Firestore Rules simplificadas (sin recursión `getCuenta()`)
- Auth SDK initialization guard: `loadingAuth` verifica antes de queries

### 🐛 Bug Fixes
- Eliminada recursión en Firestore Rules que causaba race conditions
- Resuelto timing issue: Auth SDK se inicializa async
- MembersScreen: lectura entre miembros de cuenta autorizada
- SalidasScreen, EntradasScreen, ExistenciasScreen: rutas Firestore corregidas

### 📋 Modified Files
- `AuthContext.jsx`: Exporta `cuentaId` + documento completo
- `HomeScreen.jsx`: Trial logic, tier cálculo, `loadingAuth` guard
- `MembersScreen.jsx`: Query optimizada + validación de miembros
- `SalidasScreen.jsx`, `EntradasScreen.jsx`, `ExistenciasScreen.jsx`: Rutas ajustadas
- `firestore.rules`: Gatekeepers básicos, lectura entre miembros
- `tierUtils.jsx`: Limpieza de funciones innecesarias

### 🚀 Next Phase
**Fase 4 - Módulo Eventos Escáner**: ModalRegistroEscaner + SalidasScreen integration

### ⚠️ Breaking Changes
- `cuentaId` ahora required como parámetro separado
- `cuenta` es documento completo, no solo ID
- Firestore rules requeridas para funcionar correctamente

---

## ✨ CAMBIOS EN v1.3.2
 
### 🆕 Nuevas Características
 
#### **Catálogo Expandido**
- ✅ **Nuevo producto agregado:** Collagen (barcode: 783495495154)
- ✅ Imagen asociada correctamente en '789232464094' rezised
- ✅ Barcode y archivo sincronizados
---
- ✅ Datos sincronizados en Firebase catalogoGlobal
- ✅ Disponible en ExistenciasScreen y SalidaScreen
---
 
### 🔧 Ajustes
 
#### **HomeScreen - Simplificación**
- 🔇 Sección "Registro de Escáner" **comentada temporalmente**
  - Deferred para Fase 4.a completa
  - Modal ModalRegistroEscaner.jsx se mantiene en components/ para futuro uso
  - Funciones helper (cargarEscanerActual, handleConfirmarEscaner, etc) removidas de render
#### **app.json**
- Version: `1.3.1` → `1.3.2`
- iOS buildNumber: `4` → `5`
- Android versionCode: `4` → `5`
---

 
## 📊 Estado del Producto
 
```
Características Estables (v1.3.1):
├── ✅ Dashboard (3 cards: existencias, sin stock, ventas)
├── ✅ ExistenciasScreen (búsqueda, filtros, ordenamiento)
├── ✅ EntradaScreen (agregar productos)
├── ✅ SalidaScreen (vender productos)
├── ✅ MembersScreen (gestión de usuarios)
├── ✅ ConfiguranzaScreen (dark mode, preferencias)
├── ✅ AnalyticsScreen (reportes básicos)
└── ✅ Catálogo de 32+ productos (actualizado)
└── ✅ Modo oscuro
 
Características en Desarrollo:
├── 🔇 Fase 4.a: Registro de Escáner (deferred)
├── ⏳ Fase 4.b: Analytics Avanzado
├── ⏳ Fase 5: PTP + WhatsApp Alerts
└── ⏳ Fase 6: Backoffice API Integration
```
 
---
 
## 📝 Notas de Desarrollo
 
### **Archivo HomeScreen.jsx**
- **Ahora:** HomeScreen-v1.3.1.jsx (sin escáner, oculto para siguiente release)
- **Ruta:** `screens/HomeScreen.jsx`


 
---
## [v1.3.0] - 2026-06-25

### 🎉 Nuevas Características
- Multi-user management (crear, suspender, eliminar usuarios)
- Toast notifications (automáticas, sin click)
- Dark mode completo en todos los screens
- Sistema de notas en Existencias

### ✨ Mejoras
- Optimized inventory system (entrada/salida)
- Security: user suspension/deletion flags
- Firestore Rules mejoradas
- Validación de estructura de datos

### 🐛 Bug Fixes
- Firebase Rules validation
- Sort filters en ExistenciasScreen
- Dark mode en SalidaScreen, EntradaScreen
- Carga de productos correcta
- Cantidad de inventario visible

### 📦 Cambios Técnicos
- Migración a Firestore completa
- isMountedRef para memory leaks
- Mejor manejo de AsyncStorage
- Componente Toast reutilizable

---

## [v1.2.0] - 2026-06-24

### 🎉 Nuevas Características
- Sistema multi-usuario básico
- Entrada y salida de inventario
- Registro de ventas

### 🐛 Bug Fixes
- Permisos de Firebase
- Estructura de datos en Firestore

---

## [v1.1.0] - 2026-06-20

### 🎉 Inicial
- Autenticación con Firebase
- Catálogo de productos
- Inventario simple
