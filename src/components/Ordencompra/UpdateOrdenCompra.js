import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import db from "../../firebase";

export default function UpdateOrdenConDetalle() {
  const [ordenes, setOrdenes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [selectedOrdenId, setSelectedOrdenId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [items, setItems] = useState([]);
  const [detalleId, setDetalleId] = useState("");
  const [estadoActual, setEstadoActual] = useState("");

  useEffect(() => {
    const fetchInitialData = async () => {
      const ordenSnap = await getDocs(collection(db, "OrdenCompra"));
      setOrdenes(ordenSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const provSnap = await getDocs(collection(db, "Proveedor"));
      setProveedores(provSnap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombreProveedor })));

      const artSnap = await getDocs(collection(db, "Articulo"));
      setArticulos(artSnap.docs.map(d => ({ id: d.id, nombre: d.data().nombreArticulo })));
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchOrdenData = async () => {
      if (!selectedOrdenId) return;

      const ordenDoc = await getDoc(doc(db, "OrdenCompra", selectedOrdenId));
      if (ordenDoc.exists()) setProveedorId(ordenDoc.data().codProveedor);

      const detalleSnap = await getDocs(collection(db, "OrdenCompra", selectedOrdenId, "DetalleOrdenCompra"));
      const detalle = detalleSnap.docs[0];
      if (detalle) {
        setDetalleId(detalle.id);
        const itemsSnap = await getDocs(collection(db, "OrdenCompra", selectedOrdenId, "DetalleOrdenCompra", detalle.id, "Articulo"));
        setItems(itemsSnap.docs.map(d => ({ codArticulo: d.id, ...d.data() })));
      }

      // Estado actual
      const estadoSnap = await getDocs(query(
        collection(db, "OrdenCompra", selectedOrdenId, "EstadoOrdenCompra"),
        where("fechaHoraBajaEstadoCompra", "==", null)
      ));
      if (!estadoSnap.empty) {
        setEstadoActual(estadoSnap.docs[0].data().nombreEstadoCompra);
      } else {
        setEstadoActual("");
      }
    };
    fetchOrdenData();
  }, [selectedOrdenId]);

  const handleItemChange = (i, campo, valor) => {
    const nuevo = [...items];
    nuevo[i][campo] = valor;
    setItems(nuevo);
  };

  const handleEliminarItem = (index) => {
    const nuevo = [...items];
    nuevo.splice(index, 1);
    setItems(nuevo);
  };

  const handleGuardar = async () => {
    if (!selectedOrdenId || !proveedorId) return alert("Faltan datos.");

    // No permitir modificar si el estado es Enviada o Finalizada
    if (["Enviada", "Finalizada", "Completada", "Cancelada"].includes(estadoActual)) {
      return alert(`La orden está en estado "${estadoActual}" y no puede modificarse.`);
    }

    const total = items.reduce((acc, item) => acc + parseFloat(item.precioArticulo || 0) * parseInt(item.cantidad || 0), 0);

    await updateDoc(doc(db, "OrdenCompra", selectedOrdenId), { codProveedor: proveedorId });

    await updateDoc(doc(db, "OrdenCompra", selectedOrdenId, "DetalleOrdenCompra", detalleId), { precioTotal: total });

    const ref = collection(db, "OrdenCompra", selectedOrdenId, "DetalleOrdenCompra", detalleId, "Articulo");
    const existentes = await getDocs(ref);
    for (const d of existentes.docs) {
      await deleteDoc(doc(ref, d.id));
    }

    for (const item of items) {
      await setDoc(doc(ref, item.codArticulo), {
        codArticulo: item.codArticulo,
        precioArticulo: parseFloat(item.precioArticulo),
        cantidad: parseInt(item.cantidad),
      });
    }

    alert("Orden actualizada correctamente");
  };

  return (
    <div className="container my-4">
      <h4>✏️ Editar Orden de Compra con Artículos</h4>

      <select className="form-select mb-3" value={selectedOrdenId} onChange={(e) => setSelectedOrdenId(e.target.value)}>
        <option value="">Seleccionar orden</option>
        {ordenes.map((o) => (
          <option key={o.id} value={o.id}>Orden #{o.id}</option>
        ))}
      </select>

      {selectedOrdenId && (
        <>
          <div className="mb-2">
            <strong>Estado actual:</strong> {estadoActual}
          </div>

          <select className="form-select mb-3" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            <option value="">Seleccionar proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          {items.map((item, i) => (
            <div key={i} className="card mb-3 p-3">
              <div className="row g-2 align-items-end">
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={item.codArticulo}
                    onChange={(e) => handleItemChange(i, "codArticulo", e.target.value)}
                  >
                    <option value="">Seleccionar artículo</option>
                    {articulos.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Precio"
                    value={item.precioArticulo}
                    onChange={(e) => handleItemChange(i, "precioArticulo", e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Cantidad"
                    value={item.cantidad}
                    onChange={(e) => handleItemChange(i, "cantidad", e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <button className="btn btn-outline-danger w-100" type="button" onClick={() => handleEliminarItem(i)}>
                    ➖
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button className="btn btn-warning" onClick={handleGuardar}>Guardar Cambios</button>
        </>
      )}
    </div>
  );
}
