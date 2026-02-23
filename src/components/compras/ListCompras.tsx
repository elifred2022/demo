"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CompraList, Proveedor } from "@/lib/google-sheets";
import FormCompras from "./FormCompras";

interface ListComprasProps {
  compras: CompraList[];
  proveedores: Proveedor[];
  onMutate?: () => void;
}

export default function ListCompras({
  compras,
  proveedores,
  onMutate,
}: ListComprasProps) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [compraEditando, setCompraEditando] = useState<CompraList | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const comprasFiltradas = filtro.trim()
    ? compras.filter((c) => {
        const texto = filtro.trim().toLowerCase();
        const matchId = c.idcompra.toLowerCase().includes(texto);
        const matchFecha = c.fecha.toLowerCase().includes(texto);
        const matchProveedor = c.proveedor.toLowerCase().includes(texto);
        const matchIdArticulo = c.idarticulo.toLowerCase().includes(texto);
        const matchArticulo = c.articulo.toLowerCase().includes(texto);
        const matchCantidad = c.cantidad.toString().includes(texto);
        const matchPrecio = c.precio.toString().includes(texto);
        return (
          matchId ||
          matchFecha ||
          matchProveedor ||
          matchIdArticulo ||
          matchArticulo ||
          matchCantidad ||
          matchPrecio
        );
      })
    : compras;

  function abrirCrear() {
    setCompraEditando(null);
    setMostrarForm(true);
  }

  function abrirEditar(c: CompraList) {
    setCompraEditando(c);
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setCompraEditando(null);
  }

  async function handleEliminar(idcompra: string) {
    const compra = compras.find((c) => c.idcompra === idcompra);
    if (
      !confirm(
        `¿Eliminar la compra ${idcompra}${compra ? ` (${compra.articulo})` : ""}?`
      )
    )
      return;
    setEliminando(idcompra);
    try {
      const res = await fetch(
        `/api/compras/${encodeURIComponent(idcompra)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      onMutate?.() ?? router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="btn-secondary mb-4 sm:mb-6 w-fit">
          ← Volver al inicio
        </Link>
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
            Lista de compras
          </h1>
          <button
            type="button"
            onClick={abrirCrear}
            className="btn-primary w-fit"
          >
            + Nueva compra
          </button>
        </div>
        {mostrarForm && (
          <FormCompras
            onCerrar={cerrarForm}
            compra={compraEditando}
            proveedores={proveedores}
            onMutate={onMutate}
          />
        )}
        <div className="mb-4">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por id, fecha, proveedor, artículo..."
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-sky-100">
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    ID Compra
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Fecha
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Proveedor
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    ID Artículo
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Artículo
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Cantidad
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Precio
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Act
                  </th>
                </tr>
              </thead>
              <tbody>
                {comprasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="bg-white px-4 py-12 text-center text-slate-500"
                    >
                      {compras.length === 0
                        ? "No hay compras disponibles"
                        : "Ninguna compra coincide con el filtro"}
                    </td>
                  </tr>
                ) : (
                  comprasFiltradas.map((c, i) => (
                    <tr
                      key={c.idcompra || `compra-${i}`}
                      className="border-t border-slate-100 bg-white transition-colors hover:bg-sky-50/50"
                    >
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {c.idcompra}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {c.fecha}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {c.proveedor}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {c.idarticulo}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800">
                        {c.articulo}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700">
                        {c.cantidad}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700">
                        {c.precio.toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(c)}
                            className="rounded-lg bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(c.idcompra)}
                            disabled={eliminando === c.idcompra}
                            className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {eliminando === c.idcompra ? "…" : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
