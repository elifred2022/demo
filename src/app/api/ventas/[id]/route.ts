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
    const { fecha, idarticulo, nombre, cantidad, total, precioUnitario } = body;

    const ventas = await getVentas();
    const ventaActual = ventas.find((v) => v.idventa.trim() === id.trim());
    if (!ventaActual) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    const idArtNuevo = idarticulo != null ? String(idarticulo).trim() : ventaActual.idarticulo;
    const cantNueva = cantidad != null ? Number(cantidad) || 0 : ventaActual.cantidad;
    const idArtViejo = ventaActual.idarticulo.trim();
    const cantVieja = ventaActual.cantidad;

    if (idArtViejo && idArtNuevo) {
      try {
        if (idArtViejo.toLowerCase() === idArtNuevo.toLowerCase()) {
          const diff = cantNueva - cantVieja;
          if (diff > 0) {
            await descontarStockArticulo(idArtNuevo, diff);
          } else if (diff < 0) {
            await reponerStockArticulo(idArtViejo, -diff);
          }
        } else {
          await reponerStockArticulo(idArtViejo, cantVieja);
          if (cantNueva > 0) {
            await descontarStockArticulo(idArtNuevo, cantNueva);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al actualizar stock";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    await actualizarVenta(id, {
      ...(fecha != null && { fecha: String(fecha).trim() }),
      ...(idarticulo != null && { idarticulo: String(idarticulo).trim() }),
      ...(nombre != null && { nombre: String(nombre).trim() }),
      ...(cantidad != null && { cantidad: Number(cantidad) || 0 }),
      ...(total != null && { total: Number(total) || 0 }),
      ...(precioUnitario != null && { precioUnitario: Number(precioUnitario) || 0 }),
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
    if (venta?.idarticulo && venta.cantidad > 0) {
      try {
        await reponerStockArticulo(venta.idarticulo, venta.cantidad);
      } catch {
        /* Si el artículo no existe, continuamos con la eliminación */
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
