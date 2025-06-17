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
  /*const actualizarInventarioAlFinalizar = async (ordenId) => {
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
        const artDoc = await getDoc(doc(db, "Articulo", codArticulo));
        if (!artDoc.exists()) continue;
        const articulo = artDoc.data();
        const nuevoStock = (articulo.stockActualArticulo || 0) + (cantidad || 0);
        await updateDoc(doc(db, "Articulo", codArticulo), {
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
  };*/
  const actualizarInventarioAlFinalizar = async (ordenId) => {
  const ordenDoc = await getDoc(doc(db, "OrdenCompra", ordenId));
  if (!ordenDoc.exists()) {
    alert("La orden de compra no existe.");
    return;
  }

  const orden = ordenDoc.data();
  const { codArticulo, cantidadComprada } = orden;

  if (!codArticulo || !cantidadComprada) {
    alert("La orden no tiene artículo o cantidad definida.");
    return;
  }

  // Obtener el artículo
  const artDoc = await getDoc(doc(db, "Articulo", codArticulo));
  if (!artDoc.exists()) {
    alert("El artículo de la orden no existe.");
    return;
  }

  const articulo = artDoc.data();
  const nuevoStock = parseInt(articulo.stockActualArticulo || 0) + parseInt(cantidadComprada || 0);
  console.log(nuevoStock)
  console.log(articulo.stockActualArticulo)
  console.log(cantidadComprada)

  // Actualizar stock del artículo
  await updateDoc(doc(db, "Articulo", codArticulo), {
    stockActualArticulo: nuevoStock,
  });

  // Verificar modelo de inventario y punto de pedido
  const qModelo = query(
    collection(db, "ModeloInventario"),
    where("codArticulo", "==", codArticulo)
  );
  const modeloSnap = await getDocs(qModelo);
  let mensajes = [];

  if (!modeloSnap.empty) {
    const modelo = modeloSnap.docs[0].data();
    if (
      modelo.tipoModeloId === "modelo1" &&
      nuevoStock <= (modelo.puntoPedido || 0)
    ) {
      mensajes.push(
        `⚠️ El artículo "${articulo.nombreArticulo}" quedó con stock (${nuevoStock}) por debajo o igual al Punto de Pedido (${modelo.puntoPedido}).`
      );
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
      <h4 className="text-center mb-5">✏️ Actualizar Estado de Orden de Compra</h4>

      <select
        className="form-select mb-3"
        value={selectedOrdenId}
        onChange={(e) => setSelectedOrdenId(e.target.value)}
      >
        <option value="">Seleccionar Orden</option>
        {ordenes.map((o) => (
          <option key={o.id} value={o.id}>
            Orden número {o.numeroDeOrdenCompra} - {o.fecha?.toLocaleString()} (Estado: {o.estado})
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
