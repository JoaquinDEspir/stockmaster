import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from "firebase/firestore";
import db from "../../firebase";

export default function UpdateArticuloProveedor() {
  const [articulos, setArticulos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [articuloId, setArticuloId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [data, setData] = useState(null);
  const [bajaRelacion, setBajaRelacion] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      
      // Artículos activos
      const artSnap = await getDocs(collection(db, "Articulos"));
      setArticulos(
        artSnap.docs
          .map(d => ({
            id: d.id,
            nombre: d.data().nombreArticulo,
            baja: d.data().fechahorabaja || null,
          }))
          .filter(a => !a.baja)
      );

      // Proveedores activos
      const provSnap = await getDocs(collection(db, "Proveedor"));
      setProveedores(
        provSnap.docs
          .map(d => ({
            id: d.id,
            nombre: d.data().nombreProveedor,
            baja: d.data().fechaHoraBajaProveedor || null,
          }))
          .filter(p => !p.baja)
      );
    };
    fetch();
  }, []);

  useEffect(() => {
    const load = async () => {
      setData(null);
      setBajaRelacion(false);
      if (!articuloId || !proveedorId) return;
      const ref = doc(db, "Articulos", articuloId, "ArticuloProveedor", proveedorId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        if (d.fechaHoraBajaArticuloProveedor) {
          setBajaRelacion(true);
          setData(null);
        } else {
          setBajaRelacion(false);
          setData({
            ...d,
            desviacionEstandar: d.desviacionEstandar !== undefined ? d.desviacionEstandar : 1,
            periodoRevision: d.periodoRevision !== undefined ? d.periodoRevision : 7
          });
        }
      }
    };
    load();
  }, [articuloId, proveedorId]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    const ref = doc(db, "Articulos", articuloId, "ArticuloProveedor", proveedorId);
    await updateDoc(ref, {
      costoCompra: parseFloat(data.costoCompra),
      costoPedidoArticulo: parseFloat(data.costoPedidoArticulo),
      demoraEntrega: parseInt(data.demoraEntrega),
      precioUnitario: parseFloat(data.precioUnitario),
      esProveedorPredeterminado: data.esProveedorPredeterminado,
      desviacionEstandar: parseFloat(data.desviacionEstandar),
      periodoRevision: parseInt(data.periodoRevision)
    });
    alert("Actualizado correctamente");
  };

  return (
    <div className="container my-4">
      <h4 className="text-center mb-5"> ✏️ Actualizar Proveedor-Artículo</h4>

      <text className="form-text mb-3">Seleccionar Artículo</text>
      <select className="form-select mb-2" value={articuloId} onChange={(e) => setArticuloId(e.target.value)}>
        <option value="">Seleccionar artículo</option>
        {articulos.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>

      <text className="form-text mb-3">Seleccionar Proveedor</text>
      <select className="form-select mb-2" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
        <option value="">Seleccionar proveedor</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>

      {/* Si relación dada de baja lógica */}
      {bajaRelacion && (
        <div className="alert alert-danger mt-3">
          Esta relación proveedor-artículo fue dada de baja y no puede ser editada.
        </div>
      )}

      {data && !bajaRelacion && (
        <form onSubmit={handleUpdate}>

          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Precio Unitario</label>
            <div className="col-sm-9">
              <input
                className="form-control mb-2"
                type="number"
                value={data.precioUnitario}
                onChange={(e) => setData({ ...data, precioUnitario: e.target.value })}
                placeholder="Precio unitario"
              />
            </div>
          </div>

          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Demora Entrega en dias</label>
            <div className="col-sm-9">
              <input
                className="form-control mb-2"
                type="number"
                value={data.demoraEntrega}
                onChange={(e) => setData({ ...data, demoraEntrega: e.target.value })}
                placeholder="Demora en días"
              />
            </div>
          </div>
          
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Costo compra</label>
            <div className="col-sm-9">
              <input className="form-control" type="number"
                value={data.costoCompra}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor < 0) {
                    alert("El costo de compra no puede ser negativo");
                  } else {
                  setData({ ...data, costoCompra: e.target.value })
                  }
                }}/>
            </div>
          </div>

          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Costo pedido</label>
            <div className="col-sm-9">
              <input className="form-control" type="number"
                value={data.costoPedidoArticulo}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor < 0) {
                    alert("El costo de pedido no puede ser negativo");
                  } else {
                    setData({ ...data, costoPedidoArticulo: e.target.value })
                  }
                }}/>
            </div>
          </div>
          
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Desviación Estandar</label>
            <div className="col-sm-9">
              <input
                className="form-control mb-2"
                type="number"
                step="any"
                value={data.desviacionEstandar}
                onChange={(e) => setData({ ...data, desviacionEstandar: e.target.value })}
                placeholder="Desviación estándar de la demanda"
              />
            </div>
          </div>

          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Periodo de Revision en dias</label>
            <div className="col-sm-9">
              <input
                className="form-control mb-2"
                type="number"
                value={data.periodoRevision}
                onChange={(e) => setData({ ...data, periodoRevision: e.target.value })}
                placeholder="Período de revisión (días)"
              />
            </div>
          </div>

          <div className="form-check mb-3 mt-5">
            <input
              type="checkbox"
              className="form-check-input"
              id="checkPredeterminado"
              checked={data.esProveedorPredeterminado}
              onChange={async (e) => {
                const checked = e.target.checked;
                //validacion si se quiere marcar o desmarcar el proveedor predeterminado
                if (checked) {
                  
                  const proveedoresRef = collection(db, "Articulos", articuloId, "ArticuloProveedor");
                  const q = query(proveedoresRef, where("esProveedorPredeterminado", "==", true));
                  const snapshot = await getDocs(q);
                  const yaExisteOtro = snapshot.docs.some(docSnap => docSnap.id !== proveedorId);
                  
                  if (yaExisteOtro) {
                    alert("Ya existe un proveedor predeterminado para este artículo. Debe desmarcar el otro antes de continuar.");
                    setData({ ...data, esProveedorPredeterminado: false });
                    return;
                  }
                } else {
                    // Si se desmarca el proveedor predeterminado, verificar que no quede sin ninguno
                    const proveedoresRef = collection(db, "Articulos", articuloId, "ArticuloProveedor");
                    const q = query(proveedoresRef, where("esProveedorPredeterminado", "==", true));
                    const snapshot = await getDocs(q);
                    if (snapshot.empty) {
                      alert("No puede desmarcar el proveedor predeterminado si no hay otro marcado como tal");
                      setData({ ...data, esProveedorPredeterminado: true });
                      return;
                    }
                }
                
                setData({ ...data, esProveedorPredeterminado: checked });
              }}/>

            <label className="form-check-label" htmlFor="checkPredeterminado">
              Proveedor Predeterminado
            </label>
          </div>

          <div className="text-center mb-4 mt-5">
            <button className="btn btn-warning px-4 py-2">Actualizar</button>
          </div>
        </form>
      )}
    </div>
  );
}
