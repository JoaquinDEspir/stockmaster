import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  increment,
  addDoc,
  query,
  where,
} from "firebase/firestore";
import db from "../../firebase";

export default function UpdateVenta() {
  const [ventas, setVentas] = useState([]);
  const [selectedVentaId, setSelectedVentaId] = useState("");
  const [items, setItems] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [articulosActivos, setArticulosActivos] = useState({});
  const [stockOriginal, setStockOriginal] = useState({});
  const [modeloInventario, setModeloInventario] = useState([]);

  useEffect(() => {
    const fetchVentasYArticulos = async () => {
      const ventaSnap = await getDocs(collection(db, "Venta"));
      // Solo guardamos ventas por ahora, filtraremos después
      setVentas(ventaSnap.docs.map((d) => ({ id: d.id })));

      const artSnap = await getDocs(collection(db, "Articulo"));
      // Solo artículos activos
      const activos = {};
      const listaArticulos = artSnap.docs
        .filter(d => !d.data().fechahorabaja)
        .map(d => {
          activos[d.id] = true;
          return { id: d.id, nombre: d.data().nombreArticulo };
        });
      setArticulos(listaArticulos);
      setArticulosActivos(activos);

      const modSnap = await getDocs(collection(db, "ModeloInventario"));
      setModeloInventario(
        modSnap.docs.map((d) => ({
          codArticulo: d.data().codArticulo,
          modelo: d.data().nombreModeloInventario,
          puntoPedido: d.data().puntoPedido || 0,
        }))
      );
    };

    fetchVentasYArticulos();
  }, []);

  useEffect(() => {
    if (!selectedVentaId) return;

    const fetchDetalle = async () => {
      const snap = await getDocs(collection(db, "Venta", selectedVentaId, "DetalleVenta"));
      // Solo los artículos activos
      const lista = snap.docs
        .map((d) => ({
          codArticulo: d.id,
          ...d.data(),
        }))
        .filter(item => articulosActivos[item.codArticulo]);

      // Si la venta no tiene artículos activos, no la mostramos
      if (lista.length === 0) {
        setItems([]);
        setSelectedVentaId(""); // Limpiamos selección
        return;
      }

      const stockBackup = {};
      for (const item of lista) {
        const artRef = doc(db, "Articulo", item.codArticulo);
        const artSnap = await getDoc(artRef);
        if (artSnap.exists()) {
          stockBackup[item.codArticulo] = {
            stock: artSnap.data().stockActualArticulo || 0,
            previo: item.cantidadVendidaArticulo,
            nombre: artSnap.data().nombreArticulo,
          };
        }
      }

      setStockOriginal(stockBackup);
      setItems(lista);
    };

    fetchDetalle();
    // eslint-disable-next-line
  }, [selectedVentaId, articulosActivos]); // Para recargar si cambia el set de activos

  const handleItemChange = (index, campo, valor) => {
    const nuevo = [...items];
    nuevo[index][campo] = valor;
    setItems(nuevo);
  };

  const precioTotal = items.reduce((acc, item) => {
    const precio = parseFloat(item.precioVentaArticulo || 0);
    const cantidad = parseInt(item.cantidadVendidaArticulo || 0);
    return acc + precio * cantidad;
  }, 0);

  const verificarOCActiva = async (codArticulo) => {
    const ocSnap = await getDocs(collection(db, "OrdenCompra"));
    for (const oc of ocSnap.docs) {
      const estados = await getDocs(collection(db, "OrdenCompra", oc.id, "EstadoOrdenCompra"));
      const estadoActual = estados.docs.find((e) => e.data().fechaHoraBajaEstadoCompra === null);
      if (!estadoActual) continue;
      const estado = estadoActual.data().nombreEstadoCompra;
      if (["Pendiente", "En Proceso"].includes(estado)) {
        const detalles = await getDocs(collection(db, "OrdenCompra", oc.id, "DetalleOrdenCompra"));
        for (const det of detalles.docs) {
          const articulos = await getDocs(
            collection(db, "OrdenCompra", oc.id, "DetalleOrdenCompra", det.id, "Articulo")
          );
          if (articulos.docs.some((a) => a.id === codArticulo)) return true;
        }
      }
    }
    return false;
  };

  const generarOC = async (codArticulo) => {
    const fecha = new Date();
    const ordenRef = await addDoc(collection(db, "OrdenCompra"), {
      codProveedor: "", // se podría buscar el predeterminado si querés automatizar más
      fechaHoraOrdenCompra: fecha,
    });

    await setDoc(doc(db, "OrdenCompra", ordenRef.id, "EstadoOrdenCompra", "Pendiente"), {
      nombreEstadoCompra: "Pendiente",
      fechaHoraAltaEstadoCompra: fecha,
      fechaHoraBajaEstadoCompra: null,
    });

    await addDoc(collection(db, "OrdenCompra", ordenRef.id, "DetalleOrdenCompra"), {
      fechaHoraAlta: fecha,
      fechaHoraBaja: null,
      precioTotal: 0,
    });
  };

  const handleGuardarCambios = async () => {
    for (const item of items) {
      const cod = item.codArticulo;
      const nuevo = parseInt(item.cantidadVendidaArticulo);
      const previo = stockOriginal[cod]?.previo || 0;
      const diff = nuevo - previo;

      const artRef = doc(db, "Articulo", cod);
      const artSnap = await getDoc(artRef);
      const stockActual = artSnap.data().stockActualArticulo || 0;

      if (diff > 0 && stockActual < diff) {
        return alert(
          `No hay suficiente stock para ${stockOriginal[cod].nombre}. Disponible: ${stockActual}, requerido extra: ${diff}`
        );
      }
    }

    await updateDoc(doc(db, "Venta", selectedVentaId), {
      precioTotalVenta: precioTotal,
    });

    for (const item of items) {
      const cod = item.codArticulo;
      const nuevo = parseInt(item.cantidadVendidaArticulo);
      const previo = stockOriginal[cod]?.previo || 0;
      const diff = nuevo - previo;

      const artRef = doc(db, "Articulo", cod);
      await updateDoc(artRef, {
        stockActualArticulo: increment(-diff),
      });

      // Chequeo para modelo lote fijo
      const modelo = modeloInventario.find((m) => m.codArticulo === cod);
      if (
        modelo &&
        modelo.modelo === "Lote Fijo" &&
        stockOriginal[cod].stock - diff <= modelo.puntoPedido
      ) {
        const tieneOC = await verificarOCActiva(cod);
        if (!tieneOC) {
          await generarOC(cod);
          alert(`⚠️ Se generó automáticamente una OC pendiente para ${stockOriginal[cod].nombre}`);
        }
      }

      await setDoc(doc(db, "Venta", selectedVentaId, "DetalleVenta", cod), {
        codArticulo: cod,
        precioVentaArticulo: parseFloat(item.precioVentaArticulo),
        cantidadVendidaArticulo: nuevo,
        precioTotalVenta: parseFloat(item.precioVentaArticulo) * nuevo,
      });
    }

    alert("Venta actualizada correctamente");
  };

  // Ventas solo con artículos activos
  const ventasConArticulosActivos = ventas.filter(async (v) => {
    const snap = await getDocs(collection(db, "Venta", v.id, "DetalleVenta"));
    return snap.docs.some(d => articulosActivos[d.id]);
  });

  return (
    <div className="container my-4">
      <h4>✏️ Actualizar Venta</h4>

      <select
        className="form-select mb-3"
        value={selectedVentaId}
        onChange={(e) => setSelectedVentaId(e.target.value)}
      >
        <option value="">Seleccionar venta</option>
        {ventas.map((v) => (
          <option key={v.id} value={v.id}>
            Venta #{v.id}
          </option>
        ))}
      </select>

      {items.map((item, i) => (
        <div key={i} className="card mb-3 p-3">
          <select className="form-select mb-2" value={item.codArticulo} disabled>
            <option>
              {articulos.find((a) => a.id === item.codArticulo)?.nombre || item.codArticulo}
            </option>
          </select>
          <input
            type="number"
            className="form-control mb-2"
            placeholder="Precio unitario"
            value={item.precioVentaArticulo}
            onChange={(e) => handleItemChange(i, "precioVentaArticulo", e.target.value)}
          />
          <input
            type="number"
            className="form-control"
            placeholder="Cantidad"
            value={item.cantidadVendidaArticulo}
            onChange={(e) => handleItemChange(i, "cantidadVendidaArticulo", e.target.value)}
          />
        </div>
      ))}

      <div className="alert alert-info">
        <strong>Total actualizado:</strong> ${precioTotal.toFixed(2)}
      </div>

      {selectedVentaId && items.length > 0 && (
        <button className="btn btn-warning" onClick={handleGuardarCambios}>
          Guardar Cambios
        </button>
      )}
    </div>
  );
}
