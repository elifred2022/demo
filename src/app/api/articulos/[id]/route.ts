import { NextResponse } from "next/server";
import { eliminarArticulo, articuloExiste, articuloExistePorCodbarra, actualizarArticulo } from "@/lib/google-sheets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }
    const existe = await articuloExiste(id);
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
    const { codbarra, nombre, descripcion, precio, stock } = body;
    const nuevoId = (body.idarticulo ?? body.id) != null ? String(body.idarticulo ?? body.id).trim() : id;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: "Nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (nuevoId.toLowerCase() !== id.toLowerCase()) {
      const existe = await articuloExiste(nuevoId);
      if (existe) {
        return NextResponse.json(
          { error: "Ya existe un artículo con ese código" },
          { status: 400 }
        );
      }
    }

    const codbarraStr = codbarra != null ? String(codbarra).trim() : "";
    if (codbarraStr) {
      const codbarraExiste = await articuloExistePorCodbarra(codbarraStr, id);
      if (codbarraExiste) {
        return NextResponse.json(
          { error: "Ya existe un artículo con ese código de barras" },
          { status: 400 }
        );
      }
    }

    await actualizarArticulo(id, {
      codbarra: codbarra != null ? String(codbarra).trim() : "",
      idarticulo: nuevoId,
      nombre: String(nombre).trim(),
      descripcion: descripcion != null ? String(descripcion).trim() : "",
      precio: Number(precio) || 0,
      stock: Number(stock) || 0,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al actualizar";
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
    await eliminarArticulo(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al eliminar";
    const status = msg.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
