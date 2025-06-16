import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import db from "../../firebase";

export default function DeleteProveedor() {
  const [proveedores, setProveedores] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "Proveedor"));
      const lista = snap.docs
        .map(d => ({
          id: d.id,
          nombre: d.data().nombreProveedor,
          baja: d.data().fechaHoraBajaProveedor || null,
        }))
        .filter(p => !p.baja); // Excluir proveedores dados de baja
      setProveedores(lista);
    };
    fetch();
  }, []);

  const validarBaja = async (idProveedor) => {
    //Verificar si es proveedor predeterminado en algún artículo
    const artSnap = await getDocs(collection(db, "Articulo"));
    for (const art of artSnap.docs) {
      const articuloData = art.data();

      // Ignorar artículos dados de baja
      if (articuloData.fechaHoraBajaArticulo) continue;

      // Verificar si el proveedor es predeterminado en algún artículo
      const subSnap = await getDocs(
        collection(db, "Articulo", art.id, "ArticuloProveedor")
      );

      // Verificar si alguno de los artículos tiene el proveedor predeterminado
      const algunoPredeterminado = subSnap.docs.some(
        d =>
          d.id === idProveedor &&
          d.data().esProveedorPredeterminado === true
      );

      // Si tiene alguno, mostrar mensaje de error
      if (algunoPredeterminado) {
        alert("❌ No se puede dar de baja: es proveedor predeterminado en un artículo.");
        return false;
      }
    }

    //Verificar si tiene órdenes de compra activas (solo "pendiente" o "enviada")
    const ocSnap = await getDocs(
      query(collection(db, "OrdenCompra"), where("codProveedor", "==", idProveedor))
    );

    for (const orden of ocSnap.docs) {
      const estadosSnap = await getDocs(
        collection(db, "OrdenCompra", orden.id, "EstadoOrdenCompra")
      );
      const tieneEstadoPendienteOEnviada = estadosSnap.docs.some(
        d =>
          !d.data().fechaHoraBajaEstadoCompra && // Estado actual
          (d.data().estadoOrdenCompra === "pendiente" || d.data().estadoOrdenCompra === "enviada")
      );
      if (tieneEstadoPendienteOEnviada) {
        alert("❌ No se puede dar de baja: tiene una orden de compra pendiente o enviada.");
        return false;
      }
    }

    return true;
  };

  const handleDelete = async () => {
    if (!selectedId) return;

    const confirm = window.confirm("¿Estás seguro de dar de baja este proveedor?");
    if (!confirm) return;

    const puedeBorrar = await validarBaja(selectedId);
    if (!puedeBorrar) return;

    await updateDoc(doc(db, "Proveedor", selectedId), {
      fechaHoraBajaProveedor: Timestamp.now(),
    });

    setProveedores(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId("");
    alert("Proveedor dado de baja correctamente");
  };

  return (
    <div className="container my-4">
      <h4 className="text-center mb-5">🗑️ Dar de baja Proveedor</h4>

      <text className="form-text mb-3">Seleccione un Proveedor</text>
      <select
        className="form-select mb-3"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Seleccionar proveedor</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>

      <div className="text-center mb-4 mt-5">
        <button
          className="btn btn-danger px-4 py-2"
          onClick={handleDelete}
          disabled={!selectedId}
        >
          Dar de baja
        </button>
      </div>
    </div>
  );
}
