import { NextResponse } from "next/server";
import {
  getVentas,
  insertarVenta,
  descontarStockArticulo,
  reponerStockArticulo,
} from "@/lib/google-sheets";

export async function GET() {
  try {
    const ventas = await getVentas();
    return NextResponse.json({ ventas });
  } catch (error) {
    console.error("Error al obtener ventas:", error);
    return NextResponse.json(
      { error: "Error al cargar las ventas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fecha, idarticulo, nombre, cantidad, total, precioUnitario } = body;

    if (!fecha?.trim() || !nombre?.trim()) {
      return NextResponse.json(
        { error: "Fecha y nombre son obligatorios" },
        { status: 400 }
      );
    }

    const cant = Number(cantidad) || 0;
    const tot = Number(total) || 0;
    const precio = Number(precioUnitario) ?? (cant > 0 ? tot / cant : 0);
    const idArt = idarticulo != null ? String(idarticulo).trim() : "";

    if (idArt && cant > 0) {
      try {
        await descontarStockArticulo(idArt, cant);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al descontar stock";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    try {
      await insertarVenta({
        fecha: String(fecha).trim(),
        articuloId: idArt,
        articuloNombre: String(nombre).trim(),
        cantidad: cant,
        precioUnitario: precio,
        total: tot,
      });
    } catch (err) {
      if (idArt && cant > 0) {
        await reponerStockArticulo(idArt, cant).catch(() => {});
      }
      throw err;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al crear venta:", error);
    return NextResponse.json(
      { error: "Error al guardar la venta" },
      { status: 500 }
    );
  }
}
