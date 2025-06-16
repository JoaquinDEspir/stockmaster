import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import db from "../../firebase";
import CalcularModeloInventario from "./calcularModeloInventario";

export default function UpdateModeloInventario() {
  const [modelos, setModelos] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [tipoModelos, setTipoModelos] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState(null);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState("");
  const [tipoModelo, setTipoModelo] = useState(null);
  const [modeloSeleccionado, setModeloSeleccionado] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      const snap = await getDocs(collection(db, "ModeloInventario"));
      const art = await getDocs(collection(db, "Articulo"));
      const tipos = await getDocs(collection(db, "TipoModeloInventario"));

      // Artículos activos
      const articulosActivos = art.docs
        .map(d => ({
          id: d.id,
          nombre: d.data().nombreArticulo,
          demandaArticulo: d.data().demandaArticulo,
          stockActualArticulo: d.data().stockActualArticulo,
          costoAlmacenamientoArticulo: d.data().costoAlmacenamientoArticulo,
          baja: d.data().fechaHoraBajaArticulo || null,
        }))
        .filter(a => !a.baja);

      // Modelos activos Y cuyo artículo siga activo
      const modelosFiltrados = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a =>
          !a.fechaHoraBajaArticulo &&
          articulosActivos.some(a2 => a2.id === a.articuloId)
        );

      const tiposModelosArr = tipos.docs.map(d => ({ id: d.id, ...d.data() }));

      setArticulos(articulosActivos);
      setModelos(modelosFiltrados);
      setTipoModelos(tiposModelosArr);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setData(null);
      setTipoModelo(null);
      return;
    }
    const load = async () => {
      const ref = doc(db, "ModeloInventario", selectedId);
      const snap = await getDoc(ref);
      if (!snap.exists() || snap.data().fechaHoraBajaArticulo) {
        setData(null);
        setTipoModelo(null);
        return;
      }
      const modelo = snap.data();
      setData(modelo);
      // Buscar tipo de modelo (probar varios campos)
      let tipo = tipoModelos.find(tm => tm.id === modelo.tipoModeloId);
      if (!tipo) {
        // Probar si el campo es tipoModeloID, tipo_modelo_id, etc.
        tipo = tipoModelos.find(tm => tm.id === modelo.tipoModeloID || tm.id === modelo.tipo_modelo_id);
      }
      setTipoModelo(tipo);
    };
    load();
  }, [selectedId, tipoModelos]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!data || !selectedId) return;
    // Validar datos numéricos
    if (!data.desviacionEstandar || Number(data.desviacionEstandar) <= 0 || (tipoModelo && (tipoModelo.nombre === "Modelo de Periodo Fijo" || tipoModelo.nombreModeloInventario === "Modelo de Periodo Fijo") && (!data.periodoRevision || Number(data.periodoRevision) <= 0))) {
      alert("Complete correctamente los campos numéricos");
      return;
    }

    // Usar siempre el objeto completo del artículo seleccionado
    let articulo = articuloSeleccionado;
    if (!articulo || !articulo.demandaArticulo) {
      articulo = articulos.find(a => a.id === (articuloSeleccionado.id || articuloSeleccionado));
    }
    if (!articulo || !articulo.demandaArticulo) {
      alert('No se pudo obtener el objeto completo del artículo.');
      return;
    }
    const tipo = tipoModelo;
    // Buscar proveedor predeterminado
    let proveedor = null;
    try {
      const provSnap = await getDocs(collection(db, "Articulo", articulo.id, "ArticuloProveedor"));
      const pred = provSnap.docs.find(d => d.data().esProveedorPredeterminado);
      proveedor = pred ? pred.data() : null;
    } catch (e) {
      proveedor = null;
    }

    // Calcular modelo actualizado
    let modeloInventarioActualizado = CalcularModeloInventario(
      articulo,
      tipo,
      null,
      proveedor,
      modeloSeleccionado,
      data
    );
    // Si es de Lote Fijo, asegurar periodoRevision = 0
    if (
      tipo &&
      (tipo.nombre === "Modelo de Lote Fijo")
    ) {
      modeloInventarioActualizado.periodoRevision = 0;
    }
    
    if (tipo &&
      (tipo.nombre === "Modelo de Periodo Fijo")){
          modeloInventarioActualizado.puntoPedido = 0;
    }

    await updateDoc(doc(db, "ModeloInventario", selectedId), {
      ...modeloInventarioActualizado
    });
    alert("Modelo actualizado correctamente");
  };

  // Getters
  const getModeloDeArticulo = (id) =>
    modelos.find((m) => m.codArticulo === id || m.articuloId === id);

  return (
    <form onSubmit={handleUpdate}>
      <div className="container my-4">
        <h4 className="text-center mb-5">✏️ Editar Modelo de Inventario</h4>

        <label>Seleccionar Artículo</label>
        <select
          className="form-select mb-5"
          value={articuloSeleccionado?.id || ''}
          onChange={e => {
            const art = articulos.find(a => a.id === e.target.value);
            setArticuloSeleccionado(art);
            // Buscar el modelo asociado a este artículo
            const modelo = getModeloDeArticulo(e.target.value);
            setSelectedId(modelo ? modelo.id : '');
            setModeloSeleccionado(modelo || '');
          }}
        >
          <option value="">Seleccione un artículo</option>
          {articulos.map(a => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>

        {/* Renderizar inputs solo si data y tipoModelo están definidos y el tipo tiene nombre válido */}
        {data && tipoModelo ? (
          <>
            {(tipoModelo.nombre === "Modelo de Lote Fijo") && (
              <div className="mb-3">
                <label>Desviación estándar</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="any"
                  value={data.desviacionEstandar || ''}
                  onChange={e => setData({ ...data, desviacionEstandar: e.target.value })}
                  placeholder="Ingrese la desviación estándar"
                />
              </div>
            )}

            {(tipoModelo.nombre === "Modelo de Periodo Fijo") && (
              <>
                <div className="mb-3">
                  <label>Desviación estándar</label>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="any"
                    value={data.desviacionEstandar || ''}
                    onChange={e => setData({ ...data, desviacionEstandar: e.target.value })}
                    placeholder="Ingrese la desviación estándar"
                  />
                </div>
                <div className="mb-3">
                  <label>Periodo de revisión (días)</label>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    step="1"
                    value={data.periodoRevision || ''}
                    onChange={e => setData({ ...data, periodoRevision: e.target.value })}
                    placeholder="Ingrese el periodo de revisión"
                  />
                </div>
              </>
            )}

            <button className="btn btn-warning">Actualizar</button>
          </>
        ) : (
          selectedId && <div className="alert alert-warning">No se encontró modelo o tipo de modelo para este artículo. Revisa la consola para más detalles.</div>
        )}
      </div>
    </form>
  );
}
