import { NextResponse } from "next/server";
import { getProveedores, insertarProveedor, proveedorExiste } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const proveedores = await getProveedores();
    return NextResponse.json(
      { proveedores },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    return NextResponse.json(
      { error: "Error al cargar los proveedores" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, idproveedor, nombre, telefono, email, direccion, contacto } = body;
    const idProv = idproveedor ?? id;

    if (!idProv?.trim() || !nombre?.trim()) {
      return NextResponse.json(
        { error: "ID proveedor y nombre son obligatorios" },
        { status: 400 }
      );
    }

    const existe = await proveedorExiste(String(idProv).trim());
    if (existe) {
      return NextResponse.json(
        { error: "Ya existe un proveedor con ese ID" },
        { status: 400 }
      );
    }

    const proveedor = {
      idproveedor: String(idProv).trim(),
      nombre: String(nombre).trim(),
      telefono: telefono != null ? String(telefono).trim() : undefined,
      email: email != null ? String(email).trim() : undefined,
      direccion: direccion != null ? String(direccion).trim() : undefined,
      contacto: contacto != null ? String(contacto).trim() : undefined,
    };

    await insertarProveedor(proveedor);
    return NextResponse.json({ success: true, proveedor });
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    return NextResponse.json(
      { error: "Error al guardar el proveedor" },
      { status: 500 }
    );
  }
}
