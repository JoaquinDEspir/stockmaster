export default function CalcularModeloInventario(
    articuloSeleccionado, tipoSeleccionado, formData = null, articuloProveedor, data = null 
) {
    //si estoy dando de alta un modelo de inventario CON FORMDATA
    if (articuloSeleccionado && tipoSeleccionado && formData && articuloProveedor) {
        // Leer los valores del FormData
        console.log('Entrando a calcularModeloInventario'); 
        const desviacionFormData = parseFloat(formData.desviacion || 1);
        const periodoRevisionFormData = parseInt(formData.periodoRevision || 7);
        console.log(desviacionFormData, periodoRevisionFormData);
        // SI EL MODELO ES LOTE FIJO
        if(tipoSeleccionado.nombre === "Modelo de Lote Fijo") {
            return calcularModeloInventarioLoteFijo(articuloProveedor, articuloSeleccionado, tipoSeleccionado, desviacionFormData);
        } else if(tipoSeleccionado.nombre === "Modelo de Periodo Fijo") {
            return calcularModeloInventarioPeriodoFijo(articuloProveedor, articuloSeleccionado, tipoSeleccionado, desviacionFormData, periodoRevisionFormData);
        }
    }

    //si estoy actualizando un modelo de inventario con DATA
    if (articuloSeleccionado && tipoSeleccionado && data && articuloProveedor) {
        // Leer los valores del Data
        console.log('Entrando a calcularModeloInventario'); 
        const desviacionData = parseFloat(data.desviacionEstandar || 1);
        const periodoRevisionData = parseInt(data.periodoRevision || 7);

        if(tipoSeleccionado.nombre === "Modelo de Lote Fijo") {
            // Debug: mostrar valores antes del cálculo
            if (typeof window !== 'undefined') { // Solo si estoy en modo debug
                window.alert(
                    'DEBUG Lote Fijo (actualización):\n' +
                    'demandaArticulo: ' + articuloSeleccionado.demandaArticulo + '\n' +
                    'costoPedidoArticulo: ' + articuloProveedor.costoPedidoArticulo + '\n' +
                    'costoAlmacenamientoArticulo: ' + articuloSeleccionado.costoAlmacenamientoArticulo
                );
            }
            return calcularModeloInventarioLoteFijo(articuloProveedor, articuloSeleccionado, tipoSeleccionado, desviacionData);

        } else if(tipoSeleccionado.nombre === "Modelo de Periodo Fijo") {
            // Debug: mostrar valores antes del cálculo
            console.log('DEBUG CalcularModeloInventario:', {
                demandaArticulo: articuloSeleccionado.demandaArticulo,
                periodoRevision: data.periodoRevision,
                demoraEntrega: articuloProveedor.demoraEntrega,
                desviacionEstandar: data.desviacionEstandar,
                stockActualArticulo: articuloSeleccionado.stockActualArticulo
            });
            return calcularModeloInventarioPeriodoFijo(articuloProveedor, articuloSeleccionado, tipoSeleccionado, desviacionData, periodoRevisionData);
        }
    }

    //si se llama solo para recalcular con un nuevo proveedor predeterminado (sin formData ni data)
    if (articuloSeleccionado && tipoSeleccionado && articuloProveedor && !formData && !data) {
        console.log('Entrando a calcularModeloInventario'); 
        //si se llama solo para recalcular con un nuevo proveedor predeterminado (sin formData ni data)
        const desviacion = parseFloat(articuloProveedor.desviacionEstandar || 1);
        const periodoRevision = parseInt(articuloProveedor.periodoRevision || 7);

        if(tipoSeleccionado.nombre === "Modelo de Lote Fijo") {
            return calcularModeloInventarioLoteFijo(articuloProveedor, articuloSeleccionado, tipoSeleccionado, desviacion);
        } else if(tipoSeleccionado.nombre === "Modelo de Periodo Fijo") {
            return calcularModeloInventarioPeriodoFijo(articuloProveedor, articuloSeleccionado, tipoSeleccionado, desviacion, periodoRevision);
        }
    }
}


export function calcularModeloInventarioLoteFijo (articuloProveedor, articuloSeleccionado, tipoSeleccionado, desviacion) {
    // Valores de Articulo parseados
    const costoPedido           = parseFloat(articuloProveedor.costoPedidoArticulo);
    const demoraEntrega         = parseInt(articuloProveedor.demoraEntrega);
    const demandaDiaria               = parseInt(articuloSeleccionado.demandaArticulo);
    const costoAlmacenamiento   = parseFloat(articuloSeleccionado.costoAlmacenamientoArticulo);
    const Z = 1.65; // nivel de servicio 95%

    // Calculos del Modelo de Inventario Fijo
    const cantidadAPedirOptima = Math.ceil(Math.sqrt((2 * (demandaDiaria * 365) * costoPedido)/costoAlmacenamiento));
    const stockSeguridad = Math.ceil(Z * desviacion * Math.sqrt(demoraEntrega));
    const puntoPedido = Math.ceil((demandaDiaria) * demoraEntrega + stockSeguridad);
            
    const newModelo = {
        articuloId: articuloSeleccionado.id,
        tipoModeloId: tipoSeleccionado.id,
        cantidadAPedirOptima: parseInt(cantidadAPedirOptima),
        puntoPedido: parseInt(puntoPedido),
        periodoRevision: '-',
        desviacionEstandar: desviacion,
        stockSeguridad: parseInt(stockSeguridad),
        };
    
    return newModelo;
}

export function calcularModeloInventarioPeriodoFijo (articuloProveedor, articuloSeleccionado, tipoSeleccionado, desviacion, periodoRevision) {
    // Valores de Articulo parseados
    const demoraEntrega         = parseInt(articuloProveedor.demoraEntrega);
    const stockActual           = parseInt(articuloSeleccionado.stockActualArticulo);
    const demandaDiaria         = parseInt(articuloSeleccionado.demandaArticulo);
    const demandaPeriodoVulnerable = Math.ceil(demandaDiaria * (periodoRevision + demoraEntrega));
    const Z = 1.65; //nivel de servicio 95%

    const stockSeguridad = Math.ceil(Z * desviacion * (periodoRevision + demoraEntrega));
    const cantidadAPedirOptima = Math.ceil(demandaPeriodoVulnerable + stockSeguridad - stockActual);
    const puntoPedido = Math.ceil((demandaDiaria * demoraEntrega) + (desviacion * Z * demoraEntrega));

    // MODELO DE PERIODO FIJO
    const newModelo = {
        articuloId: articuloSeleccionado.id,
        tipoModeloId: tipoSeleccionado.id,
        cantidadAPedirOptima: parseInt(cantidadAPedirOptima),
        puntoPedido: '-',
        periodoRevision: parseInt(periodoRevision),
        desviacionEstandar: desviacion,
        stockSeguridad: parseInt(stockSeguridad),
    };

    return newModelo; // Modelo de periodo fijo
}