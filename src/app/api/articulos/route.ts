import { NextResponse } from "next/server";
import {
  getArticulos,
  insertarArticulo,
  articuloExistePorCodbarra,
} from "@/lib/google-sheets";

// Evita caché en Vercel/Next.js para que siempre se lean datos frescos de Google Sheets
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const articulos = await getArticulos();
    return NextResponse.json(
      { articulos },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error al obtener artículos:", error);
    return NextResponse.json(
      { error: "Error al cargar los artículos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      codbarra,
      id,
      idarticulo,
      nombre,
      descripcion,
      precio,
      stock,
      por_aplic,
      precio_venta,
      fecha_alta,
    } = body;
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

    const fechaAltaStr =
      fecha_alta != null && String(fecha_alta).trim() !== ""
        ? String(fecha_alta).trim()
        : new Date().toISOString().split("T")[0];

    const articulo = {
      codbarra: codbarraStr,
      idarticulo: String(idArt).trim(),
      nombre: String(nombre).trim(),
      descripcion: descripcion != null ? String(descripcion).trim() : "",
      precio: Number(precio) || 0,
      stock: Number(stock) || 0,
      por_aplic: por_aplic != null ? Number(por_aplic) : undefined,
      precio_venta: precio_venta != null ? Number(precio_venta) : undefined,
      fecha_alta: fechaAltaStr,
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
