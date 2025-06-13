import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import db from "../../firebase";

export default function UpdateEstadoOrdenCompra() {
  const [ordenes, setOrdenes] = useState([]);
  const [selectedOrdenId, setSelectedOrdenId] = useState("");
  const [estadoActual, setEstadoActual] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [cargando, setCargando] = useState(false);

  // SOLO MUESTRA OC activas, proveedor activo y SOLO PENDIENTES o ENVIADAS
  const fetchOrdenes = async () => {
    const snap = await getDocs(collection(db, "OrdenCompra"));
    const provSnap = await getDocs(collection(db, "Proveedor"));
    const proveedoresActivos = {};
    provSnap.docs.forEach(p => {
      if (!p.data().fechaHoraBajaProveedor) {
        proveedoresActivos[p.id] = true;
      }
    });

    let ordenesValidas = [];
    for (const d of snap.docs) {
      // Filtrar baja lógica OC y proveedor
      if (d.data().fechaHoraBajaOrdenCompra) continue;
      if (!proveedoresActivos[d.data().codProveedor]) continue;

      const estadoRef = collection(
        db,
        "OrdenCompra",
        d.id,
        "EstadoOrdenCompra"
      );
      const q = query(estadoRef, where("fechaHoraBajaEstadoCompra", "==", null));
      const estadoSnap = await getDocs(q);
      if (!estadoSnap.empty) {
        const actual = estadoSnap.docs[0].data().nombreEstadoCompra?.trim();
        // SOLO agrego si es PENDIENTE o ENVIADA
        if (actual === "Pendiente" || actual === "Enviada") {
          ordenesValidas.push({
            id: d.id,
            fecha: d.data().fechaHoraOrdenCompra?.toDate(),
            estado: estadoSnap.docs[0].data().nombreEstadoCompra,
          });
        }
      }
    }
    setOrdenes(ordenesValidas);
  };

  useEffect(() => {
    fetchOrdenes();
  }, []);

  useEffect(() => {
    const fetchEstadoActual = async () => {
      if (!selectedOrdenId) return setEstadoActual(null);
      const estadoRef = collection(
        db,
        "OrdenCompra",
        selectedOrdenId,
        "EstadoOrdenCompra"
      );
      const q = query(estadoRef, where("fechaHoraBajaEstadoCompra", "==", null));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docActivo = snap.docs[0];
        setEstadoActual({ id: docActivo.id, ...docActivo.data() });
      } else {
        setEstadoActual(null);
      }
    };
    fetchEstadoActual();
  }, [selectedOrdenId]);

  const handleActualizarEstado = async () => {
    if (!nuevoEstado || !estadoActual) return;

    // Solo permite las transiciones correctas
    if (
      (estadoActual.nombreEstadoCompra === "Pendiente" && !["Enviada", "Cancelada"].includes(nuevoEstado)) ||
      (estadoActual.nombreEstadoCompra === "Enviada" && nuevoEstado !== "Finalizada") ||
      ["Finalizada", "Cancelada"].includes(estadoActual.nombreEstadoCompra)
    ) {
      return alert(
        `No se puede cambiar de "${estadoActual.nombreEstadoCompra}" a "${nuevoEstado}".`
      );
    }

    setCargando(true);
    const fecha = new Date();

    // 1. Cerrar estado actual
    const actualRef = doc(
      db,
      "OrdenCompra",
      selectedOrdenId,
      "EstadoOrdenCompra",
      estadoActual.id
    );
    await updateDoc(actualRef, {
      fechaHoraBajaEstadoCompra: fecha,
    });

    // 2. Crear nuevo estado
    const nuevoRef = doc(
      db,
      "OrdenCompra",
      selectedOrdenId,
      "EstadoOrdenCompra",
      nuevoEstado
    );
    await setDoc(nuevoRef, {
      nombreEstadoCompra: nuevoEstado,
      fechaHoraAltaEstadoCompra: fecha,
      fechaHoraBajaEstadoCompra: null,
    });

    // 3. Si el nuevo estado es "Finalizada", actualizar inventario
    if (nuevoEstado === "Finalizada") {
      await actualizarInventarioAlFinalizar(selectedOrdenId);
    }

    alert(`Estado actualizado a ${nuevoEstado}`);
    setEstadoActual({
      nombreEstadoCompra: nuevoEstado,
      fechaHoraAltaEstadoCompra: fecha,
      fechaHoraBajaEstadoCompra: null,
    });
    setNuevoEstado("");
    setCargando(false);

    // Actualizar lista de órdenes
    await fetchOrdenes(); // Refresh the list of orders
    setSelectedOrdenId("");
  };

  // Actualiza inventario y chequea punto de pedido para artículos de la OC
  const actualizarInventarioAlFinalizar = async (ordenId) => {
    const detallesSnap = await getDocs(
      collection(db, "OrdenCompra", ordenId, "DetalleOrdenCompra")
    );
    let mensajes = [];
    for (const det of detallesSnap.docs) {
      const articulosSnap = await getDocs(
        collection(
          db,
          "OrdenCompra",
          ordenId,
          "DetalleOrdenCompra",
          det.id,
          "articulos"
        )
      );
      for (const art of articulosSnap.docs) {
        const { codArticulo, cantidad } = art.data();
        const artDoc = await getDoc(doc(db, "Articulos", codArticulo));
        if (!artDoc.exists()) continue;
        const articulo = artDoc.data();
        const nuevoStock = (articulo.stockActualArticulo || 0) + (cantidad || 0);
        await updateDoc(doc(db, "Articulos", codArticulo), {
          stockActualArticulo: nuevoStock,
        });
        const qModelo = query(
          collection(db, "ModeloInventario"),
          where("codArticulo", "==", codArticulo)
        );
        const modeloSnap = await getDocs(qModelo);
        if (!modeloSnap.empty) {
          const modelo = modeloSnap.docs[0].data();
          if (
            modelo.nombreModeloInventario === "Lote Fijo" &&
            nuevoStock <= (modelo.puntoPedido || 0)
          ) {
            mensajes.push(
              `⚠️ El artículo "${articulo.nombreArticulo}" quedó con stock (${nuevoStock}) por debajo o igual al Punto de Pedido (${modelo.puntoPedido}).`
            );
          }
        }
      }
    }
    if (mensajes.length) {
      alert(mensajes.join("\n"));
    }
  };

  const getEstadosValidos = () => {
    if (!estadoActual) return [];
    if (estadoActual.nombreEstadoCompra === "Pendiente")
      return ["Enviada", "Cancelada"];
    if (estadoActual.nombreEstadoCompra === "Enviada")
      return ["Finalizada"];
    return [];
  };

  return (
    <div className="container my-4">
      <h4>✏️ Actualizar Estado de Orden de Compra</h4>

      <select
        className="form-select mb-3"
        value={selectedOrdenId}
        onChange={(e) => setSelectedOrdenId(e.target.value)}
      >
        <option value="">Seleccionar Orden</option>
        {ordenes.map((o) => (
          <option key={o.id} value={o.id}>
            Orden #{o.id} - {o.fecha?.toLocaleString()} (Estado: {o.estado})
          </option>
        ))}
      </select>

      {estadoActual && (
        <div className="mb-3">
          <strong>Estado actual:</strong> {estadoActual.nombreEstadoCompra}
        </div>
      )}

      <select
        className="form-select mb-3"
        value={nuevoEstado}
        onChange={(e) => setNuevoEstado(e.target.value)}
        disabled={!estadoActual}
      >
        <option value="">Seleccionar nuevo estado</option>
        {getEstadosValidos().map((estado) => (
          <option key={estado} value={estado}>
            {estado}
          </option>
        ))}
      </select>

      <button
        className="btn btn-warning"
        onClick={handleActualizarEstado}
        disabled={!nuevoEstado || cargando}
      >
        Actualizar Estado
      </button>
    </div>
  );
}
