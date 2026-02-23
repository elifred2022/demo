import { NextResponse } from "next/server";
import {
  getCompras,
  insertarCompra,
  actualizarPrecioYStockArticulo,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const compras = await getCompras();
    return NextResponse.json(
      { compras },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error al obtener compras:", error);
    return NextResponse.json(
      { error: "Error al cargar las compras" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fecha,
      proveedor,
      idarticulo,
      articulo,
      cantidad,
      precio,
    } = body;

    const fechaHoy = () => new Date().toISOString().split("T")[0];
    const fechaStr = fecha?.trim() ? String(fecha).trim() : fechaHoy();

    if (!proveedor?.trim() || !articulo?.trim()) {
      return NextResponse.json(
        { error: "Proveedor y artículo son obligatorios" },
        { status: 400 }
      );
    }

    const idArt = idarticulo != null ? String(idarticulo).trim() : "";
    const cant = Number(cantidad) || 0;
    const prec = Number(precio) || 0;

    if (!idArt || cant <= 0 || prec < 0) {
      return NextResponse.json(
        { error: "ID artículo, cantidad (positiva) y precio son obligatorios" },
        { status: 400 }
      );
    }

    try {
      await actualizarPrecioYStockArticulo(idArt, prec, cant);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al actualizar artículo";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    try {
      await insertarCompra({
        fecha: fechaStr,
        proveedor: String(proveedor).trim(),
        idarticulo: idArt,
        articulo: String(articulo).trim(),
        cantidad: cant,
        precio: prec,
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      await import("@/lib/google-sheets").then(({ restarStockArticulo }) =>
        restarStockArticulo(idArt, cant).catch(() => {})
      );
      throw err;
    }
  } catch (error) {
    console.error("Error al crear compra:", error);
    return NextResponse.json(
      { error: "Error al guardar la compra" },
      { status: 500 }
    );
  }
}
