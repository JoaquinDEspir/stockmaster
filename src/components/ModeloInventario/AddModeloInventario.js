import { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import db from "../../firebase";

export default function AddModeloInventario() {
  const [articulos, setArticulos] = useState([]);
  const [modelo, setModelo] = useState("Lote Fijo");
  const [articuloId, setArticuloId] = useState("");

  useEffect(() => {
    const fetchArticulos = async () => {
      const snap = await getDocs(collection(db, "Articulos"));
      setArticulos(
        snap.docs.map((d) => ({
          id: d.id,
          nombre: d.data().nombreArticulo,
        }))
      );
    };
    fetchArticulos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modelo || !articuloId) return alert("Completa los campos");

    // Buscar proveedor predeterminado
    const proveedoresSnap = await getDocs(
      collection(db, "Articulos", articuloId, "ProveedorArticulo")
    );
    const predeterminado = proveedoresSnap.docs.find(
      (doc) => doc.data().esProveedorPredeterminado === true
    );
    if (!predeterminado) return alert("El artículo no tiene proveedor predeterminado");

    const proveedor = predeterminado.data();
    const L = parseInt(proveedor.DemoraEntrega);
    const S = parseFloat(proveedor.CargosPedido);

    // Obtener datos del artículo
    const artSnap = await getDocs(collection(db, "Articulos"));
    const articulo = artSnap.docs.find((d) => d.id === articuloId)?.data();
    const D = parseInt(articulo.demandaArticulo);

    // Calcular stock de seguridad automáticamente
    const Z = 1.65; // Nivel de servicio 95%
    const sigma = 1; // Desviación estándar (demanda constante)
    const T = 7; // Período de revisión en días
    const stockSeguridad = Math.ceil(Z * sigma * Math.sqrt(T + L));

    let data = {
      nombreModeloInventario: modelo,
      stockDeSeguridad: parseInt(stockSeguridad),
      codArticulo: articuloId,
    };

    if (modelo === "Lote Fijo") {
      const loteOptimo = Math.round(Math.sqrt((2 * D * S) / articulo.costoAlmacenamientoArticulo));
      const puntoPedido = Math.round((D / 30) * L + parseInt(stockSeguridad));

      data = {
        ...data,
        loteOptimo,
        puntoPedido,
      };
    } else if (modelo === "Periodo Fijo") {
      const inventarioMaximo = Math.round((D / 30) * L + parseInt(stockSeguridad));
      data = {
        ...data,
        inventarioMaximo,
      };
    }

    await addDoc(collection(db, "ModeloInventario"), data);
    alert("Modelo de inventario agregado");
    setArticuloId("");
  };

  return (
    <div className="container mt-4">
      <h3>Agregar Modelo de Inventario</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Artículo</label>
          <select
            className="form-select"
            value={articuloId}
            onChange={(e) => setArticuloId(e.target.value)}
          >
            <option value="">Selecciona un artículo</option>
            {articulos.map((art) => (
              <option key={art.id} value={art.id}>
                {art.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Modelo</label>
          <input
            type="text"
            className="form-control"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Guardar Modelo
        </button>
      </form>
    </div>
  );
}
