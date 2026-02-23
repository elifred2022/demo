import { NextResponse } from "next/server";
import {
  eliminarProveedor,
  proveedorExiste,
  actualizarProveedor,
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
    const existe = await proveedorExiste(id);
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
    const { nombre, telefono, email, direccion, contacto } = body;
    const nuevoId =
      (body.idproveedor ?? body.id) != null
        ? String(body.idproveedor ?? body.id).trim()
        : id;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: "Nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (nuevoId.toLowerCase() !== id.toLowerCase()) {
      const existe = await proveedorExiste(nuevoId);
      if (existe) {
        return NextResponse.json(
          { error: "Ya existe un proveedor con ese ID" },
          { status: 400 }
        );
      }
    }

    await actualizarProveedor(id, {
      idproveedor: nuevoId,
      nombre: String(nombre).trim(),
      telefono: telefono != null ? String(telefono).trim() : undefined,
      email: email != null ? String(email).trim() : undefined,
      direccion: direccion != null ? String(direccion).trim() : undefined,
      contacto: contacto != null ? String(contacto).trim() : undefined,
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
    await eliminarProveedor(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al eliminar";
    const status = msg.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
