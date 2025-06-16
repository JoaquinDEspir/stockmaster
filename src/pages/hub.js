import React from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faFolder, faHandshake, faPuzzlePiece, faClipboardList, faDollarSign, faChartBar } from "@fortawesome/free-solid-svg-icons";

export default function Hub() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", width: "100vw", position: "fixed", top: 0, left: 0, backgroundColor: "#f8f9fa", zIndex: -1 }}>
      <div className="container py-5" style={{ position: "relative", zIndex: 1 }}>
        <div className="text-center mb-5">
          <h2 className="fw-bold display-5 mb-2" style={{ letterSpacing: "1px" }}>
            <FontAwesomeIcon icon={faBox} /> StockMaster
          </h2>
          <p className="lead text-secondary">Hub Principal</p>
        </div>

        <div className="row g-4">
          {/* ARTICULOS */}
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <FontAwesomeIcon icon={faFolder} /> Artículos
                </h5>
                <div className="d-grid gap-2">
                  <button className="btn btn-primary" onClick={() => navigate("/add-articulo")}>Agregar Artículo</button>
                  <button className="btn btn-light border border-dark border-1" onClick={() => navigate("/update-articulo")}>Editar Artículo</button>
                  <button className="btn btn-danger" onClick={() => navigate("/delete-articulo")}>Eliminar Artículo</button>
                  <button className="btn btn-primary" onClick={() => navigate("/resumen-inventario")}>Resumen inventario</button>
                  <button className="btn btn-primary" onClick={() => navigate("/ajuste-inventario")}>Ajustar inventario</button>
                </div>
              </div>
            </div>
          </div>

          {/* PROVEEDORES */}
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <FontAwesomeIcon icon={faHandshake} /> Proveedores
                </h5>
                <div className="d-grid gap-2">
                  <button className="btn btn-primary" onClick={() => navigate("/add-proveedor")}>Agregar Proveedor</button>
                  <button className="btn btn-light border border-dark border-1" onClick={() => navigate("/update-proveedor")}>Editar Proveedor</button>
                  <button className="btn btn-danger" onClick={() => navigate("/delete-proveedor")}>Eliminar Proveedor</button>
                  <button className="btn btn-primary" onClick={() => navigate("/proveedores-articulos")}>Lista Proveedor</button>
                </div>
              </div>
            </div>
          </div>

          {/* ARTICULO-PROVEEDOR */}
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <FontAwesomeIcon icon={faPuzzlePiece} />  Agregar un Proveedor a un Artículo
                </h5>
                <div className="d-grid gap-2">
                  <button className="btn btn-primary" onClick={() => navigate("/add-producto-proveedor")}>Agregar Tipo</button>
                  <button className="btn btn-light border border-dark border-1" onClick={() => navigate("/update-producto-proveedor")}>Editar Tipo</button>
                  <button className="btn btn-danger" onClick={() => navigate("/delete-producto-proveedor")}>Eliminar Tipo</button>
                </div>
              </div>
            </div>
          </div>

          {/* ORDEN DE COMPRA */}
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <FontAwesomeIcon icon={faClipboardList} /> Orden de Compra
                </h5>
                <div className="d-grid gap-2">
                <button className="btn btn-primary" onClick={() => navigate("/tabla-orden-compra")}>Tabla Ordenes</button>
                  <button className="btn btn-primary" onClick={() => navigate("/add-orden-compra")}>Nueva Orden</button>
                  <button className="btn btn-light border border-dark border-1" onClick={() => navigate("/update-orden-compra")}>Editar Orden</button>
                  <button className="btn btn-info" onClick={() => navigate("/update-estado-orden-compra")}>Cambiar Estado</button>
                </div>
              </div>
            </div>
          </div>

          {/* VENTAS */}
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <FontAwesomeIcon icon={faDollarSign} /> Ventas
                </h5>
                <div className="d-grid gap-2">
                <button className="btn btn-primary" onClick={() => navigate("/tabla-venta")}>Tabla Ventas</button>
                  <button className="btn btn-primary" onClick={() => navigate("/add-venta")}>Registrar Venta</button>
                  <button className="btn btn-light border border-dark border-1" onClick={() => navigate("/update-venta")}>Editar Venta</button>
                  <button className="btn btn-danger" onClick={() => navigate("/delete-venta")}>Eliminar Venta</button>
                </div>
              </div>
            </div>
          </div>

          {/* MODELO DE INVENTARIO */}
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-sm h-100 border-0">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <FontAwesomeIcon icon={faChartBar} /> Agregar Modelo de Inventario a Articulo
                </h5>
                <div className="d-grid gap-2">
                  <button className="btn btn-primary" onClick={() => navigate("/add-modelo-inventario")}>Agregar Modelo</button>
                  <button className="btn btn-light border border-dark border-1" onClick={() => navigate("/update-modelo-inventario")}>Editar Modelo</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
