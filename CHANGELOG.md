# Changelog - Inventariaje App

##### [2.5.3] - 2026-09-14
**🚀 Core Refactor: Single Source of Truth & Analytics Optimization**

**🔧 Arquitectura y Cambios Técnicos**
* **Centralización SST (Single Source of Truth):** El "Cerebro Matemático" de la aplicación fue extraído por completo de la interfaz gráfica. Todos los cálculos financieros de KPIs (Ganancias, Flujo de Efectivo, Gastos y Rankings) ahora viven de forma exclusiva en `businessRules.js`.
* **Desacoplamiento UI / Lógica:** `AnalyticsScreen` fue refactorizada para actuar puramente como capa de presentación. Ahora solo consume la regla central para dibujar las tarjetas y gráficas, manteniendo la métrica de latencia visual de 0ms sin ahogar la memoria del dispositivo.
* **Mantenibilidad Global:** Las reglas operativas como la RN-09 (Cálculo de Ganancia) y la RN-03 (Trazabilidad Inmutable del Costo) ahora se controlan desde un solo punto. Un cambio en la lógica de bonos o cortesías se propagará automáticamente a todas las pantallas de reportes.
* **Preparación para Auditoría:** Estructura preparada para la inyección de Puntos de Control (Logs) que permitirán rastrear con exactitud milimétrica la latencia de las consultas a Firebase.

##### [2.5.2] - 2026-09-07
**🚀 Hotfix: UI Polish, Checkout Optimization & Play Store Prep**

**✨ Interfaz de Checkout (SalidasScreen)**
* **Rediseño del Cobro:** Se reestructuró la interfaz de venta normal. Los contenedores de "Descuento" y "Bono Influencer" ahora comparten una sola fila alineada horizontalmente de manera simétrica (50/50).
* **Armonía Vertical:** Se unificaron los márgenes (`marginBottom: 15`) en todos los bloques del checkout para un scroll limpio y predecible.
* **Reparación de Totales:** Se solucionó el desbordamiento de la línea con gradiente inyectando el componente DRY `GradientDivider` y forzando la caja de totales a comportarse en columna, evitando que los textos se aplasten.

**🔧 Correcciones Previas a Producción (Bug Fixes)**
* **Módulo de Intercambios:** El cálculo de precios en intercambios se modificó para que ahora utilice correctamente el costo de compra en lugar del precio de venta[cite: 17].
* **UI Intercambios:** Se alineó de forma absoluta el tag de "intercambio" para que flote correctamente bajo el botón en el Header[cite: 17].
* **Visibilidad del Sistema (Header):** Se reparó el error visual donde la hora, fecha, batería y WiFi del teléfono desaparecían por renderizarse en color blanco sobre un fondo blanco[cite: 17].
* **Modal Escáner:** Se integró un nuevo disclaimer en color rojo sobre las ventas en evento[cite: 17].
* **Modal Escáner (Layout):** Se arregló el `bottom padding` para que el contenido no quede aplastado contra el borde inferior en teléfonos modernos[cite: 17].
* **Modal Créditos (Teclado):** Se solucionó el fallo del teclado estático; ahora el scroll permite ver correctamente lo que se está escribiendo sin obstruir la pantalla[cite: 17].

##### [2.5.1] - 2026-09-01
**🚀 QA Release: Gestión de Suscripciones, Reportes Financieros y UI Fixes**

**✨ Nuevas Funcionalidades & UX**
* **Gestión de Suscripciones (Settings):** Se integró el botón "Administrar Suscripción" con Deep Link directo a Google Play Store, protegido por validación de roles (visible únicamente para Administradores de la cuenta).
* **Historial de Abonos (Créditos):** El módulo de clientes ahora guarda un recibo individual por cada pago mediante `arrayUnion`, mejorando la trazabilidad de la deuda[cite: 1].

**📊 Mejoras en Reportes y Analytics**
* **Módulo de Créditos:** El CSV ahora calcula y exporta la "Deuda Inicial", "Total Abonado" y un historial detallado de pagos con fechas[cite: 1].
* **Reporte de Ventas:** Los abonos de crédito ya reflejan el nombre real del cliente en el CSV, eliminando el error de "Público General"[cite: 1].
* **Gasto en Restock:** Se añadieron las columnas de `Bono Influencer` y `Orden de Proveedor`, además de limpiar el formato de fechas[cite: 1].
* **Eventos de Escáner:** Se incorporaron las columnas de "Total de escáneres cobrados" y el "Monto monetario recaudado"[cite: 1].
* **UI de Vista Previa:** Se limpió la interfaz del generador para mostrar únicamente el número de registros encontrados[cite: 1].

**🐛 Bug Fixes y Estabilidad (Corrección de Errores)**
* **ExistenciasScreen:** Solucionado el fallo que mostraba todos los productos y el filtro de "sin stock" en 0. Se corrigió el crash (cierre de app) al guardar notas de producto[cite: 1].
* **EntradasScreen:** Se restauraron las imágenes de los productos, se arregló el margen superior (top padding) y se activó el scroll en el resumen de checkout. También se solucionó el error de permisos denegados al confirmar la compra[cite: 1].
* **ClientesScreen:** Los créditos ahora se ordenan cronológicamente por su fecha de vencimiento en la vista principal[cite: 1].
* **SalidasScreen:** Se optimizó el tiempo de carga inicial en modo offline y se agregó la tarjeta de "Bajo Stock" para unificar el diseño con el Dashboard[cite: 1].
* **Ajustes Visuales Menores:** Corrección del top padding en el menú lateral de HomeScreen y ajuste del tamaño tipográfico en las cajas de texto de AlertasScreen[cite: 1].

##### [2.5.0] - 2026-08-24
**🚀 Parche Major: Arquitectura Offline-First, Interfaz y Estabilidad de Reportes**

**✨ Nuevas Funcionalidades & UX**
* **Funciones Premium Visibles (Paywalling)**: Las funciones premium (Analytics, Créditos, etc.) ahora son visibles para usuarios básicos en el menú y pantalla de inicio, pero con acceso bloqueado y redirección estratégica a la pantalla de Upgrade[cite: 11].
* **Centro de Ayuda Mejorado**: Rediseño visual de la guía de uso con textos en negritas para una lectura rápida y un botón interactivo (enlace) que abre directamente la aplicación de correo del usuario[cite: 11].
* **Botón de Intercambio Restringido**: La funcionalidad de intercambios se trasladó de forma exclusiva al tier 'special k' y Premium[cite: 11].
* **Mejoras en Reportes CSV**:
  * El reporte de compras ahora incluye un desglose avanzado de "Precio Unitario" y "Descuento" aplicado por producto[cite: 11].
  * Se añadió una tabla especializada para el registro de monto diferencial en Intercambios[cite: 11].
  * Se actualizó el texto del botón de exportación a "Guardar en Drive / Compartir" para reflejar con exactitud la acción nativa del dispositivo[cite: 11].

**🔧 Cambios Técnicos (Arquitectura)**
* **Motor Offline-First**: Refactorización profunda en `HomeScreen` y `ClientesScreen` implementando `onSnapshot` (túneles locales), `writeBatch` y `getDocFromCache`[cite: 9, 16]. La app ahora es resiliente y puede operar bajo condiciones de nula o mala conexión a internet[cite: 11].
* **Refactorización DRY (Don't Repeat Yourself)**: Limpieza exhaustiva de estilos en pantallas clave (`HomeScreen`, `EntradasScreen`, `ExistenciasScreen`), centralizando contenedores globales y componentes estandarizados como `ScreenHeader` y `cardBase`[cite: 16, 18].
* **Carga Optimizada de CSV**: Se implementó un micro-retraso (`setTimeout`) acompañado de un `ActivityIndicator` para evitar que la interfaz parezca congelada (delay de 5-8 segs) durante la extracción de datos de Firebase[cite: 11].

**🐛 Bug Fixes (Corrección de Errores)**
* **Crash en CSV de Créditos**: Se integró un blindaje de prevención (`safeString`) contra variables nulas o indefinidas que provocaban un cierre forzoso ("Inventariaje continua fallando") al intentar exportar créditos sin nombre de cliente[cite: 11].
* **Fechas "Invalid Date"**: Se corrigió el fallo de registro de fechas en créditos implementando el formateador `formatFechaPTPLocal` para asegurar el envío de formatos ISO a la base de datos[cite: 9, 11].
* **Métricas de Escáner en 0**: Solucionado el fallo del `addDoc` en `HomeScreen` que enviaba estadísticas en ceros. Ahora inyecta correctamente el ID del evento, invitados y montos cobrados a la base de datos[cite: 9, 11].
* **Ordenamiento en Analytics**: Los movimientos en los reportes de ventas y ganancias ahora se listan cronológicamente de forma correcta de más recientes a antiguos usando un cálculo matemático (`.sort()`)[cite: 11].
* **Cortesías Ocultas**: Se eliminó el filtro estricto de descuento (100%) para que los reportes por fin reflejen correctamente las salidas de inventario hechas por cortesía[cite: 11].
* **Modal de Checkout (EntradasScreen)**: Se reparó el comportamiento del `ScrollView` ajustando su altura máxima, evitando que los botones de "Confirmar" sean empujados fuera de la pantalla en carritos grandes[cite: 11].
* **Desfase por Teclado**: Se envolvió el modal de `ClientesScreen` en un `KeyboardAvoidingView` para que la lista de productos no se deforme al abrir el teclado al abonar dinero[cite: 11].
* **Usabilidad de Botones en Créditos**: Se hizo toda la fila de la tarjeta de crédito presillable (pressable), permitiendo al usuario abrir el modal de abonos tocando cualquier parte de la fila y no solo el nombre[cite: 11].
* **Textos Ajustados**: Se reemplazó el texto estático de "bazares" por "Evento de Escáner" para mejorar el tono profesional de la app[cite: 11, 16].

### version: "2.4.0" - fecha: "2026-08-10",
    titulo: "Notificaciones, Alertas y Experiencia Premium",
    descripcion: "Una de las actualizaciones más grandes en UX. Integración de un Centro de Notificaciones In-App, control de stock automatizado y nuevas herramientas para usuarios PRO.",
    cambios: [
      "✨ NUEVO: Centro de Notificaciones In-App unificado en HomeScreen.",
      "✨ NUEVO: Módulo de Alertas de Stock (Exclusivo Premium) para fijar mínimos por producto.",
      "✨ NUEVO: Pantalla 'HelpScreen' rediseñada como centro de soporte y manuales interactivos.",
      "✨ NUEVO: Pantalla 'UpgradeScreen' añadida para comparar beneficios del plan Básico vs Premium.",
      "⚡ MEJORA: El menú lateral fue rediseñado usando una cuadrícula (Grid) y opacidad para funciones no disponibles.",
      "⚡ MEJORA: Algoritmo de 'Búsqueda Flexible' en inventarios que escanea por Código, ID o Nombre para prevenir errores de lectura.",
      "⚡ MEJORA: Sistema de avisos automatizado en HomeScreen para créditos vencidos o a punto de vencer.",
      "⚡ MEJORA: Alerta inteligente en el Centro de Notificaciones cuando faltan 5, 3 y 1 día para expirar el Trial.",
      "🛠️ FIX: Corrección de error de base de datos que generaba campos 'undefined' en inventario.",
      "🛠️ FIX: Actualización de importaciones y variables huérfanas en el sistema de navegación."
    ]


### [2.3.3] - 2026-08-03
Hotfix & UI/UX Optimization
- Refactorización Financiera en EntradaScreen.jsx
- Blindaje Numérico (Anti-Crash)
- Mejora de reportes: Corrección de Costos en "Bono Influencer| cortesias"
Bugs
- Fix: Carga Infinita en First Launch
- Fix: Carga Infinita por Credenciales Inválidas
- UI Fix: Enhancement & ScrollView en Entradas
- Fix app name on splash
- Trazabilidad de Errores (Google Play Console)

### [2.3.2] - 2026-07-31
- Refactorización del Modelo de Datos: Eliminación definitiva de la colección redundante usuariosCuenta.
- Aplanamiento de Datos (NoSQL): Centralización de los campos rol y cuentaId directamente en el documento raíz de la colección usuarios.
- Optimización de Consultas (Reads): Reducción del 50% en las lecturas de Firestore necesarias para validar perfiles y permisos de acceso.
- Optimización de Escrituras (Writes): Refactorización del flujo de registro de administradores y socios, inyectando el cuentaId previo a la inserción para eliminar dobles operaciones (updateDoc) y reducir costos operativos.
- Ventas: descuento de inventario al consumir bono influencer
- Update Catalog: Nourish+ & Performance+ agregados
- Bug Fix: Boton de agregar carrito visible



[2.3.1] - 2026-07-30
🚀 Parche de Interfaz y Estabilidad

✨ Nuevo: Botón para mostrar/ocultar contraseñas en pantallas de Login y Registro.

🐛 Corregido: Botones de retroceso (Back) ya son visibles y funcionales en Configuración y Miembros.

🐛 Corregido: Solucionada la pantalla de carga infinita (congelada) al instalar la app por primera vez.

🐛 Corregido: Arreglado el margen inferior aplastado en el modal del Escáner.

🐛 Corregido: Eliminado el bug de "eventos activos fantasma" limpiando el caché al finalizar.

🔧 Técnico: Configurada la limpieza de caché (--clear-cache) para forzar la actualización del nuevo ícono de la app.

### [2.3.0] - 2026-07-29

- 🎯 Major: Analytics Dashboard, Data Visualization & Report Exporting
Transformación total del módulo de métricas, incorporando gráficas interactivas, integración de ingresos por eventos y motor de exportación contable.

### ✨ Features

- Gráficos Visuales (Data Visualization): Integración de react-native-chart-kit para renderizar la "Curva de Ingresos" (Line Chart) dinámica de los últimos 7 días y la "Composición del Top 5" (Pie Chart) con los colores de la marca.

- Exportación CSV (Reportes Contables): Nuevo botón en el Header nativo que compila las operaciones filtradas (Ventas, Entradas, Cortesías y Bonos) en un archivo .csv y abre el Share Sheet nativo del teléfono para enviarlo por WhatsApp o Email.

- Módulo de Eventos en Analytics: Tarjeta dedicada a "Eventos de Escáner" integrada perfectamente al cálculo central del Flujo Libre (Ganancia Neta).

- Cálculo Dinámico de Restock: EntradaScreen ahora calcula el margen de ahorro extra y el porcentaje de descuento en tiempo real al sobreescribir el costo total final.

### 🔧 Technical Changes

- Consultas Asíncronas Simultáneas: AnalyticsScreen usa Promise.all para consultar y combinar arreglos de las colecciones salidas, entradas y escaneres en un solo paso optimizado.

- Refactorización DRY (Don't Repeat Yourself): Reestructuración de estilos en AnalyticsScreen utilizando baseCard para herencia de UI y uso del componente centralizado <ScreenHeader>.

- Soporte Legacy FileSystem: Migración de expo-file-system a su ruta /legacy para garantizar soporte con las nuevas directivas del SDK 52+ de Expo.

### Nuevas Dependencias: 
- Instalación de react-native-chart-kit, react-native-svg, expo-file-system y expo-sharing.

### 🐛 Bug Fixes

- Fallas de Sincronización en KPIs: Corregido el Cerebro Matemático de Analytics que daba $0 en gastos debido a discrepancias en el nombrado de campos de Firestore (fecha vs timestamp vs createdAt y costoBase vs costoPagado).


### 📋 Modified Files

- screens/AnalyticsScreen.jsx
- screens/EntradaScreen.jsx
- screens/SalidaScreen.jsx
- package.json / app.json (Nuevas dependencias)

- Registro de costos optimizado: Agregado boton de bono influencer con logica de calculo de costos y ventas mejorado
- Filtro de Existencias: agregar productos con descuento 


## [2.2.1] - 2026-07-25
 ### BUG CORRECTION
 -Keyboard overlay on modal
 -New logo update
 -User management Architechture optimization



## [2.1.1] - 2026-07-22

### 🎯 Major: Módulo de Inversión y Restock (Entry Cost)
Rediseño completo del flujo de entrada de inventario para rastrear el gasto real (Costo Base) y capturar márgenes de ganancia basados en descuentos de distribuidor/socio.

### ✨ Features
- **Nuevo Modelo de Pedidos (`EntradasScreen`)**: Transición de registro de un solo producto a un modelo de "Carrito de Pedido" (similar a `SalidasScreen`).
- **Cálculo Automático de Costos**: Integración con `context/productCatalog.jsx` para leer el `precioCostoStandard` y calcular automáticamente la inversión total del pedido por defecto.
- **Captura de Descuentos Inteligente**: Campo de total editable. Si el socio ingresa un total pagado menor al costo estándar, el sistema calcula y registra automáticamente el `% de descuento aplicado`.
- **Folios de Entrada**: Generación de IDs numéricos ascendentes para registrar las órdenes de compra formalmente.
- **Integración Financiera**: Los gastos de restock ahora se envían a la base de datos de Analytics para medir los márgenes de ganancia reales contra el "Dinero Líquido" de las ventas.

### 🔧 Technical Changes & Security
- **Catálogo Local**: Se optimizó la lectura del costo usando la fuente de verdad local (`productCatalog`) en lugar de hacer consultas costosas (reads) a `CatalogoGlobal` en Firestore.
- **Firestore Rules Update**: Se reestructuró la validación `hasAll([...])` en la colección de `/entradas/`. Ahora Firestore exige la estructura del \"Ticket de Carrito\" (`productos` [array], `fecha`, `costoBase`, `descuentoAplicado`, `registradoPor`, `folio`).
- **Transacciones Seguras**: Permisos actualizados en Firestore Rules para permitir que el cliente escriba el \"documento espejo\" en la subcolección de `analytics` sin romper el principio de seguridad.

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
├── ✅ ConfiguraciónScreen (dark mode, preferencias)
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
