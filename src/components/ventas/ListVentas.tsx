"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VentaList, ArticuloVenta } from "@/lib/google-sheets";
import FormVentas from "./FormVentas";

interface ModalVerVentaProps {
  venta: VentaList;
  onCerrar: () => void;
  onEditar: () => void;
}

function ModalVerVenta({ venta, onCerrar, onEditar }: ModalVerVentaProps) {
  const articulos = venta.articulos ?? [];
  const tieneArticulos = articulos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl my-8 overflow-hidden">
        <div className="bg-sky-600 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Detalle de venta #{venta.idventa}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-white/90 hover:text-white p-1 rounded"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500 block">Fecha</span>
              <span className="font-medium text-slate-800">{venta.fecha || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Cliente</span>
              <span className="font-medium text-slate-800">{venta.cliente || "-"}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Artículos</h3>
            {tieneArticulos ? (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Artículo</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Cant.</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">P. unit.</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articulos.map((a: ArticuloVenta, i: number) => {
                      const precioUnit = a.cantidad > 0 ? a.total / a.cantidad : 0;
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-800">{a.nombre}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{a.cantidad}</td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            {precioUnit.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">
                            {a.total.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm py-2">
                {venta.nombre || "Sin detalle de artículos (venta legacy)"}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-base font-semibold text-slate-700">Total de la venta</span>
            <span className="text-xl font-bold text-sky-600">
              {venta.total.toLocaleString()}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-secondary flex-1"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onEditar}
              className="btn-primary flex-1"
            >
              Editar venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ListVentasProps {
  ventas: VentaList[];
  onMutate?: () => void;
}

export default function ListVentas({ ventas, onMutate }: ListVentasProps) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [ventaEditando, setVentaEditando] = useState<VentaList | null>(null);
  const [ventaViendo, setVentaViendo] = useState<VentaList | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const ventasFiltradas = filtro.trim()
    ? ventas.filter((v) => {
        const texto = filtro.trim().toLowerCase();
        const matchIdVenta = v.idventa.toLowerCase().includes(texto);
        const matchFecha = v.fecha.toLowerCase().includes(texto);
        const matchCliente = v.cliente?.toLowerCase().includes(texto);
        const matchTotal = v.total.toString().includes(texto);
        const matchNombre = v.nombre.toLowerCase().includes(texto);
        const matchArticulos = v.articulos?.some(
          (a) =>
            a.nombre?.toLowerCase().includes(texto) ||
            a.idarticulo?.toLowerCase().includes(texto)
        );
        return matchIdVenta || matchFecha || matchCliente || matchNombre || matchTotal || matchArticulos;
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

  function abrirVer(v: VentaList) {
    setVentaViendo(v);
  }

  function cerrarVer() {
    setVentaViendo(null);
  }

  async function handleEliminar(idventa: string) {
    const v = ventas.find((x) => x.idventa === idventa);
    const desc = v?.articulos?.length
      ? v.articulos.map((a) => a.nombre).join(", ")
      : v?.nombre;
    if (!confirm(`¿Eliminar la venta ${idventa}${desc ? ` (${desc})` : ""}?`)) return;
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
        {ventaViendo && (
          <ModalVerVenta venta={ventaViendo} onCerrar={cerrarVer} onEditar={() => { cerrarVer(); abrirEditar(ventaViendo); }} />
        )}
        <div className="mb-4">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por id, fecha, cliente, artículos..."
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
                    Cliente
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Artículos
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
                      colSpan={6}
                      className="px-4 py-12 text-center text-slate-500 bg-white"
                    >
                      {ventas.length === 0
                        ? "No hay ventas disponibles"
                        : "Ninguna venta coincide con el filtro"}
                    </td>
                  </tr>
                ) : (
                  ventasFiltradas.map((v, i) => {
                    const descripcionArticulos = v.articulos?.length
                      ? v.articulos
                          .map((a) =>
                            a.cantidad > 0
                              ? `${a.nombre} (${a.cantidad} × ${(a.total / a.cantidad).toLocaleString()})`
                              : a.nombre
                          )
                          .join(" · ")
                      : v.nombre || "-";
                    return (
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
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700">
                          {v.cliente || "-"}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800 max-w-xs truncate" title={descripcionArticulos}>
                          {descripcionArticulos}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 font-medium">
                          {v.total.toLocaleString()}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => abrirVer(v)}
                              className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              Ver
                            </button>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
