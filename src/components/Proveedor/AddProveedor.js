import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import db from "../../firebase";

export default function AddProveedor() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return alert("Nombre es requerido");

    const docRef = await addDoc(collection(db, "Proveedor"), {
      nombreProveedor: nombre,
      nroTelefonoProveedor: telefono,
      fechaHoraAltaProveedor: new Date(),
      fechaHoraBajaProveedor: null,
    });

    alert("Proveedor creado. Ahora debes asociarle un artículo.");
    navigate("/add-producto-proveedor", { state: { idProveedor: docRef.id } });
  };

  return (
    <form onSubmit={handleSubmit} className="container my-4">
      <h4 className="mb-5 text-center">➕ Alta de Proveedor</h4>
      
      <div>
        <text className="form-text mb-3">Nombre</text>
        <input
          className="form-control mb-2"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>
      
      <div>
        <text className="form-text mb-3">Numero de telefono</text>
        <input
          className="form-control mb-3"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
      </div>

      <div className="text-center mb-5">
        <button className="btn btn-success px-4 py-2">Guardar</button>
      </div>
    </form>
  );
}
