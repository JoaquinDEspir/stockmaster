import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import db from "../../firebase";

export default function DeleteArticulo() {
  // Lista de artículos
  const [articulos, setArticulos] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  // Cargar artículos
  useEffect(() => {
    const fetchArticulos = async () => {
      const snapshot = await getDocs(collection(db, "Articulo"));
      const lista = snapshot.docs
        .map(doc => ({
          id: doc.id,
          nombre: doc.data().nombreArticulo,
          stock: doc.data().stockActualArticulo || 0,
          baja: doc.data().fechaHoraBajaArticulo,
        }))
        .filter(art => !art.baja); // mostrar solo los que no están dados de baja
      setArticulos(lista);
    };
    fetchArticulos();
  }, []);


  // Funcion para dar de baja un artículo
  const handleDelete = async () => {
    if (!selectedId) return alert("Seleccioná un artículo");

    const articulo = articulos.find(a => a.id === selectedId);
    if (!articulo) return;

    // Verificar si el artículo tiene stock disponible
    if (articulo.stock > 0) return alert("No se puede dar de baja un artículo con stock disponible");

    // Verificar si el artículo está en una orden de compra
    // Solo se pueden dar de baja si la orden no esta en estado "Pendiente" o "Enviada"
    const ordenes = await getDocs(collection(db, "OrdenCompra"));

    for (const orden of ordenes.docs) {
      // Obtener estados de la orden
      const estadosSnap = await getDocs(collection(db, "OrdenCompra", orden.id, "EstadoOrdenCompra"));
      
      let tieneEstadoBloqueado = false;

      // Verificar si la orden tiene un estado que bloquee la baja
      estadosSnap.forEach(docEstado => {
        const estado = docEstado.data().nombreEstadoCompra;
        if (estado === "Pendiente" || estado === "Enviada") {
          tieneEstadoBloqueado = true;
        }
      });

      // Si tiene estado bloqueado, verificamos si contiene el artículo
      if (tieneEstadoBloqueado) {
        const detalles = await getDocs(collection(db, "OrdenCompra", orden.id, "DetalleOrdenCompra"));
        
        for (const detalle of detalles.docs) {
          const articulos = await getDocs(collection(db, "OrdenCompra", orden.id, "DetalleOrdenCompra", detalle.id, "Articulo"));

          for (const articulo of articulos.docs) {
            if (articulo.id === selectedId) {
              alert("No se puede dar de baja un artículo que pertenece a una orden de compra Pendiente o Enviada");
              return;
            }
          }
        }
      }
    }

    // Si no tiene estado bloqueado, podemos dar de baja
    const confirm = window.confirm("¿Estás seguro de dar de baja este artículo?");
    if (!confirm) return;

    await updateDoc(doc(db, "Articulo", selectedId), {
      fechaHoraBajaArticulo: Timestamp.now()
    });

    alert("Artículo dado de baja correctamente");
    setArticulos(articulos.filter((a) => a.id !== selectedId));
    setSelectedId("");
  };

  return (
    <div className="container my-4">
      <h4 className="text-center mb-5">🗑️ Dar de baja Artículo</h4>

      <text className="form-text mb-3">Seleccione un Articulo</text>
      <select className="form-select mb-3" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        <option value="">Seleccionar artículo</option>
        {articulos.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>

      <div className="text-center mb-4 mt-5">
        <button className="btn btn-danger px-4 py-2" onClick={handleDelete} disabled={!selectedId}>Dar de baja</button>
      </div>
    </div>
  );
}
