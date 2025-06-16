import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import db from "../../firebase";

export default function ResumenInventario() {
  const [articulos, setArticulos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [proveedores, setProveedores] = useState({});
  const [nombresProveedores, setNombresProveedores] = useState({});
  const [loading, setLoading] = useState(true);
  const [tipoModelos, setTipoModelos] = useState([]);

  useEffect(() => {
    const fetchDataAndCalculate = async () => {
      try {
        // Obtener todo en paralelo
        const [artSnap, modeloSnap, provSnap, tipoModeloSnap] = await Promise.all([
          getDocs(collection(db, "Articulo")),
          getDocs(collection(db, "ModeloInventario")),
          getDocs(collection(db, "Proveedor")),
          getDocs(collection(db, "TipoModeloInventario")),
        ]);

        // Filtrar tipo modelos activos
        const tipoModelosData = tipoModeloSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((tm) => !tm.fechaHoraBajaTipoModeloInventario);
        setTipoModelos(tipoModelosData);

        // Artículos activos
        const articulosData = artSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => !a.fechaHoraBajaArticulo); // filtrar artículos que no estan dados de baja

        // Modelos (sin filtrar)
        const modelosData = modeloSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setModelos(modelosData);

        // Nombres de proveedores activos
        const nombres = {};
        provSnap.docs.forEach((d) => {
          const data = d.data();
          if (!data.fechaHoraBajaProveedor) {
            nombres[d.id] = data.nombreProveedor || d.id;
          }
        });
        setNombresProveedores(nombres);

        // Obtener proveedores por artículo en paralelo
        const proveedoresData = await Promise.all(
          artSnap.docs.map(async (a) => {
            const sub = await getDocs(collection(db, "Articulo", a.id, "ArticuloProveedor"));
            return {
              id: a.id,
              proveedores: sub.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((p) => !p.fechaHoraBajaArticuloProveedor),
            };
          })
        );

        const provsMap = {};
        proveedoresData.forEach(({ id, proveedores }) => {
          provsMap[id] = proveedores;
        });
        setProveedores(provsMap);

        // Logs de advertencia
        for (const a of articulosData) {
          const m = modelosData.find((m) => m.articuloId === a.id);
          const listaProv = provsMap[a.id] || [];
          const pred = listaProv.find(p => p.esProveedorPredeterminado);

          if (!m) console.log(`❌ Sin modelo para ${a.nombreArticulo}`);
          if (!pred) console.log(`❌ Sin proveedor predeterminado para ${a.nombreArticulo}`);
        }

        setArticulos(articulosData);
        setLoading(false);
      } catch (error) {
        console.error("Error al cargar datos de inventario:", error);
      }
    };

    fetchDataAndCalculate();
  }, []);

  // Helpers
  const getModeloDeArticulo = (id) => modelos.find((m) => m.articuloId === id);
  const getTipoModelo = (id) => tipoModelos.find((tm) => tm.id === id);
  const tieneOrdenPendiente = (articuloId) => false; // TODO: lógica real
  const getProveedorPredeterminado = (articuloId) => {
    const lista = proveedores[articuloId] || [];
    return lista.find(p => p.esProveedorPredeterminado) || null;
  };

  // CALCULO DE CGI 
  const calcularCGI = (articulo, modelo, tm ,proveedorArticulo) => {
    if (!articulo) {
      console.log ('No hay articulo');
      return null;
    } else if (!modelo) {
      console.log ('No hay modelo');
      return null;
    } else if (!proveedorArticulo) {
      console.log ('No hay proveedor articulo');
      return null;
    }
    
    const costoAlmacenamiento = parseFloat(articulo.costoAlmacenamientoArticulo);
    const demanda = parseFloat(articulo.demandaArticulo);
    const demandaAnual = demanda * 365;
    const costoPedido = parseFloat(proveedorArticulo.costoPedidoArticulo);
    const loteOptimo = parseFloat(modelo.cantidadAPedirOptima);
    const costoPorUnidad = parseFloat(proveedorArticulo.precioUnitario);

    if ([costoAlmacenamiento, demanda, costoPedido, loteOptimo, costoPorUnidad].some(isNaN)) {
      return null;
    }
    if (!articulo || !modelo || !tm ||tm.nombre !== "Modelo de Lote Fijo" || !modelo.cantidadAPedirOptima || !proveedorArticulo) return null;

    const cgi = ((demandaAnual / loteOptimo) * costoPedido) +
                (demandaAnual * costoPorUnidad) +
                ((loteOptimo / 2) * costoAlmacenamiento);
    return cgi.toFixed(2);
  };

  const getRowClass = (a, m) => {
    if (!m) return "";
    if (a.stockActualArticulo <= m.puntoPedido && !tieneOrdenPendiente(a.id)) return "table-danger";
    if (a.stockActualArticulo <= m.stockSeguridad) return "table-warning";
    return "";
  };

  if (loading) return <div className="text-center my-5">Cargando inventario...</div>;

  return (
    <div className="container my-4">
      <h4>📊 Resumen de Artículos e Inventario</h4>
      <div className="table-responsive">
        <table className="table table-bordered table-striped">
          <thead className="table-dark">
            <tr>
              <th>Artículo</th>
              <th>Stock</th>
              <th>Demanda</th>
              <th>Modelo</th>
              <th>Lote óptimo</th>
              <th>Punto pedido</th>
              <th>Stock Seguridad</th>
              <th>CGI</th>
              <th>Per. Revisión (días)</th>
              <th>Proveedores</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {articulos.map((a) => {
              const m = getModeloDeArticulo(a.id);
              if (!m) return null;

              const tm = getTipoModelo(m.tipoModeloId);
              const proveedorPred = getProveedorPredeterminado(a.id);
              const rowClass = getRowClass(a, m);
              const listaProv = proveedores[a.id] || [];

              let estado = "✅ OK";
              if (a.stockActualArticulo <= (m.stockSeguridad ?? 0)) {
                estado = "🟠 Faltante";
              } else if (a.stockActualArticulo <= (m.puntoPedido ?? 0) && !tieneOrdenPendiente(a.id)) {
                estado = "🔴 Reponer";
              }

              return (
                <tr key={a.id} className={rowClass}>
                  <td>{a.nombreArticulo}</td>
                  <td>{a.stockActualArticulo}</td>
                  <td>{a.demandaArticulo}</td>
                  <td>{tm?.nombre ?? "-"}</td>
                  <td>{m.cantidadAPedirOptima ?? "-"}</td>
                  <td>{m.puntoPedido ?? "-"}</td>
                  <td>{m.stockSeguridad ?? "-"}</td>
                  <td>{calcularCGI(a, m, tm, proveedorPred) ?? "-"}</td>
                  <td>{m.periodoRevision ?? "-"}</td>
                  <td>
                    {listaProv.length > 0
                      ? listaProv.map((p, i) => (
                          <div key={i}>
                            {nombresProveedores[p.codProveedor] || p.codProveedor} ({p.precioUnitario}){" "}
                            {p.esProveedorPredeterminado ? "⭐" : ""}
                          </div>
                        ))
                      : "-"}
                  </td>
                  <td>{estado}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
