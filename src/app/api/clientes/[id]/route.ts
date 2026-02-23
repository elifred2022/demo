import { NextResponse } from "next/server";
import {
  eliminarCliente,
  clienteExiste,
  actualizarCliente,
  getClientes,
} from "@/lib/google-sheets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }
    const existe = await clienteExiste(id);
    return NextResponse.json({ exists: existe });
  } catch {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "ID es obligatorio" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { nombre, telefono, email, direccion, fechaCreacion } = body;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: "Nombre es obligatorio" },
        { status: 400 }
      );
    }

    const clientes = await getClientes();
    const actual = clientes.find((c) => c.idcliente.trim() === id.trim());
    const fechaCreacionMantener =
      fechaCreacion ?? actual?.fechaCreacion ?? new Date().toISOString().split("T")[0];

    await actualizarCliente(id, {
      idcliente: id,
      nombre: String(nombre).trim(),
      telefono: telefono != null ? String(telefono).trim() : undefined,
      email: email != null ? String(email).trim() : undefined,
      direccion: direccion != null ? String(direccion).trim() : undefined,
      fechaCreacion: fechaCreacionMantener,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Error al actualizar";
    const status = msg.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "ID es obligatorio" },
        { status: 400 }
      );
    }
    await eliminarCliente(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al eliminar";
    const status = msg.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
