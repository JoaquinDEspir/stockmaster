import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Hub from "./pages/hub";

// Articulos
import AddArticulo from "./components/Articulos/AddArticulo";
import UpdateArticulo from "./components/Articulos/UpdateArticulo";
import DeleteArticulo from "./components/Articulos/DeleteArticulo";
import ResumenInventario from "./components/Articulos/ResumenInventario";
import AjusteInventario from "./components/Articulos/ajusteinventario";

// Proveedor
import AddProveedor from "./components/Proveedor/AddProveedor";
import UpdateProveedor from "./components/Proveedor/UpdateProveedor";
import DeleteProveedor from "./components/Proveedor/DeleteProveedor";
import ListaArticulosPorProveedor from "./components/Proveedor/ListaArticulosPorProveedor";

// ProductoProveedor
import AddProductoProveedor from "./components/ProveedorArticulo/AddProveedorArticulo";
import UpdateProductoProveedor from "./components/ProveedorArticulo/UpdateProveedorArticulo";
import DeleteProductoProveedor from "./components/ProveedorArticulo/DeleteProveedorArticulo"; // conservás este

// Orden de compra
import AddOrdenCompra from "./components/Ordencompra/AddOrdenCompra";
import UpdateOrdenCompra from "./components/Ordencompra/UpdateOrdenCompra";
import DeleteOrdenCompra from "./components/Ordencompra/DeleteOrdenCompra";
import UpdateEstadoOrdenCompra from "./components/Ordencompra/UpdateEstadoOrdenCompra";
import TablaOrdenesCompra from "./components/Ordencompra/TablaOrdenesCompra";


// Modelo Inventario
import AddModeloInventario from "./components/ModeloInventario/AddModeloInventario";
import UpdateModeloInventario from "./components/ModeloInventario/UpdateModeloInventario";

// Venta
import AddVenta from "./components/Venta/AddVenta";
import UpdateVenta from "./components/Venta/UpdateVenta";
import DeleteVenta from "./components/Venta/DeleteVenta";
import TablaVentas from "./components/Venta/TablaVentas";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hub />} />

        {/* Articulos */}
        <Route path="/add-articulo" element={<AddArticulo />} />
        <Route path="/update-articulo" element={<UpdateArticulo />} />
        <Route path="/delete-articulo" element={<DeleteArticulo />} />
        <Route path="/resumen-inventario" element={<ResumenInventario />} />
        <Route path="/ajuste-inventario" element={<AjusteInventario />} />

        {/* Proveedor */}
        <Route path="/add-proveedor" element={<AddProveedor />} />
        <Route path="/update-proveedor" element={<UpdateProveedor />} />
        <Route path="/delete-proveedor" element={<DeleteProveedor />} />
        <Route path="/proveedores-articulos" element={<ListaArticulosPorProveedor />} />


        {/* Producto-Proveedor */}
        <Route path="/add-producto-proveedor" element={<AddProductoProveedor />} />
        <Route path="/update-producto-proveedor" element={<UpdateProductoProveedor />} />
        <Route path="/delete-producto-proveedor" element={<DeleteProductoProveedor />} />


        {/* Orden de compra */}
        <Route path="/add-orden-compra" element={<AddOrdenCompra />} />
        <Route path="/update-orden-compra" element={<UpdateOrdenCompra />} />
        <Route path="/delete-orden-compra" element={<DeleteOrdenCompra />} />
        <Route path="/update-estado-orden-compra" element={<UpdateEstadoOrdenCompra />} />
        <Route path="/tabla-orden-compra" element={<TablaOrdenesCompra />} />


        {/* Modelo de Inventario */}
        <Route path="/add-modelo-inventario" element={<AddModeloInventario />} />
        <Route path="/update-modelo-inventario" element={<UpdateModeloInventario />} />

        {/* Ventas */}
        <Route path="/add-venta" element={<AddVenta />} />
        <Route path="/update-venta" element={<UpdateVenta />} />
        <Route path="/delete-venta" element={<DeleteVenta />} />
        <Route path="/tabla-venta" element={<TablaVentas />} />
      </Routes>
    </Router>
  );
}

export default App;
