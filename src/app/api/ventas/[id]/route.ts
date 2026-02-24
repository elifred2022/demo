import { NextResponse } from "next/server";
import {
  eliminarVenta,
  actualizarVenta,
  getVentas,
  descontarStockArticulo,
  reponerStockArticulo,
} from "@/lib/google-sheets";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "ID de venta es obligatorio" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { fecha, articulos, total, cliente } = body;

    const ventas = await getVentas();
    const ventaActual = ventas.find((v) => v.idventa.trim() === id.trim());
    if (!ventaActual) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    const artsNuevos = Array.isArray(articulos) ? articulos : [];
    const artsViejos = ventaActual.articulos ?? [];

    if (artsViejos.length > 0) {
      try {
        for (const a of artsViejos) {
          const idArt = a?.idarticulo?.trim();
          const cant = Number(a?.cantidad) || 0;
          if (idArt && cant > 0) {
            await reponerStockArticulo(idArt, cant);
          }
        }
      } catch {
        /* Si el artículo no existe, continuamos */
      }
    }

    const descontados: { id: string; cant: number }[] = [];
    try {
      for (const a of artsNuevos) {
        const idArt = a?.idarticulo != null ? String(a.idarticulo).trim() : "";
        const cant = Number(a?.cantidad) || 0;
        if (idArt && cant > 0) {
          await descontarStockArticulo(idArt, cant);
          descontados.push({ id: idArt, cant });
        }
      }
    } catch (err) {
      for (const d of descontados) {
        await reponerStockArticulo(d.id, d.cant).catch(() => {});
      }
      if (artsViejos.length > 0) {
        for (const a of artsViejos) {
          const idArt = a?.idarticulo?.trim();
          const cant = Number(a?.cantidad) || 0;
          if (idArt && cant > 0) {
            await descontarStockArticulo(idArt, cant).catch(() => {});
          }
        }
      }
      const msg = err instanceof Error ? err.message : "Error al actualizar stock";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await actualizarVenta(id, {
      ...(fecha != null && { fecha: String(fecha).trim() }),
      ...(cliente != null && { cliente: String(cliente).trim() }),
      articulos: artsNuevos.map((a: { idarticulo?: string; nombre?: string; cantidad?: number; total?: number }) => ({
        idarticulo: String(a?.idarticulo ?? "").trim(),
        nombre: String(a?.nombre ?? "").trim(),
        cantidad: Number(a?.cantidad) || 0,
        total: Number(a?.total) || 0,
      })),
      total: Number(total) ?? artsNuevos.reduce((s: number, a: { total?: number }) => s + (Number(a?.total) || 0), 0),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al actualizar";
    const status = msg.includes("no encontrada") ? 404 : 500;
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
        { error: "ID de venta es obligatorio" },
        { status: 400 }
      );
    }
    const ventas = await getVentas();
    const venta = ventas.find((v) => v.idventa.trim() === id.trim());
    if (venta?.articulos && venta.articulos.length > 0) {
      for (const a of venta.articulos) {
        const idArt = a?.idarticulo?.trim();
        const cant = Number(a?.cantidad) || 0;
        if (idArt && cant > 0) {
          try {
            await reponerStockArticulo(idArt, cant);
          } catch {
            /* Si el artículo no existe, continuamos */
          }
        }
      }
    } else if (venta?.cliente && (venta.cantidad ?? 0) > 0) {
      try {
        await reponerStockArticulo(venta.cliente, venta.cantidad!);
      } catch {
        /* Legacy: cliente puede ser idarticulo; si falla, continuamos */
      }
    }
    await eliminarVenta(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al eliminar";
    const status = msg.includes("no encontrada") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
