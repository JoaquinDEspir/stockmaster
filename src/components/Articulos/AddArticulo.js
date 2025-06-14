//hola estoy probando la rama
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import db from "../../firebase";

export default function AddArticulo() {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [costoAlmacenamiento, setCostoAlmacenamiento] = useState("");
  const [demanda, setDemanda] = useState("");
  const [stock, setStock] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    await addDoc(collection(db, "Articulos"), {
      nombreArticulo: nombre,
      descripcionArticulo: descripcion,
      costoAlmacenamientoArticulo: parseFloat(costoAlmacenamiento),
      //costoCompra: parseFloat(costoCompra),
      //costoPedidoArticulo: parseFloat(costoPedido),
      demandaArticulo: parseInt(demanda),
      stockActualArticulo: parseInt(stock),
    });

    alert("Artículo agregado");
    setNombre("");
    setDescripcion("");
    setCostoAlmacenamiento("");
    //setCostoCompra("");
    //setCostoPedido("");
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
              const valor = e.target.value;
              //logica para que el valor no pueda ser negativo
              if (valor < 0) {
                alert("El costo de almacenamiento no puede ser negativo");
                setCostoAlmacenamiento("");
              } else {
                setCostoAlmacenamiento(e.target.value)
              }
              }} />
        </div>

        <div className="form-text mb-3">
          <text>Demanda Articulo</text>
          <input className="form-control mb-2"
            type="number" value={demanda} onChange={(e) => {
              const valor = e.target.value;
              //logica para que el valor no pueda ser negativo
              if (valor < 0) {
                alert("La demanda no puede ser negativa");
                setDemanda("");
              } else {
                setDemanda(e.target.value)
              }
            }}/>

        </div>
        
        <div className="form-text mb-3">
          <text>Stock Actual</text>
          <input className="form-control mb-2"
            type="number" value={stock} onChange={(e) => {
              const valor = e.target.value;
              //logica para que el valor no pueda ser negativo
              if (valor < 0) {
                alert("El stock no puede ser negativo");
                setStock("");
              } else {
                setStock(e.target.value)
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
