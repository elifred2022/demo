"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VentaList } from "@/lib/google-sheets";
import FormVentas from "./FormVentas";

interface ListVentasProps {
  ventas: VentaList[];
  onMutate?: () => void;
}

export default function ListVentas({ ventas, onMutate }: ListVentasProps) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [ventaEditando, setVentaEditando] = useState<VentaList | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const ventasFiltradas = filtro.trim()
    ? ventas.filter((v) => {
        const texto = filtro.trim().toLowerCase();
        const matchIdVenta = v.idventa.toLowerCase().includes(texto);
        const matchFecha = v.fecha.toLowerCase().includes(texto);
        const matchIdArticulo = v.idarticulo.toLowerCase().includes(texto);
        const matchNombre = v.nombre.toLowerCase().includes(texto);
        const matchCantidad = v.cantidad.toString().includes(texto);
        const matchTotal = v.total.toString().includes(texto);
        return matchIdVenta || matchFecha || matchIdArticulo || matchNombre || matchCantidad || matchTotal;
      })
    : ventas;

  function abrirCrear() {
    setVentaEditando(null);
    setMostrarForm(true);
  }

  function abrirEditar(v: VentaList) {
    setVentaEditando(v);
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setVentaEditando(null);
  }

  async function handleEliminar(idventa: string) {
    const venta = ventas.find((v) => v.idventa === idventa);
    if (!confirm(`¿Eliminar la venta ${idventa}${venta ? ` (${venta.nombre})` : ""}?`)) return;
    setEliminando(idventa);
    try {
      const res = await fetch(`/api/ventas/${encodeURIComponent(idventa)}`, {
        method: "DELETE",
      });
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
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="btn-secondary mb-4 sm:mb-6 w-fit">
          ← Volver al inicio
        </Link>
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
            Lista de ventas
          </h1>
          <button
            type="button"
            onClick={abrirCrear}
            className="btn-primary w-fit"
          >
            + Nueva venta
          </button>
        </div>
        {mostrarForm && (
          <FormVentas onCerrar={cerrarForm} venta={ventaEditando} onMutate={onMutate} />
        )}
        <div className="mb-4">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por id, fecha, nombre..."
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-sky-100">
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    ID Venta
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Fecha
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    ID Artículo
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Nombre
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Cantidad
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Precio Unitario
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Total
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Act
                  </th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-slate-500 bg-white"
                    >
                      {ventas.length === 0
                        ? "No hay ventas disponibles"
                        : "Ninguna venta coincide con el filtro"}
                    </td>
                  </tr>
                ) : (
                  ventasFiltradas.map((v, i) => (
                    <tr
                      key={v.idventa || `venta-${i}`}
                      className="border-t border-slate-100 bg-white hover:bg-sky-50/50 transition-colors"
                    >
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {v.idventa}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {v.fecha}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {v.idarticulo}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800">
                        {v.nombre}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700">
                        {v.cantidad}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700">
                        {v.precioUnitario.toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700">
                        {v.total.toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(v)}
                            className="rounded-lg bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(v.idventa)}
                            disabled={eliminando === v.idventa}
                            className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {eliminando === v.idventa ? "…" : "Eliminar"}
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
