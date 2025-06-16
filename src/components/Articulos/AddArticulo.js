//hola estoy probando la rama
import { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import db from "../../firebase";

export default function AddArticulo() {
  // Variables del Articulo
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [costoAlmacenamiento, setCostoAlmacenamiento] = useState("");
  const [demanda, setDemanda] = useState("");
  const [stock, setStock] = useState("");

  // Funcion para guardar el articulo
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evitar que se envíe el formulario

    // Validar que todos los campos estén completos
    if (!nombre || !descripcion || !costoAlmacenamiento || !demanda || !stock) {
      alert("Por favor, rellena todos los campos");
      return;
    }

    // Guardar el artículo en la base de datos
    await addDoc(collection(db, "Articulo"), {
      nombreArticulo: nombre,
      descripcionArticulo: descripcion,
      costoAlmacenamientoArticulo: parseFloat(costoAlmacenamiento),
      demandaArticulo: parseInt(demanda),
      stockActualArticulo: parseInt(stock),
      fechaHoraAltaArticulo: Timestamp.now(),
      fechaHoraBajaArticulo: null,
    });

    alert("Artículo agregado");
    setNombre("");
    setDescripcion("");
    setCostoAlmacenamiento("");
    setDemanda("");
    setStock("");
  };

  return (

    //formulario para agregar un nuevo artículo
    <form onSubmit={handleSubmit} className="container my-3">
      <h4 className="text-center">➕ Agregar Artículo</h4>
      <h5 className="mb-4">Nuevo Artículo</h5>

      <div>
        <div className="form-text mb-3">
          <text className="">Nombre Articulo</text>
          <input className="form-control mb-2"
            value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>

        <div className="form-text mb-3">
          <text>Descripcion articulo</text>
          <input className="form-control mb-2"
            value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        <div className="form-text mb-3">
          <text>Costo Almacenamiento</text>
          <input className="form-control mb-2"
            type="number" value={costoAlmacenamiento} onChange={(e) => {
              const valor = parseFloat(e.target.value);
              //logica para que el valor no pueda ser negativo
              if (valor <= 0) {
                alert("El costo de almacenamiento no puede ser negativo");
                setCostoAlmacenamiento("");
              } else {
                setCostoAlmacenamiento(valor)
              }
              }} />
        </div>

        <div className="form-text mb-3">
          <text>Demanda Diaria Articulo</text>
          <input className="form-control mb-2"
            type="number" value={demanda} onChange={(e) => {
              const valor = parseInt(e.target.value);
              //logica para que el valor no pueda ser negativo
              if (valor < 0) {
                alert("La demanda no puede ser negativa");
                setDemanda("");
              } else {
                setDemanda(valor)
              }
            }}/>

        </div>
        
        <div className="form-text mb-3">
          <text>Stock Actual</text>
          <input className="form-control mb-2"
            type="number" value={stock} onChange={(e) => {
              const valor = parseInt(e.target.value);
              //logica para que el valor no pueda ser negativo
              if (valor < 0) {
                alert("El stock no puede ser negativo");
                setStock("");
              } else {
                setStock(valor)
              }
              }} />
        </div>
        <div className="text-center mb-4 mt-5">
          <button className="btn btn-success px-4 py-2">Guardar</button>
        </div>
      </div>

    </form>
  );
}
