import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import db from "../../firebase";

export default function ListaArticulosPorProveedor() {
  const [proveedores, setProveedores] = useState([]);
  const [articulosPorProveedor, setArticulosPorProveedor] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      // Solo proveedores activos
      const provSnap = await getDocs(collection(db, "Proveedor"));
      const listaProveedores = provSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => !p.fechaHoraBajaProveedor);

      setProveedores(listaProveedores);

      // Solo artículos activos
      const articulosSnap = await getDocs(collection(db, "Articulo"));
      const articulos = articulosSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((a) => !a.fechaHoraBajaArticulo);

      const resultado = {};

      for (const prov of listaProveedores) {
        resultado[prov.id] = [];

        for (const art of articulos) {
          const sub = doc(db, "Articulo", art.id, "ArticuloProveedor", prov.id);
          const snap = await getDoc(sub);

          // Relación proveedor-artículo activa
          if (
            snap.exists() &&
            !snap.data().fechaHoraBajaArticuloProveedor
          ) {
            resultado[prov.id].push({
              articulo: art.nombreArticulo,
              esPredeterminado: snap.data().esProveedorPredeterminado || false,
            });
          }
        }
      }

      setArticulosPorProveedor(resultado);
    };

    fetchData();
  }, []);

  return (
    <div className="container my-4">
      <h4>📦 Artículos por Proveedor</h4>
      {proveedores.map((prov) => (
        <div key={prov.id} className="mb-4 border p-3 rounded">
          <h5>{prov.nombreProveedor}</h5>
          <ul>
            {articulosPorProveedor[prov.id]?.length > 0 ? (
              articulosPorProveedor[prov.id].map((a, i) => (
                <li key={i}>
                  {a.articulo} {a.esPredeterminado && <strong>(⭐ Predeterminado)</strong>}
                </li>
              ))
            ) : (
              <li className="text-muted">Sin artículos asociados</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
