//ARCHIVO NUEVO PARA INICIALIZAR LOS TIPOS DE MODELOS DE INVENTARIO
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import db from "./firebase";

const tipoModelos = [
    {
        id: "modelo1",
        nombre: "Modelo de Lote Fijo",
        fechaHoraAltaTipoModelo: new Date(),
        fechaHoraBajaTipoModelo: null,
    },
    {
        id: "modelo2",
        nombre: "Modelo de Periodo Fijo",
        fechaHoraAltaTipoModelo: new Date(),
        fechaHoraBajaTipoModelo: null,
    }
];

export async function initTipoModelosInventario() {
    const modelosRef = collection(db, "TipoModeloInventario");
    const snapshot = await getDocs(modelosRef);
    const existentes = snapshot.docs.map(doc => doc.id);
    for (const modelo of tipoModelos) {
        if (!existentes.includes(modelo.id)) {
        await setDoc(doc(modelosRef, modelo.id), modelo);
        }
    }
}
