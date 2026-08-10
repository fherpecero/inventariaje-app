import React, { useState } from 'react';
// ✅ DEBE QUEDAR ASÍ:
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, GLOBAL_STYLES, COLORS } from '../context/theme'; // Ajusta tus importaciones


// ==========================================
// Componente de Tarjeta Desplegable (Accordion)
// ==========================================
const AccordionItem = ({ title, icon, children, themeColors }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  return (
    <View style={[styles.accordionContainer, { backgroundColor: themeColors.cardBg || COLORS.blanco }]}>
      <TouchableOpacity 
        style={styles.accordionHeader} 
        onPress={toggleOpen}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.iconText, { color: themeColors.text }]}>{icon}</Text>
          <Text style={[styles.accordionTitle, { color: themeColors.text }]}>{title}</Text>
        </View>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={themeColors.text} 
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.accordionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

// ==========================================
// Pantalla Principal de Ayuda
// ==========================================
export default function HelpScreen({ onNavigate, themeColors }) {
  
  // Componente de texto para estandarizar párrafos
  const P = ({ children }) => <Text style={[styles.paragraph, { color: themeColors.subText }]}>{children}</Text>;
  const Bullet = ({ children }) => <Text style={[styles.bullet, { color: themeColors.subText }]}>• {children}</Text>;

  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      <ScreenHeader 
        title="Guia de Usuario" 
        onPress={() => onNavigate('home')} 
        themeColors={themeColors} 
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.mainWelcome, { color: themeColors.text }]}>
        Conviertete en un experto con esta guía rápida.
        </Text>
        <Text style={[styles.subWelcome, { color: themeColors.subText }]}>
          Toca cualquier sección para saber más.
        </Text>

        {/* ================= SECCIÓN 1 ================= */}
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Manejo de Inventario</Text>
        
        <AccordionItem title="Agregar productos" icon="📦" themeColors={themeColors}>
          <P>Registra aquí la mercancía nueva que recibes.</P>
          <Bullet>El carrito: Elige los productos, se van a una lista temporal, y al final revisas y confirma.</Bullet>
          <Bullet>Bono Influencer: Si aprovechaste tu Bono Influencer para adquirir nuevos productos, marca la casilla. El sistema sabrá calcular el margen de ganancia.</Bullet>
        </AccordionItem>

        <AccordionItem title="Ventas" icon="💲" themeColors={themeColors}>
          <P>Registra todo lo que sale de tu inventario (ventas, cambios, consumo propio o cortesías).</P>
          <Bullet>Intercambios: Si cambias producto con un socio, selecciona primero el producto que das a cambio, después mas abajo selecciona de la lista el o los productos que recibirás a cambio. Si hay alguna diferencia de valor, puedes registrar quién pagó la diferencia o si quedó a deber, o bien, puedes dejarlo como saldo pendiente para un proximo intercambio.</Bullet>
          <Bullet>Cortesías y Descuentos: Si ofreces algún descuento en la venta (paquetes o promociones especiales), agrega el porcentaje en la casilla y automaticamente registrará la venta con el ajuste. Si tomaste un producto para tu consumo personal, solo aplica el 100% de descuento y se descontará de tu inventario sin impactar tus registros financieros</Bullet>
          <Bullet>Bono Influencer: Marca esta casilla cuando quieras registrar salida de un producto que adquiriste bajo Bono Influencer, de esta forma tu inventario te mostrará cuantas piezas a precio especial tienes disponibles.</Bullet>
          <Bullet>Créditos: Si entregas el producto pero te lo pagarán después, elige "Crédito". Se guardará en tu sección de Créditos automáticamente.</Bullet>
        </AccordionItem>

        <AccordionItem title="Existencias" icon="📊" themeColors={themeColors}>
          <P>Es tu vitrina virtual para saber cuánta mercancía tienes disponible. Una vez que lo registres desde "Agregar" lo verás aquí.</P>
          <Bullet>Filtro de búsqueda: Escribe el producto directamente en la barra para ver los resultados.</Bullet>
          <Bullet>Botones de Filtro Inteligentes: Ordena los productos por nombre, por cantidad o por descuento, los productos registrados como Bono Influencer aparecerán aqui.</Bullet>
          <Bullet>Notas: Puedes agregar notas o recordatorios a cada producto para tener información adicional. (éstas no afectan ni modifican la cantidad de existencias)</Bullet>
        </AccordionItem>

       {/* ================= SECCIÓN 2 ================= */}
        <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 25 }]}>Administración y Gestión</Text>

        <AccordionItem title="Créditos (⭐ Premium)" icon="💳" themeColors={themeColors}>
          <P>Ofrece facilidades de pago a tus clientes sin perder el control.</P>
          <Bullet>Mira quién te debe, cuánto y para cuándo. Registra pagos parciales o liquida deudas fácilmente.</Bullet>
        </AccordionItem>

        <AccordionItem title="Registro de Escáner (⭐ Premium)" icon="💻" themeColors={themeColors}>
          <P>Lleva el detalle de tus Scanner Parties o individuales.</P>
          <Bullet>Crea un evento para registrar la fecha, cantidad de invitados, monto cobrado y cuantos escaneos cobraste.</Bullet>
          <Bullet>Mientras el evento esté activo, todo lo que vendas se agrupará ahí para saber cuánto ganaste ese día. ¡Recuerda cerrarlo al terminar!</Bullet>
        </AccordionItem>

        <AccordionItem title="Reportes / Analytics (⭐ Premium)" icon="📈" themeColors={themeColors}>
          <P>Un panel integral donde verás tus ventas totales, ganancias reales y productos estrella por periodos. También puedes descargar este reporte a tu teléfono.</P>
          <Bullet>Ventas Totales: El ingreso bruto generado exclusivamente por las salidas regulares de inventario (ventas directas).</Bullet>
          <Bullet>Costo de restock: Total de costos ingresados por inventario, considera los descuentos y Bono Influencer</Bullet>
          <Bullet>Eventos de Escaner: Monto cobrado por escaneos (sin contar venta de producto)</Bullet>
          <Bullet>Flujo de Efectivo: La liquidez de tu negocio en ese período de tiempo. Considera cobros de escaner, ventas totales y descuenta los gastos de inventario (Ojo: Este es el único KPI que puede dar negativo. Si hoy no vendiste nada ($0) pero compraste producto por $5,000, tu flujo de efectivo será de -$5,000)</Bullet>
          <Bullet>Margen de Ganancia: Es la rentabilidad, resultado del monto cobrado menos el costo real del producto (incluyendo descuentos).</Bullet>          
          <Bullet>Cortesías: Costo del producto ofrecido de forma gratuita o usado como consumo personal</Bullet>
          <Bullet>Bonos Consumidos: Costo de los productos de Bono Influencer que salieron del inventario</Bullet>
        </AccordionItem>

        <AccordionItem title="Configuración" icon="⚙️" themeColors={themeColors}>
          <P>Ajustes de tu cuenta personal.</P>
          <Bullet>Encuentra tus datos de perfil, numero de cuenta y nivel de tu cuenta. Puedes cambiar tu nombre de usuario sin afectar tu acceso.</Bullet>
          <Bullet>Usuarios: Si trabajas en equipo con otros usuarios, agrega sus correos aquí para que usen la app. Tienes el control total para pausarles el acceso o borrarlos cuando quieras.</Bullet>
        </AccordionItem>

        {/* ================= SECCIÓN 3 ================= */}
        <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 25 }]}>Soporte</Text>

        <AccordionItem title="Dudas y Comentarios" icon="💬" themeColors={themeColors}>
          <P>¿Encontraste un error o tienes alguna sugerencia?</P>
          <Bullet>Escríbenos directamente. Leemos todos tus mensajes y nos ayudan a mejorar la aplicación para ti. Puedes hacerlo a traves del modulo de feedback en el menu de opciones o a traves de correo electronico a hello.inventariaje@gmail.com</Bullet>
        </AccordionItem>

      </ScrollView>
    </View>
  );
}

// ==========================================
// Estilos (Limpios, minimalistas y con respiración)
// ==========================================
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20, // 👈 Este es el secreto para que no se vea pegado a las orillas
    paddingTop: 15,
    paddingBottom: 40,
  },
  mainWelcome: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 5,
  },
  subWelcome: {
    fontSize: 14,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 5,
    opacity: 0.6,
  },
  accordionContainer: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    // Sombra muy sutil para dar aspecto de tarjeta
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1, 
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
    marginRight: 10,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  accordionContent: {
    paddingHorizontal: 15,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 15,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 22,
    marginLeft: 5,
    marginBottom: 5,
  }
});