import { useEffect, useState } from "react";
import { collection, getDocs, doc, query, where } from "firebase/firestore";
import db from "../../firebase";

export default function TablaOrdenesCompra() {
  const [ordenes, setOrdenes] = useState([]);
  const [proveedores, setProveedores] = useState({});
  const [proveedoresBaja, setProveedoresBaja] = useState({});
  const [articulos, setArticulos] = useState({});
  const [filtro, setFiltro] = useState("");
  const [ordenAsc, setOrdenAsc] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [provSnap, artSnap, ordenSnap] = await Promise.all([
        getDocs(collection(db, "Proveedor")),
        getDocs(collection(db, "Articulos")),
        getDocs(collection(db, "OrdenCompra")),
      ]);

      // Proveedores activos y dados de baja
      const provMap = {};
      const provBajaMap = {};
      provSnap.docs.forEach((d) => {
        if (!d.data().fechaHoraBajaProveedor) {
          provMap[d.id] = d.data().nombreProveedor;
        } else {
          provBajaMap[d.id] = d.data().nombreProveedor;
        }
      });
      setProveedores(provMap);
      setProveedoresBaja(provBajaMap);

      // Artículos activos
      const artMap = {};
      artSnap.docs.forEach((d) => {
        if (!d.data().fechahorabaja) {
          artMap[d.id] = d.data().nombreArticulo;
        }
      });
      setArticulos(artMap);

      // Órdenes de compra activas (sin baja)
      const ordenesConDatos = await Promise.all(
        ordenSnap.docs
          .filter((orden) => !orden.data().fechaHoraBajaOrdenCompra)
          .map(async (orden) => {
            const id = orden.id;
            const { codProveedor, fechaHoraOrdenCompra } = orden.data();

            // Estado activo (el último sin baja)
            const estadoSnap = await getDocs(
              query(
                collection(db, "OrdenCompra", id, "EstadoOrdenCompra"),
                where("fechaHoraBajaEstadoCompra", "==", null)
              )
            );
            const estado = estadoSnap.empty
              ? "Sin estado"
              : estadoSnap.docs[0].data().nombreEstadoCompra;

            // Detalle OC
            const detalleSnap = await getDocs(
              collection(db, "OrdenCompra", id, "DetalleOrdenCompra")
            );
            if (detalleSnap.empty) {
              console.log("OC sin DetalleOrdenCompra:", id);
            }
            const detalleDoc = detalleSnap.docs[0];
            const detalleId = detalleDoc?.id;
            const detalle = detalleDoc?.data();
            const precioTotal = detalle?.precioTotal ?? 0;

            const articulosSnap = detalleId
              ? await getDocs(
                  collection(
                    db,
                    "OrdenCompra",
                    id,
                    "DetalleOrdenCompra",
                    detalleId,
                    "articulos"
                  )
                )
              : { docs: [] };

            // Artículos activos en la OC
            const articulosOrden = articulosSnap.docs.map((a) => ({
              id: a.id,
              nombre: artMap[a.id] ?? a.id,
              ...a.data(),
              activo: !!artMap[a.id],
            }));

            // Si el proveedor está de baja, igual lo mostramos e indicamos "(Baja)"
            let proveedorLabel = provMap[codProveedor] || provBajaMap[codProveedor] || codProveedor;
            if (provBajaMap[codProveedor]) proveedorLabel += " (Baja)";

            return {
              id,
              proveedor: proveedorLabel,
              fecha: fechaHoraOrdenCompra?.toDate?.() || new Date(),
              estado,
              precioTotal,
              articulos: articulosOrden,
            };
          })
      );

      setOrdenes(ordenesConDatos.filter(Boolean));
    };

    fetchData();
  }, []);

  const ordenesFiltradas = ordenes
    .filter((o) => o.proveedor.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) =>
      ordenAsc
        ? a.fecha?.getTime() - b.fecha?.getTime()
        : b.fecha?.getTime() - a.fecha?.getTime()
    );

  return (
    <div className="container my-4">
      <h4>📋 Órdenes de Compra</h4>
      <input
        className="form-control mb-3"
        placeholder="Buscar por proveedor..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />

      <button
        className="btn btn-sm btn-outline-secondary mb-2"
        onClick={() => setOrdenAsc(!ordenAsc)}
      >
        Ordenar por fecha {ordenAsc ? "↑" : "↓"}
      </button>

      {ordenesFiltradas.length === 0 && (
        <div className="alert alert-warning">
          No hay órdenes de compra para mostrar.
        </div>
      )}

      {ordenesFiltradas.map((orden) => (
        <div key={orden.id} className="card mb-3 p-3">
          <h5>Orden #{orden.id}</h5>
          <p>
            <strong>Proveedor:</strong> {orden.proveedor}
          </p>
          <p>
            <strong>Fecha:</strong> {orden.fecha?.toLocaleString()}
          </p>
          <p>
            <strong>Estado:</strong> {orden.estado}
          </p>
          <p>
            <strong>Precio Total:</strong> ${orden.precioTotal.toFixed(2)}
          </p>

          {orden.articulos.length > 0 ? (
            <table className="table table-sm table-bordered mt-3">
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {orden.articulos.map((a, idx) => (
                  <tr key={idx}>
                    <td>
                      {a.nombre}
                      {!a.activo && (
                        <span className="text-danger ms-2">(Baja)</span>
                      )}
                    </td>
                    <td>${a.precioArticulo}</td>
                    <td>{a.cantidad}</td>
                    <td>
                      {a.activo ? "Activo" : "Dado de baja"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">
              Sin artículos registrados en el primer detalle.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
