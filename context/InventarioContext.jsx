import React, { createContext, useState, useEffect, useContext } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from './AuthContext';
import { getProductosActivos } from './productCatalog';

// 1. Inicialización del Contexto
export const InventarioContext = createContext();

export const InventarioProvider = ({ children }) => {
  const { user, cuenta, cuentaId } = useContext(AuthContext);
  const [inventarioGlobal, setInventarioGlobal] = useState([]);
  const [loadingInventario, setLoadingInventario] = useState(true);

  // 2. El Motor Único de Sincronización
  useEffect(() => {
    // Si no hay usuario activo, detenemos la máquina
    if (!user || !cuenta || !cuentaId) return;

    setLoadingInventario(true);
    const docRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');

    // 📡 ÚNICO TÚNEL A FIREBASE PARA TODA LA APP
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      const rawData = docSnap.data() || {};
      
      // 🧠 BÚSQUEDA HÍBRIDA: Lee agrupados o sueltos en la raíz
      const productosData = rawData.productos || rawData;
      const catalogoLocal = getProductosActivos();

      // 🛡️ Filtro de seguridad: Ignoramos campos de texto como 'updatedAt'
      const firebaseArray = Object.values(productosData).filter(item => typeof item === 'object' && item !== null);

      // 🧠 CRUCE Y CONSOLIDACIÓN DE DATOS
      const inventarioConsolidado = catalogoLocal.map((catalogo) => {
        let datosFirebase = productosData[catalogo.nombre] || firebaseArray.find(item => item.nombre === catalogo.nombre) 
        || productosData[catalogo.codigo]
        || {};

        const cantRegular = parseInt(datosFirebase.cantidad) || 0;
        const cantBono = parseInt(datosFirebase.piezasConDescuento) || 0;
        const totalFisico = cantRegular + cantBono;

        return {
          ...catalogo, 
          precioVenta: catalogo.precioVentaStandard || 0,
          precioCosto: catalogo.precioCostoStandard || 0,
          id: catalogo.codigo,    
          codigo: catalogo.codigo,
          nombre: catalogo.nombre,
          cantidad: totalFisico, 
          stockTotal: totalFisico,
          stockRegular: cantRegular,
          stockBono: cantBono,
          piezasConDescuento: cantBono,
          limiteStock: parseInt(datosFirebase.limiteStock) || 0,
          notas: datosFirebase.notas || '',
        };
      });

      inventarioConsolidado.sort((a, b) => a.nombre.localeCompare(b.nombre));

      setInventarioGlobal(inventarioConsolidado);
      setLoadingInventario(false);
    }, (error) => {
      console.error('❌ Falla en sincronización maestra de inventario:', error);
      setLoadingInventario(false);
    });

    return () => unsubscribe();
  }, [user, cuenta, cuentaId]);

  return (
    <InventarioContext.Provider value={{ inventarioGlobal, loadingInventario }}>
      {children}
    </InventarioContext.Provider>
  );
};