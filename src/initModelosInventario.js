//CAMBIO X LO DE LOS MODELOS, ARCHIVO NUEVO PARA INICIALIZAR MODELOS DE INVENTARIO
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import db from "./firebase";

const modelos = [
    {
        id: "modelo1",
        nombre: "Modelo de Revisión Continua",
        descripcion: "Modelo clásico de inventario de revisión continua (Q,r)."
    },
    {
        id: "modelo2",
        nombre: "Modelo de Revisión Periódica",
        descripcion: "Modelo de inventario de revisión periódica (P,S)."
    }
];

export async function initModelosInventario() {
    const modelosRef = collection(db, "ModeloInventario");
    const snapshot = await getDocs(modelosRef);
    const existentes = snapshot.docs.map(doc => doc.id);
    for (const modelo of modelos) {
        if (!existentes.includes(modelo.id)) {
        await setDoc(doc(modelosRef, modelo.id), modelo);
        }
    }
}
