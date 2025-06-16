import { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import db from "../../firebase";

export default function AddArticuloProveedor() {
  const [articulos, setArticulos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const proveedorIdInicial = location.state?.idProveedor || "";

  const [articuloId, setArticuloId] = useState("");
  const [proveedorId, setProveedorId] = useState(proveedorIdInicial);
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [demoraEntrega, setDemoraEntrega] = useState("");
  const [esPredeterminado, setEsPredeterminado] = useState(false);
  const [costoPedido, setCostoPedido] = useState("");


  useEffect(() => {
    const fetchData = async () => {
      
      // Solo artículos activos y existentes
      const artSnap = await getDocs(collection(db, "Articulo"));
      setArticulos(
        artSnap.docs
          .map((d) => ({
            id: d.id,
            nombre: d.data().nombreArticulo,
            baja: d.data().fechaHoraBajaArticulo || null,
          }))
          .filter((a) => !a.baja)
      );

      // Solo proveedores activos y existentes
      const provSnap = await getDocs(collection(db, "Proveedor"));
      setProveedores(
        provSnap.docs
          .map((d) => ({
            id: d.id,
            nombre: d.data().nombreProveedor,
            baja: d.data().fechaHoraBajaProveedor || null,
          }))
          .filter((p) => !p.baja)
      );
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    //revisa que se haya seleccionado un articulo y un proveedor
    if (!articuloId || !proveedorId) return alert("Seleccioná artículo y proveedor");

    // Verificar que no haya más de un proveedor predeterminado para el mismo artículo
    if (esPredeterminado) {
      const proveedoresSnap = await getDocs(collection(db, "Articulo", articuloId, "ArticuloProveedor"));
      const yaPredeterminado = proveedoresSnap.docs.find(doc => doc.data().esProveedorPredeterminado === true);
      if (yaPredeterminado) {
        alert("Ya existe un proveedor predeterminado para este artículo. Solo puede haber uno.");
        return;
      }
    }

    // Obtener la demanda del artículo seleccionado
    const articuloSnap = await getDocs(collection(db, "Articulo"));
    const articulo = articuloSnap.docs.find(d => d.id === articuloId)?.data();
    const demanda = articulo?.demandaArticulo ? parseFloat(articulo.demandaArticulo) : 0;
    // Calcular costo de compra
    const costoCompra = parseFloat(precioUnitario) * demanda;

    //guardado del articulo-proveedor
    const ref = doc(db, "Articulo", articuloId, "ArticuloProveedor", proveedorId);
    await setDoc(ref, {
      demoraEntrega: parseInt(demoraEntrega),
      esProveedorPredeterminado: esPredeterminado,
      fechaHoraAltaArticuloProveedor: new Date(),
      fechaHoraBajaArticuloProveedor: null,
      precioUnitario: parseFloat(precioUnitario),
      codProveedor: proveedorId,
      costoCompra: costoCompra,
      costoPedidoArticulo: parseFloat(costoPedido),
    });

    alert("Articulo-Proveedor agregado correctamente");

    if (proveedorIdInicial) {
      navigate("/");
    } else {
      setProveedorId("");
    }

    setPrecioUnitario("");
    setDemoraEntrega("");
    setCostoPedido("");
    setEsPredeterminado(false);
  };

  return (
    //formulario de llenado de datos para agregar un proveedor a un artículo
    <form onSubmit={handleSubmit} className="container my-4">

      <h4 className="text-center mb-5">➕ Agregar Proveedor a un Artículo</h4>

      {proveedorIdInicial && (
        <div className="alert alert-warning">
          Este proveedor fue creado recién. Debe asociarse a al menos un artículo antes de continuar.
        </div>
      )}

      <div>

        <div className="form-text mb-3">
          <text>Seleccione un Articulo</text>
          <select
            className="form-select mb-3"
            value={articuloId}
            onChange={(e) => setArticuloId(e.target.value)}
          >
            <option value="">Seleccionar Artículo</option>
            {articulos.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </div>

        <div className="form-text mb-3">
          <text>Seleccione un Proveedor</text>
            <select
              className="form-select mb-3"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
            >
              <option value="">Seleccionar Proveedor</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
        </div>

        <div className="form-text mb-3">
          <text>Precio Unitario</text>
          <input
            type="number"
            className="form-control mb-2"
            value={precioUnitario}
            onChange={(e) => {
              const valor = parseFloat(e.target.value);
              if (valor < 0) {
                alert("El precio unitario no puede ser negativo");
                setPrecioUnitario("");
              } else {
                setPrecioUnitario(valor)
              }
            }}/>
        </div>

        <div className="form-text mb-3">
          <text>Demora Entrega en días</text>
          <input
            type="number"
            className="form-control mb-2"
            value={demoraEntrega}
            onChange={(e) => {
              const valor = parseFloat(e.target.value);
              if (valor < 0) {
                alert("La demora de entrega no puede ser negativa");
                setDemoraEntrega("");
              } else {
                setDemoraEntrega(valor)
              }
            }}/>
        </div>

          <div className="form-text mb-3">
            <text>Costo Pedido</text>
            <input className="form-control mb-2"
              type="number" value={costoPedido} onChange={(e) => {
                //logica para que el valor no pueda ser negativo
                  const valor = parseFloat(e.target.value);
                if (valor < 0) {
                  alert("El costo de pedido no puede ser negativo");
                  setCostoPedido("");
                } else {
                  setCostoPedido(valor);
                }
                }}/>
          </div>
          
        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            checked={esPredeterminado}
            onChange={(e) => setEsPredeterminado(e.target.checked)}
            id="predeterminado"
          />
          <label className="form-check-label" htmlFor="predeterminado">
            Proveedor Predeterminado
          </label>
        </div>
        
        <div className="text-center mb-4 mt-5">
        <button className="btn btn-success px-4 py-2">Guardar</button>
        </div>        
      </div>
    </form>
  );
}
