import { NextResponse } from "next/server";
import {
  getVentas,
  insertarVenta,
  descontarStockArticulo,
  reponerStockArticulo,
} from "@/lib/google-sheets";

// Evita caché en Vercel/Next.js para que siempre se lean datos frescos de Google Sheets
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const ventas = await getVentas();
    return NextResponse.json(
      { ventas },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
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
    const { fecha, articulos, total, cliente } = body;

    if (!fecha?.trim()) {
      return NextResponse.json(
        { error: "Fecha es obligatoria" },
        { status: 400 }
      );
    }

    const arts = Array.isArray(articulos) ? articulos : [];
    if (arts.length === 0) {
      return NextResponse.json(
        { error: "Debe incluir al menos un artículo" },
        { status: 400 }
      );
    }

    const tot = Number(total) ?? arts.reduce((s: number, a: { total?: number }) => s + (Number(a?.total) || 0), 0);

    const descontados: { id: string; cant: number }[] = [];
    try {
      for (const a of arts) {
        const idArt = a?.idarticulo != null ? String(a.idarticulo).trim() : "";
        const cant = Number(a?.cantidad) || 0;
        if (idArt && cant > 0) {
          await descontarStockArticulo(idArt, cant);
          descontados.push({ id: idArt, cant });
        }
      }
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al descontar stock";
        return NextResponse.json({ error: msg }, { status: 400 });
    }

    try {
      await insertarVenta({
        fecha: String(fecha).trim(),
        articulos: arts.map((a: { idarticulo?: string; nombre?: string; cantidad?: number; total?: number }) => ({
          idarticulo: String(a?.idarticulo ?? "").trim(),
          nombre: String(a?.nombre ?? "").trim(),
          cantidad: Number(a?.cantidad) || 0,
          total: Number(a?.total) || 0,
        })),
        total: tot,
        cliente: cliente != null ? String(cliente).trim() : "",
      });
    } catch (err) {
      for (const d of descontados) {
        await reponerStockArticulo(d.id, d.cant).catch(() => {});
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
