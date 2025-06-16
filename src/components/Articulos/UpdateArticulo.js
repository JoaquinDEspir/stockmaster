import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import db from "../../firebase";


export default function UpdateArticulo() {
  const [articulos, setArticulos] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [articulo, setArticulo] = useState(null);

  // Obtener lista de artículos activos (sin baja lógica)
  useEffect(() => {
    const fetchArticulos = async () => {
      const snapshot = await getDocs(collection(db, "Articulo"));
      const lista = snapshot.docs
        .map(doc => ({
          id: doc.id,
          nombre: doc.data().nombreArticulo,
          baja: doc.data().fechaHoraBajaArticulo || null,
        }))
        .filter((a) => !a.baja);
      setArticulos(lista);
    };
    fetchArticulos();
  }, []);

  // Cargar artículo seleccionado, solo si está activo
  useEffect(() => {
    if (!selectedId) {
      setArticulo(null);
      return;
    }
    const cargarArticulo = async () => {
      const ref = doc(db, "Articulo", selectedId);
      const snap = await getDoc(ref);
      if (snap.exists() && !snap.data().fechahorabaja) {
        setArticulo(snap.data());
      } else {
        setArticulo(null);
      }
    };
    cargarArticulo();
  }, [selectedId]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const ref = doc(db, "Articulo", selectedId);
    await updateDoc(ref, {
      ...articulo,
      costoAlmacenamientoArticulo: parseFloat(articulo.costoAlmacenamientoArticulo),
      //costoCompra: parseFloat(articulo.costoCompra),
      //costoPedidoArticulo: parseFloat(articulo.costoPedidoArticulo),
      demandaArticulo: parseInt(articulo.demandaArticulo),
      stockActualArticulo: parseInt(articulo.stockActualArticulo),
    });
    alert("Artículo actualizado");
  };

  return (
    <div className="container my-4">
      <h4 className="text-center mb-5">✏️ Actualizar Artículo</h4>
      
      <p className="text-secondary mb-1">
        Seleccioná un artículo para actualizar sus datos
      </p>

      <select
        className="form-select mb-5"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Seleccionar artículo</option>
        {articulos.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>

      {articulo && (
        <form onSubmit={handleUpdate}>
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Nombre</label>
            <div className="col-sm-9">
              <input className="form-control"
                value={articulo.nombreArticulo}
                onChange={(e) => setArticulo({ ...articulo, nombreArticulo: e.target.value })}
              />
            </div>
          </div>

          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Descripción</label>
            <div className="col-sm-9">
              <input className="form-control"
                value={articulo.descripcionArticulo}
                onChange={(e) =>setArticulo({ ...articulo, descripcionArticulo: e.target.value })}
              />
            </div>
          </div>

          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Costo almacenamiento</label>
            <div className="col-sm-9">
              <input className="form-control" type="number"
                value={articulo.costoAlmacenamientoArticulo}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor <= 0) {
                    alert("El costo de almacenamiento no puede ser negativo");
                  } else {
                    setArticulo({ ...articulo, costoAlmacenamientoArticulo: e.target.value })
                    // Re-Calcular el CGI
                    
                  }
                }}/>
            </div>
          </div>

          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Demanda Diaria</label>
            <div className="col-sm-9">
              <input className="form-control" type="number"
                value={articulo.demandaArticulo}
                onChange={(e) => {
                  const valor = e.target.value;
                if (valor < 0) {
                  alert("La demanda no puede ser negativa");
                } else {
                  setArticulo({ ...articulo, demandaArticulo: e.target.value })
                }                
                }}/>
            </div>
          </div>

          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Stock actual</label>
            <div className="col-sm-9">
              <input className="form-control" type="number"
                value={articulo.stockActualArticulo}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor < 0) {
                    alert("El stock no puede ser negativo");
                  } else {
                  setArticulo({ ...articulo, stockActualArticulo: e.target.value })
                  }
                }}/>
            </div>
          </div>

          <div className="text-center mb-4 mt-5">
            <button className="btn btn-warning px-4 py-2">Actualizar</button>
          </div>

        </form>
      )}
    </div>
  );
}
