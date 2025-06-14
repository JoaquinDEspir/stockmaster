import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import db from "../../firebase";

export default function UpdateProveedor() {
  const [proveedores, setProveedores] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [proveedor, setProveedor] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "Proveedor"));
      const lista = snap.docs
        .map(d => ({
          id: d.id,
          nombre: d.data().nombreProveedor,
          baja: d.data().fechaHoraBajaProveedor || null,
        }))
        .filter(p => !p.baja);
      setProveedores(lista);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!selectedId) return setProveedor(null);
    const load = async () => {
      const ref = doc(db, "Proveedor", selectedId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (!data.fechaHoraBajaProveedor) {
          setProveedor(data);
        } else {
          setProveedor(null);
        }
      } else {
        setProveedor(null);
      }
    };
    load();
  }, [selectedId]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const ref = doc(db, "Proveedor", selectedId);
    await updateDoc(ref, {
      nombreProveedor: proveedor.nombreProveedor,
      nroTelefonoProveedor: proveedor.nroTelefonoProveedor,
    });
    alert("Proveedor actualizado");
  };

  return (
    <div className="container my-4">
      <h4 className="text-center mb-5"> ✏️ Actualizar Proveedor</h4>

      <text className="form-text mb-3">Seleccionar proveedor</text>
      <select
        className="form-select mb-3"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Seleccionar proveedor</option>
        {proveedores.map(p => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>

      {proveedor && (
        <form onSubmit={handleUpdate}>
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Nombre</label>
            <div className="col-sm-9">
              <input
                className="form-control mb-2"
                value={proveedor.nombreProveedor}
                onChange={(e) =>
                  setProveedor({ ...proveedor, nombreProveedor: e.target.value })
                }
              />
            </div>
          </div>

          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">Número de Teléfono</label>
            <div className="col-sm-9">
              <input
                className="form-control mb-2"
                value={proveedor.nroTelefonoProveedor}
                onChange={(e) =>
                  setProveedor({ ...proveedor, nroTelefonoProveedor: e.target.value })
                }
              />
            </div>
          </div>
          
          <div className="text-center mb-4 mt-5">
            <button className="btn btn-warning px-4 py-2">Actualizar</button>
          </div>
        </form>
      )}
      {/* Mensaje si el proveedor está dado de baja */}
      {selectedId && !proveedor && (
        <div className="alert alert-danger mt-3">
          Este proveedor fue dado de baja y no puede ser editado.
        </div>
      )}
    </div>
  );
}
