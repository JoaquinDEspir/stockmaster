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
  const [estadoActual, setEstadoActual] = useState("");
  const [proveedorPredeterminado, setProveedorPredeterminado] = useState("");
  const [articuloOrdenCompra, setArticuloOrdenCompra] = useState("");
  const [ordenCompraSeleccionada, SetOrdenCompraSeleccionada] = useState("");

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
  
      if (ordenDoc.exists()) {
    const data = ordenDoc.data();
    setProveedorId(data.codProveedor);
    SetOrdenCompraSeleccionada(data);

    const codArticulo = data.codArticulo;

    if (codArticulo) {
      const articuloDoc = await getDoc(doc(db, "Articulo", codArticulo));
      if (articuloDoc.exists()) {
        setArticuloOrdenCompra({ id: articuloDoc.id, ...articuloDoc.data() });
      } else {
        setArticuloOrdenCompra(null);
      }
    } else {
      setArticuloOrdenCompra(null);
    }
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
  }, [selectedOrdenId, proveedores]);

  //busco el proveedor
  useEffect(() => {
  if (proveedorId && proveedores.length > 0) {
    const proveedor = proveedores.find(p => p.id === proveedorId);
    setProveedorPredeterminado(proveedor);
  }

  }, [proveedorId, proveedores]);


  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!selectedOrdenId || !proveedorId) return alert("Faltan datos.");

    // No permitir modificar si el estado es Enviada o Finalizada
    if (["Enviada", "Finalizada", "Completada", "Cancelada"].includes(estadoActual)) {
      return alert(`La orden está en estado "${estadoActual}" y no puede modificarse.`);
    }

    // --- VERIFICACIÓN DE PUNTO DE PEDIDO Y MODELO ---
    // Traer el modelo de inventario del artículo
    const modelosSnap = await getDocs(collection(db, "ModeloInventario"));
    const modelo = modelosSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .find(m => m.articuloId === articuloOrdenCompra.id);

    if (
      modelo &&
      modelo.tipoModeloId === "modelo1" &&
      Number(ordenCompraSeleccionada.cantidadComprada) + (articuloOrdenCompra.stockActualArticulo || 0) <= (modelo.puntoPedido || 0)
    ) {
      return alert(
        `La cantidad comprada debe ser mayor a la cantidad del Punto de Pedido (${modelo.puntoPedido}).`
      );
    }
    // --- FIN VERIFICACIÓN ---

    const ref = doc(db, "OrdenCompra", selectedOrdenId);
    const ref1 = doc(db, "Articulo", articuloOrdenCompra.id, "ArticuloProveedor", proveedorId);
    const docSnap = await getDoc(ref1);
    const total = ordenCompraSeleccionada.cantidadComprada * docSnap.data().precioUnitario;

    await updateDoc(ref, {
      ...ordenCompraSeleccionada,
      cantidadComprada: ordenCompraSeleccionada.cantidadComprada,
      totalOrdenCompra: total,
    });

    alert("Orden actualizada correctamente");
  };
  

  return (
    <form onSubmit={handleUpdate}>
      <div className="container my-4">
        <h4 className="text-center mb-5">✏️ Editar Orden de Compra con Artículos</h4>

        <select className="form-select mb-3" value={selectedOrdenId} onChange={(e) => setSelectedOrdenId(e.target.value)}>
          <option value="">Seleccionar orden</option>
          {ordenes.map((o) => (
            <option key={o.id} value={o.id}>Orden Número {o.numeroDeOrdenCompra}</option>
          ))}
        </select>

        {selectedOrdenId && (
          <>
            <div className="mb-2">
              <strong>Estado actual:</strong> {estadoActual}
            </div>

            <div className="mb-2">
              <strong>Proveedor: </strong> {proveedorPredeterminado ? proveedorPredeterminado.nombre : "-"}
            </div>

            <div className="mb-2">
              <strong>Articulo: </strong> {articuloOrdenCompra ? articuloOrdenCompra.nombreArticulo : "-"}
            </div>

            <div className="mb-3 row">
                    <label className="col-sm-3 col-form-label">Cantidad Comprada</label>
                    <div className="col-sm-9">
                      <input
                        type="number"
                        className="form-control"
                        value={ordenCompraSeleccionada.cantidadComprada}
                        onChange={(e) => {
                            SetOrdenCompraSeleccionada({
                            ...ordenCompraSeleccionada,
                            cantidadComprada: e.target.value,
                            })
                        }}
                      />
                    </div>
              </div>

            <div className="text-center mb-4 mt-5">
              <button className="btn btn-warning px-4 py-2">Guardar Cambios</button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
