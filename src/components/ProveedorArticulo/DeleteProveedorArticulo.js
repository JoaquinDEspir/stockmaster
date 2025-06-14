import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import db from "../../firebase";

export default function DeleteProveedorArticulo() {
  const [articulos, setArticulos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [articuloId, setArticuloId] = useState("");
  const [proveedorId, setProveedorId] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const artSnap = await getDocs(collection(db, "Articulos"));
      const provSnap = await getDocs(collection(db, "Proveedor"));
      setArticulos(artSnap.docs.map(d => ({ id: d.id, nombre: d.data().nombreArticulo })));
      setProveedores(provSnap.docs.map(d => ({ id: d.id, nombre: d.data().nombreProveedor })));
    };
    fetch();
  }, []);

  const handleDelete = async () => {
    if (!articuloId || !proveedorId)
      return alert("Seleccioná artículo y proveedor");

    const confirm = window.confirm("¿Dar de baja esta relación proveedor-artículo?");
    if (!confirm) return;

    const docRef = doc(db, "Articulos", articuloId, "ProveedorArticulo", proveedorId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return alert("La relación no existe.");
    }

    const data = snap.data();
    if (data.fechaHoraBajaProveedorArticulo) {
      return alert("Ya se encuentra dada de baja.");
    }

    // 🔍 Verificar si existe OC con ese proveedor y artículo en estado Pendiente o Enviada
    // Buscamos todas las OC del proveedor
    const ocSnap = await getDocs(
      query(collection(db, "OrdenCompra"), where("codProveedor", "==", proveedorId))
    );

    for (const orden of ocSnap.docs) {
      // Para cada OC, buscar los detalles y estados
      const detallesSnap = await getDocs(collection(db, "OrdenCompra", orden.id, "DetalleOrdenCompra"));
      const detalles = detallesSnap.docs.map(d => d.data());
      // ¿Contiene el artículo?
      const incluyeArticulo = detalles.some(d => d.codArticulo === articuloId);
      if (!incluyeArticulo) continue;

      // Buscamos el estado actual de la OC
      const estadosSnap = await getDocs(collection(db, "OrdenCompra", orden.id, "EstadoOrdenCompra"));
      const estadoActual = estadosSnap.docs.find(d => !d.data().fechaHoraBajaEstadoCompra);
      const estado = estadoActual?.data().estadoOrdenCompra;

      if (estado === "pendiente" || estado === "enviada") {
        return alert("❌ No se puede dar de baja la relación: existe una Orden de Compra pendiente o enviada para este artículo y proveedor.");
      }
    }

    await updateDoc(docRef, {
      fechaHoraBajaProveedorArticulo: Timestamp.now(),
    });

    alert("Relación dada de baja correctamente");
    setProveedorId("");
  };

  return (
    <div className="container my-4">
      <h4 className="text-center mb-5">🗑️ Dar de baja Proveedor-Artículo</h4>
      
      <text className="form-text mb-3">Seleccione un Articulo</text>
      <select className="form-select mb-2" value={articuloId} onChange={(e) => setArticuloId(e.target.value)}>
        <option value="">Seleccionar artículo</option>
        {articulos.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>

      <text className="form-text mb-3">Seleccione un Proveedor</text>
      <select className="form-select mb-3" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
        <option value="">Seleccionar proveedor</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>

      <div className="text-center mb-4 mt-5">
        <button
          className="btn btn-danger px-4 py-2"
          onClick={handleDelete}
          disabled={!articuloId || !proveedorId}
        >
          Dar de baja
        </button>
      </div>
    </div>
  );
}
