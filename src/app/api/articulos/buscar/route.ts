import { NextResponse } from "next/server";
import { getArticulos } from "@/lib/google-sheets";

function toArticuloResponse(
  encontrado: {
    idarticulo: string;
    codbarra: string;
    nombre: string;
    precio: number;
    por_aplic?: number;
    precio_venta?: number;
    stock: number;
    fecha_alta?: string;
  }
) {
  return {
    id: encontrado.idarticulo,
    idarticulo: encontrado.idarticulo,
    codbarra: encontrado.codbarra,
    nombre: encontrado.nombre,
    precio: encontrado.precio,
    por_aplic: encontrado.por_aplic,
    precio_venta: encontrado.precio_venta,
    stock: encontrado.stock,
    fecha_alta: encontrado.fecha_alta,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codbarra = searchParams.get("codbarra")?.trim();
    const id = searchParams.get("id")?.trim();
    const nombre = searchParams.get("nombre")?.trim();

    if (!codbarra && !id && !nombre) {
      return NextResponse.json(
        { error: "Debe proporcionar codbarra, id o nombre" },
        { status: 400 }
      );
    }

    const articulos = await getArticulos();

    const nombreNorm = nombre?.toLowerCase();
    if (nombreNorm) {
      const resultados = articulos
        .filter((a) => a.nombre.trim().toLowerCase().includes(nombreNorm))
        .slice(0, 10)
        .map(toArticuloResponse);
      return NextResponse.json({
        articulo: resultados[0] ?? null,
        articulos: resultados,
      });
    }

    const encontrado = articulos.find((a) => {
      if (codbarra && a.codbarra.trim().toLowerCase() === codbarra.toLowerCase()) {
        return true;
      }
      if (id && a.idarticulo.trim().toLowerCase() === id.toLowerCase()) {
        return true;
      }
      return false;
    });

    if (!encontrado) {
      return NextResponse.json({ articulo: null }, { status: 200 });
    }

    return NextResponse.json({
      articulo: toArticuloResponse(encontrado),
    });
  } catch (error) {
    console.error("Error al buscar artículo:", error);
    return NextResponse.json(
      { error: "Error al buscar el artículo" },
      { status: 500 }
    );
  }
}
