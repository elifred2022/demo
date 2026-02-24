import { NextResponse } from "next/server";
import {
  getCompras,
  actualizarCompra,
  eliminarCompra,
  actualizarPrecioYStockArticulo,
  restarStockArticulo,
} from "@/lib/google-sheets";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "ID de compra es obligatorio" },
        { status: 400 }
      );
    }

    const compras = await getCompras();
    const compraActual = compras.find((c) => c.idcompra.trim() === id.trim());
    if (!compraActual) {
      return NextResponse.json(
        { error: "Compra no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { fecha, proveedor, articulos, total } = body;

    const artsNuevos = Array.isArray(articulos) ? articulos : [];
    const artsViejos = compraActual.articulos ?? [];

    if (artsViejos.length > 0) {
      for (const a of artsViejos) {
        const idArt = a?.idarticulo?.trim();
        const cant = Number(a?.cantidad) || 0;
        if (idArt && cant > 0) {
          try {
            await restarStockArticulo(idArt, cant);
          } catch {
            /* Si el artículo no existe, continuamos */
          }
        }
      }
    }

    const actualizados: { id: string; cant: number }[] = [];
    try {
      for (const a of artsNuevos) {
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
        await restarStockArticulo(d.id, d.cant).catch(() => {});
      }
      if (artsViejos.length > 0) {
        for (const a of artsViejos) {
          const idArt = a?.idarticulo?.trim();
          const cant = Number(a?.cantidad) || 0;
          const totalArt = Number(a?.total) || 0;
          const precUnit = cant > 0 ? totalArt / cant : 0;
          if (idArt && cant > 0) {
            await actualizarPrecioYStockArticulo(idArt, precUnit, cant).catch(
              () => {}
            );
          }
        }
      }
      const msg =
        err instanceof Error ? err.message : "Error al actualizar artículo";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await actualizarCompra(id, {
      ...(fecha != null && { fecha: String(fecha).trim() }),
      ...(proveedor != null && { proveedor: String(proveedor).trim() }),
      articulos: artsNuevos.map(
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
      total:
        Number(total) ??
        artsNuevos.reduce(
          (s: number, a: { total?: number }) => s + (Number(a?.total) || 0),
          0
        ),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Error al actualizar";
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
        { error: "ID de compra es obligatorio" },
        { status: 400 }
      );
    }

    const compras = await getCompras();
    const compra = compras.find((c) => c.idcompra.trim() === id.trim());
    if (compra?.articulos && compra.articulos.length > 0) {
      for (const a of compra.articulos) {
        const idArt = a?.idarticulo?.trim();
        const cant = Number(a?.cantidad) || 0;
        if (idArt && cant > 0) {
          try {
            await restarStockArticulo(idArt, cant);
          } catch {
            /* Si el artículo no existe, continuamos */
          }
        }
      }
    } else if (compra?.idarticulo && (compra.cantidad ?? 0) > 0) {
      try {
        await restarStockArticulo(compra.idarticulo, compra.cantidad!);
      } catch {
        /* Si el artículo no existe, continuamos con la eliminación */
      }
    }

    await eliminarCompra(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Error al eliminar";
    const status = msg.includes("no encontrada") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
