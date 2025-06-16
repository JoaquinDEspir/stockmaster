import { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import db from "../../firebase";
import CalcularModeloInventario from "./calcularModeloInventario";


export default function AddModeloInventario() {
  // Lista de artículos
  const [articulos, setArticulos] = useState([]);
  const [tiposModelo, setTiposModelo] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [modelosInventario, setModelosInventario] = useState([]);
  const [formData, setFormData] = useState({
    desviacion: '',
    periodoRevision: ''
  });

  // Cargar datos de articulos, tipos de modelos y modelos
  useEffect(() => {
    const fetchData = async () => {
      const articulosSnapshot = await getDocs(collection(db, 'Articulo'));
      const tiposSnapshot = await getDocs(collection(db, 'TipoModeloInventario'));
      const modelosSnapshot = await getDocs(collection(db, 'ModeloInventario'));
      setArticulos(articulosSnapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          baja: doc.data().fechaHoraBajaArticulo || null,
          ...doc.data() }))
        .filter(a => !a.baja)
        );
      setTiposModelo(tiposSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setModelosInventario(modelosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, []);

  // Función para obtener el costo del pedido del proveedor predeterminado
  async function obtenerCostoPedidoProveedorPredeterminado(articuloId) {
    const proveedoresSnap = await getDocs(
      collection(db, "Articulo", articuloId, "ArticuloProveedor")
    );
    const predeterminado = proveedoresSnap.docs.find(
      (doc) => doc.data().esProveedorPredeterminado === true
    );
    if (!predeterminado) {
      alert("El artículo no tiene proveedor predeterminado");
      return null;
    }
    return predeterminado.data().costoPedidoArticulo;
  }

  // Función para obtener el objeto ArticuloProveedor predeterminado
  async function obtenerProveedorPredeterminado(articuloId) {
    const proveedoresSnap = await getDocs(
      collection(db, "Articulo", articuloId, "ArticuloProveedor")
    );

    const predeterminadoDoc = proveedoresSnap.docs.find(
      (doc) => doc.data().esProveedorPredeterminado === true
    );

    if (!predeterminadoDoc) {
      alert("El artículo no tiene proveedor predeterminado");
      return null;
    }

    return { id: predeterminadoDoc.id, ...predeterminadoDoc.data() };
}


  // Funcion para guardar el modelo de inventario
  const handleSave = async (e) => {
    e.preventDefault();
    if (!articuloSeleccionado || !tipoSeleccionado) {
      alert('Debe seleccionar un artículo y un modelo');
      return;
    }

    // Obtener costo pedido del proveedor predeterminado
    const articuloProveedor = await obtenerProveedorPredeterminado(articuloSeleccionado.id);
    console.log(`Este el el articuloProveedor predeterminado ${articuloProveedor}`);
    if (!articuloProveedor) {
      alert('El artículo no tiene proveedor predeterminado');
      return;
    }

    // Verificar si el artículo ya tiene un modelo de inventario asociado
    if( modelosInventario.some(modelo => modelo.articuloId === articuloSeleccionado.id )) {  
      alert('El artículo ya tiene un modelo de inventario asociado');
      // Limpiar formulario
      setArticuloSeleccionado('');
      setTipoSeleccionado('');
      setFormData({ desviacion: '', periodoRevision: '' });
      return;
    }
    
    // Calcular el modelo de inventario
    const modeloInventarioParaGuardar = CalcularModeloInventario(articuloSeleccionado, tipoSeleccionado, formData, articuloProveedor);
    
    await addDoc(collection(db, 'ModeloInventario'), modeloInventarioParaGuardar);
    alert('Modelo de Inventario agregado correctamente');
    setFormData({ desviacion: '', periodoRevision: '' });

    // Limpiar formulario
      setArticuloSeleccionado('');
      setTipoSeleccionado('');
      setFormData({ desviacion: '', periodoRevision: '' });
  };

  return (
    <form onSubmit={handleSave}>
      <div className="p-4">
        <h4 className="text-center mb-5">Agregar Modelo de Inventario</h4>
        
        <p>Seleccione un Articulo</p>
        <div className="form-text mb-3">
          <select className="form-select mb-5" value={articuloSeleccionado?.id || ''} onChange={e => {
            const art = articulos.find(a => a.id === e.target.value);
            setArticuloSeleccionado(art || '');
          }}>
            <option value="">Seleccione un artículo</option>
            {articulos
              .filter(a => !modelosInventario.some(m => m.articuloId === a.id))
              .map(a => (
                <option key={a.id} value={a.id}>{a.nombreArticulo}</option>
              ))}
          </select>
        </div>

        <p>Seleccione un Modelo</p>
        <div className="form-text mb-3">
          <select className="form-select mb-5" value={tipoSeleccionado?.id || ''} onChange={e => {
            const tipo = tiposModelo.find(t => t.id === e.target.value);
            setTipoSeleccionado(tipo || '');
          }}>
            <option value="">Seleccione un tipo</option>
            {tiposModelo.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>

        {tipoSeleccionado && (
          <>
            <text>Desviación estándar</text>
            <div className="form-text mb-3">
              <input
                type="number"
                className="form-control mb-2"
                value={formData.desviacion}
                onChange={e => setFormData({ ...formData, desviacion: parseInt(e.target.value) })}
              />
            </div>
            {tiposModelo.find(t => t.id === tipoSeleccionado.id)?.nombre === 'Modelo de Periodo Fijo' && (
              <div className="mb-4">
                <label>Periodo de revisión en días</label>
                <input
                  type="number"
                  className="form-control mb-2"
                  value={formData.periodoRevision}
                  onChange={e => setFormData({ ...formData, periodoRevision: parseInt(e.target.value) })}
                />
              </div>
            )}
          </>
        )}

        <div className="text-center mb-4 mt-5">
          <button className="btn btn-success px-4 py-2" type="submit">
            Guardar
          </button>
        </div>
      </div>
    </form>
  );
}
