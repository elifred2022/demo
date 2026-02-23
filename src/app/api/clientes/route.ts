import { NextResponse } from "next/server";
import {
  getClientes,
  insertarCliente,
  generarSiguienteIdCliente,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const clientes = await getClientes();
    return NextResponse.json(
      { clientes },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    return NextResponse.json(
      { error: "Error al cargar los clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, telefono, email, direccion } = body;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const idCliente = await generarSiguienteIdCliente();
    const fechaHoy = new Date().toISOString().split("T")[0];

    const cliente = {
      idcliente: idCliente,
      nombre: String(nombre).trim(),
      telefono: telefono != null ? String(telefono).trim() : undefined,
      email: email != null ? String(email).trim() : undefined,
      direccion: direccion != null ? String(direccion).trim() : undefined,
      fechaCreacion: fechaHoy,
    };

    await insertarCliente(cliente);
    return NextResponse.json({ success: true, cliente });
  } catch (error) {
    console.error("Error al crear cliente:", error);
    return NextResponse.json(
      { error: "Error al guardar el cliente" },
      { status: 500 }
    );
  }
}
