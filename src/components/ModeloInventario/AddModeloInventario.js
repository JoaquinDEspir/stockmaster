import { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import db from "../../firebase";

export default function AddModeloInventario() {
  const [articulos, setArticulos] = useState([]);
  const [modelo, setModelo] = useState("");
  const [articuloId, setArticuloId] = useState("");

  const modeloDeInventario =  ["Lote Fijo", "Periodo Fijo"];

  useEffect(() => {
    const fetchArticulos = async () => {
      const snap = await getDocs(collection(db, "Articulos"));
      const modeloSnap = await getDocs(collection(db, "ModeloInventario"));

      // Modelos activos (sin baja lógica)
      const modelosActivos = modeloSnap.docs
        .map(d => d.data())
        .filter(m => !m.fechahorabaja);

      // Artículos activos y sin modelo de inventario asignado
      const articulosFiltrados = snap.docs
        .map(d => ({
          id: d.id,
          nombre: d.data().nombreArticulo,
          baja: d.data().fechahorabaja || null,
        }))
        .filter(art =>
          !art.baja &&
          !modelosActivos.some(m => m.codArticulo === art.id)
        );

      setArticulos(articulosFiltrados);
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
    const sigma = proveedor.desviacionEstandar ? parseFloat(proveedor.desviacionEstandar) : 1;
    const T = proveedor.periodoRevision ? parseInt(proveedor.periodoRevision) : 7;

    // Obtener datos del artículo
    const artSnap = await getDocs(collection(db, "Articulos"));
    const articulo = artSnap.docs.find((d) => d.id === articuloId)?.data();
    const D = parseInt(articulo.demandaArticulo);

    // Calcular stock de seguridad automáticamente
    const Z = 1.65; // Nivel de servicio 95%
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
