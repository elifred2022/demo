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
    const { fecha, proveedor, articulos, total } = body;

    const fechaHoy = () => new Date().toISOString().split("T")[0];
    const fechaStr = fecha?.trim() ? String(fecha).trim() : fechaHoy();

    if (!proveedor?.trim()) {
      return NextResponse.json(
        { error: "Proveedor es obligatorio" },
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

    const tot =
      Number(total) ??
      arts.reduce(
        (s: number, a: { total?: number }) => s + (Number(a?.total) || 0),
        0
      );

    const actualizados: { id: string; cant: number }[] = [];
    try {
      for (const a of arts) {
        const idArt = a?.idarticulo != null ? String(a.idarticulo).trim() : "";
        const cant = Number(a?.cantidad) || 0;
        const totalArt = Number(a?.total) || 0;
        const precUnit = cant > 0 ? totalArt / cant : 0;
        if (idArt && cant > 0) {
          await actualizarPrecioYStockArticulo(idArt, precUnit, cant);
          actualizados.push({ id: idArt, cant });
        }
      }
    } catch (err) {
      for (const d of actualizados) {
        const { restarStockArticulo } = await import("@/lib/google-sheets");
        await restarStockArticulo(d.id, d.cant).catch(() => {});
      }
      const msg =
        err instanceof Error ? err.message : "Error al actualizar artículo";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    try {
      await insertarCompra({
        fecha: fechaStr,
        proveedor: String(proveedor).trim(),
        articulos: arts.map(
          (a: {
            idarticulo?: string;
            nombre?: string;
            cantidad?: number;
            total?: number;
          }) => ({
            idarticulo: String(a?.idarticulo ?? "").trim(),
            nombre: String(a?.nombre ?? "").trim(),
            cantidad: Number(a?.cantidad) || 0,
            total: Number(a?.total) || 0,
          })
        ),
        total: tot,
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      for (const d of actualizados) {
        const { restarStockArticulo } = await import("@/lib/google-sheets");
        await restarStockArticulo(d.id, d.cant).catch(() => {});
      }
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
