import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import db from "../../firebase";

export default function AddVenta() {
  const [articulos, setArticulos] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "Articulo"));
      // Solo artículos activos (sin fechahorabaja)
      const data = snap.docs
        .map((d) => ({
          id: d.id,
          nombre: d.data().nombreArticulo,
          stock: d.data().stockActualArticulo,
          demanda: d.data().demandaArticulo,
          baja: d.data().fechahorabaja || null,
        }))
        .filter((a) => !a.baja);

      setArticulos(data);
    };
    fetchData();
  }, []);

  const handleAgregarItem = () => {
    setItems([
      ...items,
      { articuloId: "", precioVentaArticulo: "", cantidadVendidaArticulo: "" },
    ]);
  };

  const handleEliminarItem = (i) => {
    const nuevo = [...items];
    nuevo.splice(i, 1);
    setItems(nuevo);
  };

  const handleItemChange = (i, campo, valor) => {
    const nuevo = [...items];
    nuevo[i][campo] = valor;
    setItems(nuevo);
  };

  // Chequea si hay OC activas (Pendiente o Enviada) para ese artículo
  const verificarOrdenActiva = async (articuloId) => {
    const ocSnap = await getDocs(collection(db, "OrdenCompra"));
    for (const oc of ocSnap.docs) {
      const estados = await getDocs(
        collection(db, "OrdenCompra", oc.id, "EstadoOrdenCompra")
      );
      const activo = estados.docs.find(
        (e) => e.data().fechaHoraBajaEstadoCompra === null
      );
      const estado = activo?.data()?.nombreEstadoCompra;
      if (["Pendiente", "Enviada"].includes(estado)) {
        const detalleSnap = await getDocs(
          collection(db, "OrdenCompra", oc.id, "DetalleOrdenCompra")
        );
        for (const det of detalleSnap.docs) {
          const arts = await getDocs(
            collection(
              db,
              "OrdenCompra",
              oc.id,
              "DetalleOrdenCompra",
              det.id,
              "Articulo"
            )
          );
          if (arts.docs.some((a) => a.id === articuloId)) return true;
        }
      }
    }
    return false;
  };

  // Si corresponde, autogenera OC para ese artículo
  const verificarYGenerarOC = async (articuloId) => {
    const modeloSnap = await getDocs(
      query(collection(db, "ModeloInventario"), where("articuloId", "==", articuloId))
    );
    if (modeloSnap.empty) return;

    const modelo = modeloSnap.docs[0].data();
    const modeloNombre = modelo.nombreModeloInventario;
    const stock = articulos.find((a) => a.id === articuloId)?.stock || 0;

    if (modeloNombre === "Lote Fijo" && stock < modelo.puntoPedido) {
      const tieneOC = await verificarOrdenActiva(articuloId);
      if (!tieneOC) {
        // Buscar proveedor predeterminado activo
        const provArtSnap = await getDocs(collection(db, "Articulo", articuloId, "ArticuloProveedor"));
        const provPred = provArtSnap.docs.find(
          p => p.data().esProveedorPredeterminado && !p.data().fechaHoraBajaArticuloProveedor
        );
        if (!provPred) {
          alert("No hay proveedor predeterminado activo para este artículo");
          return;
        }
        const proveedor = provPred.data();
        const codProveedor = proveedor.codProveedor;
        const precioUnitario = proveedor.PrecioUnitario || 0;

        const fecha = new Date();
        const ordenRef = await addDoc(collection(db, "OrdenCompra"), {
          fechaHoraOrdenCompra: fecha,
          codProveedor: codProveedor, // proveedor correcto
        });

        await setDoc(
          doc(db, "OrdenCompra", ordenRef.id, "EstadoOrdenCompra", "Pendiente"),
          {
            nombreEstadoCompra: "Pendiente",
            fechaHoraAltaEstadoCompra: fecha,
            fechaHoraBajaEstadoCompra: null,
          }
        );

        const detalleRef = await addDoc(
          collection(db, "OrdenCompra", ordenRef.id, "DetalleOrdenCompra"),
          {
            fechaHoraAlta: fecha,
            fechaHoraBaja: null,
            precioTotal: precioUnitario * (modelo.loteOptimo || 1), // calcula el total del detalle
          }
        );

        await setDoc(
          doc(
            db,
            "OrdenCompra",
            ordenRef.id,
            "DetalleOrdenCompra",
            detalleRef.id,
            "Articulo",
            articuloId
          ),
          {
            articuloId,
            precioArticulo: precioUnitario,
            cantidad: modelo.loteOptimo || 1,
          }
        );

        // Mensaje de log en consola
        console.log(`⚙️ OC autogenerada para ${articuloId} con proveedor ${codProveedor}, precio unitario ${precioUnitario}`);
      }
    }
  };

  const handleGuardarVenta = async () => {
    if (items.length === 0) return alert("Agregá al menos un artículo");

    for (const item of items) {
      const articulo = articulos.find((a) => a.id === item.articuloId);
      const cantidad = parseInt(item.cantidadVendidaArticulo);
      if (!articulo) return alert("Artículo no encontrado");
      if (cantidad > articulo.stock) {
        return alert(
          `No hay suficiente stock de ${articulo.nombre}. Stock disponible: ${articulo.stock}`
        );
      }
    }

    const fecha = new Date();
    const total = items.reduce(
      (acc, i) =>
        acc +
        parseFloat(i.precioVentaArticulo || 0) *
          parseInt(i.cantidadVendidaArticulo || 0),
      0
    );

    const ventaRef = await addDoc(collection(db, "Venta"), {
      fechaHoraVenta: fecha,
      precioTotalVenta: total,
    });

    const detalleRef = collection(db, "Venta", ventaRef.id, "DetalleVenta");

    for (const item of items) {
      await setDoc(doc(detalleRef, item.articuloId), {
        articuloId: item.articuloId,
        precioVentaArticulo: parseFloat(item.precioVentaArticulo),
        cantidadVendidaArticulo: parseInt(item.cantidadVendidaArticulo),
        precioTotalVenta:
          parseFloat(item.precioVentaArticulo) *
          parseInt(item.cantidadVendidaArticulo),
      });

      // Actualizar stock
      const artRef = doc(db, "Articulo", item.articuloId);
      const nuevoStock =
        articulos.find((a) => a.id === item.articuloId).stock -
        parseInt(item.cantidadVendidaArticulo);
      await updateDoc(artRef, { stockActualArticulo: nuevoStock });

      // Verificar si se debe generar OC
      await verificarYGenerarOC(item.articuloId);
    }

    alert("Venta registrada exitosamente");
    setItems([]);
  };

  const precioTotalVenta = items.reduce(
    (acc, i) =>
      acc +
      parseFloat(i.precioVentaArticulo || 0) *
        parseInt(i.cantidadVendidaArticulo || 0),
    0
  );

  return (
    <div className="container my-4">
      <h4>➕ Registrar Venta</h4>

      <button className="btn btn-outline-primary mb-3" onClick={handleAgregarItem}>
        ➕ Agregar Artículo
      </button>

      {items.map((item, i) => (
        <div key={i} className="card mb-3 p-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <select
                className="form-select"
                value={item.articuloId}
                onChange={(e) => handleItemChange(i, "articuloId", e.target.value)}
              >
                <option value="">Seleccionar artículo</option>
                {articulos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} - Stock: {a.stock}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <input
                type="number"
                className="form-control"
                placeholder="Precio"
                value={item.precioVentaArticulo}
                onChange={(e) =>
                  handleItemChange(i, "precioVentaArticulo", e.target.value)
                }
              />
            </div>
            <div className="col-md-3">
              <input
                type="number"
                className="form-control"
                placeholder="Cantidad"
                value={item.cantidadVendidaArticulo}
                onChange={(e) =>
                  handleItemChange(i, "cantidadVendidaArticulo", e.target.value)
                }
              />
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-danger w-100"
                onClick={() => handleEliminarItem(i)}
              >
                ➖
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="alert alert-info mt-3">
        <strong>Total de la venta:</strong> ${precioTotalVenta.toFixed(2)}
      </div>

      <button className="btn btn-success" onClick={handleGuardarVenta}>
        Registrar Venta
      </button>
    </div>
  );
}
