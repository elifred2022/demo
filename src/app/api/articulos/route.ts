import { NextResponse } from "next/server";
import { insertarArticulo, articuloExistePorCodbarra } from "@/lib/google-sheets";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codbarra, id, idarticulo, nombre, descripcion, precio, stock } = body;
    const idArt = idarticulo ?? id;

    if (!idArt?.trim() || !nombre?.trim()) {
      return NextResponse.json(
        { error: "ID artículo y nombre son obligatorios" },
        { status: 400 }
      );
    }

    const codbarraStr = codbarra != null ? String(codbarra).trim() : "";
    if (codbarraStr) {
      const codbarraExiste = await articuloExistePorCodbarra(codbarraStr);
      if (codbarraExiste) {
        return NextResponse.json(
          { error: "Ya existe un artículo con ese código de barras" },
          { status: 400 }
        );
      }
    }

    const articulo = {
      codbarra: codbarraStr,
      idarticulo: String(idArt).trim(),
      nombre: String(nombre).trim(),
      descripcion: descripcion != null ? String(descripcion).trim() : "",
      precio: Number(precio) || 0,
      stock: Number(stock) || 0,
    };

    await insertarArticulo(articulo);
    return NextResponse.json({ success: true, articulo });
  } catch (error) {
    console.error("Error al crear artículo:", error);
    return NextResponse.json(
      { error: "Error al guardar el artículo" },
      { status: 500 }
    );
  }
}
