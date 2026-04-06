import { NextResponse } from "next/server";
import { getArticulos } from "@/lib/google-sheets";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codbarra = searchParams.get("codbarra")?.trim();
    const id = searchParams.get("id")?.trim();

    if (!codbarra && !id) {
      return NextResponse.json(
        { error: "Debe proporcionar codbarra o id" },
        { status: 400 }
      );
    }

    const articulos = await getArticulos();

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
      articulo: {
        id: encontrado.idarticulo,
        idarticulo: encontrado.idarticulo,
        codbarra: encontrado.codbarra,
        nombre: encontrado.nombre,
        precio: encontrado.precio,
        por_aplic: encontrado.por_aplic,
        precio_venta: encontrado.precio_venta,
        stock: encontrado.stock,
        fecha_alta: encontrado.fecha_alta,
      },
    });
  } catch (error) {
    console.error("Error al buscar artículo:", error);
    return NextResponse.json(
      { error: "Error al buscar el artículo" },
      { status: 500 }
    );
  }
}
