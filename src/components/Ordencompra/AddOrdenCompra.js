import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, setDoc, getDoc } from "firebase/firestore";
import db from "../../firebase";

export default function AddOrdenPorArticulo() {
  const [articulosDisponibles, setArticulosDisponibles] = useState([]);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState({});
  const [proveedoresPorArticulo, setProveedoresPorArticulo] = useState({});

  // Cargar proveedores y artículos con proveedor predeterminado activo
  useEffect(() => {
    const fetchArticulosConProveedor = async () => {
      const provSnap = await getDocs(collection(db, "Proveedor"));
      const provMap = {};
      provSnap.docs.forEach(d => {
        provMap[d.id] = d.data().nombreProveedor;
      });
      setProveedores(provMap);

      const artSnap = await getDocs(collection(db, "Articulo"));
      const articulos = [];

      for (const artDoc of artSnap.docs) {
        const art = artDoc.data();
        if (art.fechaHoraBajaArticulo) continue;

        //me traigo al proveedor predeterminado
        const provArtSnap = await getDocs(collection(db, "Articulo", artDoc.id, "ArticuloProveedor"));
        const pred = provArtSnap.docs.find(
          p => p.data().esProveedorPredeterminado && !p.data().fechaHoraBajaArticuloProveedor
        );
        if (!pred) continue;

        const proveedor = pred.data();
        const nombreProveedorReal = proveedor.nombreProveedor;

        const modelosSnap = await getDocs(collection(db, "ModeloInventario"));
        const modelo = modelosSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(m => m.articuloId === artDoc.id);

        let cantidadSugerida = null;
        let mostrarSugerencia = false;

        if (modelo) {
          cantidadSugerida = modelo.cantidadAPedirOptima;
          mostrarSugerencia = true;
        }

        articulos.push({
          id: artDoc.id,
          nombre: art.nombreArticulo,
          proveedorPredeterminado: proveedor,
          nombreProveedor: nombreProveedorReal,
          cantidadSugerida,
          mostrarSugerencia,
          modelo,
          stockActual: art.stockActualArticulo || 0,
          puntoPedido: modelo?.puntoPedido || "-",
        });
      }
      setArticulosDisponibles(articulos);
    };
    fetchArticulosConProveedor();
  }, []);

  // Cargar proveedores relacionados a cada artículo seleccionado
  useEffect(() => {
    const fetchProveedoresPorArticulo = async () => {
      const nuevo = {};
      for (const item of items) {
        if (!item.codArticulo) continue;
        const provArtSnap = await getDocs(collection(db, "Articulo", item.codArticulo, "ArticuloProveedor"));

        const relaciones = [];
        for (const rel of provArtSnap.docs.filter(p => !p.data().fechaHoraBajaArticuloProveedor)) {
          const dataRel = rel.data();
          const provRef = doc(db, "Proveedor", dataRel.codProveedor);
          const provSnap = await getDoc(provRef);
          const proveedorReal = provSnap.exists() ? provSnap.data() : {};

          relaciones.push({
            id: rel.id,
            ...dataRel,
            nombreProveedor: proveedorReal.nombreProveedor || dataRel.nombreProveedor || "Proveedor sin nombre"
          });
          }
          nuevo[item.codArticulo] = relaciones;
        }
      setProveedoresPorArticulo(nuevo);
      
    };
    fetchProveedoresPorArticulo();
  }, [items]);

  const handleAgregarItem = () => {
    setItems([...items, { codArticulo: "", cantidad: "", codProveedor: "" }]);
  };

  const handleEliminarItem = (index) => {
    const nuevo = [...items];
    nuevo.splice(index, 1);
    setItems(nuevo);
  };

  const handleItemChange = (index, campo, valor) => {
    const nuevo = [...items];
    nuevo[index][campo] = valor;
    // Si cambia el artículo, resetea el proveedor seleccionado
    if (campo === "codArticulo") {
      nuevo[index].codProveedor = "";
    }
    setItems(nuevo);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return alert("Agregá al menos un artículo");

    // Obtener número de orden incremental
    const ordenesSnap = await getDocs(collection(db, "OrdenCompra"));
    let numeroDeOrdenCompra = 1;
    ordenesSnap.forEach(doc => {
      const orden = doc.data();
      if (orden.numeroDeOrdenCompra) {
        numeroDeOrdenCompra = Math.max(numeroDeOrdenCompra, orden.numeroDeOrdenCompra + 1);
      }
    });

    for (const item of items) {
      if (!item.codArticulo || !item.cantidad) {
        return alert("Completá todos los campos");
      }

      const articulo = articulosDisponibles.find(a => a.id === item.codArticulo);
      if (!articulo) return alert("Artículo no válido");

      const cantidadPedida = parseInt(item.cantidad, 10);
      if (isNaN(cantidadPedida) || cantidadPedida < 1) {
        return alert("La cantidad debe ser un número mayor a 0");
      }

      // --- VERIFICACIÓN DE OC ACTIVA ---
      // Determinar el proveedor seleccionado o predeterminado
      let codProveedor = item.codProveedor;
      if (!codProveedor) {
        const relaciones = proveedoresPorArticulo[item.codArticulo] || [];
        const pred = relaciones.find(p => p.esProveedorPredeterminado);
        codProveedor = pred ? pred.codProveedor : articulo.proveedorPredeterminado.codProveedor;
      }

      // Buscar si ya existe una OC activa para este artículo y proveedor
      const ocSnap = await getDocs(collection(db, "OrdenCompra"));
      for (const docOC of ocSnap.docs) {
        const dataOC = docOC.data();
        if (
          dataOC.codArticulo === item.codArticulo &&
          dataOC.codProveedor === codProveedor
        ) {
          // Buscar estado actual de la OC
          const estadosSnap = await getDocs(collection(db, "OrdenCompra", docOC.id, "EstadoOrdenCompra"));
          const tieneOCActiva = estadosSnap.docs.some(
            d =>
              !d.data().fechaHoraBajaEstadoCompra &&
              (d.data().nombreEstadoCompra === "Pendiente" || d.data().nombreEstadoCompra === "Enviada")
          );
          if (tieneOCActiva) {
            return alert("Ya existe una Orden de Compra pendiente o enviada para este artículo y proveedor.");
          }
        }
      }
      // --- FIN VERIFICACIÓN ---

      //sugerencia de que tiene que comprar mas que el punto de pedido y que el modelo sea de lote fijo
      if (
        articulo.mostrarSugerencia &&
        cantidadPedida + articulo.stockActual <= articulo.puntoPedido &&
        articulo.modelo.tipoModeloId == "modelo1"
      ) {
        return alert(
          `La cantidad pedida para "${articulo.nombre}" debe ser mayor a la cantidad del Punto de Pedido (${articulo.puntoPedido}).`
        );
      }
    }

    for (const item of items) {
      const articulo = articulosDisponibles.find(a => a.id === item.codArticulo);
      const fecha = new Date();


      // Buscar el precio unitario correcto según el proveedor elegido
      const relaciones = proveedoresPorArticulo[item.codArticulo] || [];
      const proveedorElegido = relaciones.find(r => r.codProveedor === codProveedor);

      const precioUnitario = proveedorElegido
        ? proveedorElegido.precioUnitario
        : articulo.proveedorPredeterminado.precioUnitario;

      //creamos la orden de compra
      const ordenRef = await addDoc(collection(db, "OrdenCompra"), {
        fechaHoraOrdenCompra: fecha,
        codProveedor,
        codArticulo: articulo.id,
        numeroDeOrdenCompra,
        cantidadComprada: item.cantidad,
        totalOrdenCompra: item.cantidad * precioUnitario,
      });

      await setDoc(doc(db, "OrdenCompra", ordenRef.id, "EstadoOrdenCompra", "Pendiente"), {
        nombreEstadoCompra: "Pendiente",
        fechaHoraAltaEstadoCompra: fecha,
        fechaHoraBajaEstadoCompra: null,
      });
    }

    alert("Órden de compra registrada correctamente");
    setItems([]);
  };

  return (
    <form onSubmit={handleSubmit} className="container my-4">
      <h4>➕ Crear Orden de Compra por Artículo</h4>
      {items.length <= 0 && (<button type="button" className="btn btn-outline-primary mb-3" onClick={handleAgregarItem}>
        ➕ Agregar Artículo
      </button>)}

      {items.map((item, i) => {
        const relaciones = proveedoresPorArticulo[item.codArticulo] || [];
        const proveedorPredeterminado = relaciones.find(p => p.esProveedorPredeterminado);
        const proveedor = 
        console.log("Relaciones:", relaciones);
        console.log("Proveedor predeterminado:", proveedorPredeterminado);

        return (
          <div key={i} className="card mb-3 p-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <select
                  className="form-select"
                  value={item.codArticulo}
                  onChange={(e) => handleItemChange(i, "codArticulo", e.target.value)}
                >
                  <option value="">Seleccionar Artículo</option>
                  {articulosDisponibles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                {/* Select de proveedores relacionados */}
                {item.codArticulo && (
                  <select
                    className="form-select"
                    value={item.codProveedor || (proveedorPredeterminado?.codProveedor || "")}
                    onChange={e => handleItemChange(i, "codProveedor", e.target.value)}
                  >
                    <option value="">Seleccionar proveedor</option>
                    {relaciones.map(p => (
                      <option
                        key={p.codProveedor}
                        value={p.codProveedor}
                        style={p.esProveedorPredeterminado ? { fontWeight: "bold", background: "#e6ffe6" } : {}}
                      >
                        {p.nombreProveedor}
                        {p.esProveedorPredeterminado ? " (Recomendado)" : ""}
                      </option>
                    ))}
                  </select>
                )}
                {/* Mensaje de recomendación */}
                {proveedorPredeterminado && (
                  <div className="text-success mt-2">
                    Proveedor recomendado: <strong>{proveedorPredeterminado.nombreProveedor}</strong>
                  </div>
                )}
              </div>

              <div className="col-md-4">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Cantidad"
                  value={item.cantidad}
                  min={1}
                  onChange={(e) => handleItemChange(i, "cantidad", e.target.value)}
                />
              </div>
              <div className="col-md-4">
                {item.codArticulo && (() => {
                  const art = articulosDisponibles.find(a => a.id === item.codArticulo);
                  if (!art) return null;
                  return (
                    <div>
                      {art.mostrarSugerencia ? (
                        <span className="badge bg-info">
                          Sugerido: {art.cantidadSugerida}
                        </span>
                      ) : (
                        <span className="badge bg-success">
                          No es necesario pedir aún
                        </span>
                      )}{" "}
                      <span className="badge bg-secondary">
                        Stock actual: {art.stockActual}
                      </span>
                      {art.puntoPedido !== "-" && (
                        <span className="badge bg-warning text-dark">
                          Punto pedido: {art.puntoPedido}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="col-md-12 mt-2">
                <button className="btn btn-outline-danger w-100" type="button" onClick={() => handleEliminarItem(i)}>
                  ➖
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button className="btn btn-success" type="submit">
        Crear Orden/es de Compra
      </button>
    </form>
  );
}