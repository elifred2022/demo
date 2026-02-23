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
    const {
      fecha,
      proveedor,
      idarticulo,
      articulo,
      cantidad,
      precio,
    } = body;

    const idArtNuevo =
      idarticulo != null ? String(idarticulo).trim() : compraActual.idarticulo;
    const cantNueva =
      cantidad != null ? Number(cantidad) || 0 : compraActual.cantidad;
    const precNuevo =
      precio != null ? Number(precio) || 0 : compraActual.precio;
    const idArtViejo = compraActual.idarticulo.trim();
    const cantVieja = compraActual.cantidad;
    const precViejo = compraActual.precio;

    if (idArtViejo && cantVieja > 0) {
      try {
        await restarStockArticulo(idArtViejo, cantVieja);
      } catch {
        /* Si el artículo no existe, continuamos */
      }
    }

    if (idArtNuevo && cantNueva > 0) {
      try {
        await actualizarPrecioYStockArticulo(idArtNuevo, precNuevo, cantNueva);
      } catch (err) {
        if (idArtViejo && cantVieja > 0) {
          await actualizarPrecioYStockArticulo(
            idArtViejo,
            precViejo,
            cantVieja
          ).catch(() => {});
        }
        const msg =
          err instanceof Error ? err.message : "Error al actualizar artículo";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    await actualizarCompra(id, {
      ...(fecha != null && { fecha: String(fecha).trim() }),
      ...(proveedor != null && { proveedor: String(proveedor).trim() }),
      ...(idarticulo != null && { idarticulo: String(idarticulo).trim() }),
      ...(articulo != null && { articulo: String(articulo).trim() }),
      ...(cantidad != null && { cantidad: Number(cantidad) || 0 }),
      ...(precio != null && { precio: Number(precio) || 0 }),
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
    if (compra?.idarticulo && compra.cantidad > 0) {
      try {
        await restarStockArticulo(compra.idarticulo, compra.cantidad);
      } catch {
        /* Si el artículo no existe, continuamos con la eliminación */
      }
    }

    await eliminarCompra(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al eliminar";
    const status = msg.includes("no encontrada") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
