"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CompraList, ArticuloCompra, Proveedor } from "@/lib/google-sheets";
import FormCompras from "./FormCompras";

interface ModalVerCompraProps {
  compra: CompraList;
  onCerrar: () => void;
  onEditar: () => void;
}

function ModalVerCompra({ compra, onCerrar, onEditar }: ModalVerCompraProps) {
  const articulos = compra.articulos ?? [];
  const tieneArticulos = articulos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl my-8 overflow-hidden">
        <div className="bg-sky-600 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Detalle de compra #{compra.idcompra}
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
              <span className="font-medium text-slate-800">{compra.fecha || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Proveedor</span>
              <span className="font-medium text-slate-800">{compra.proveedor || "-"}</span>
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
                    {articulos.map((a: ArticuloCompra, i: number) => {
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
                {compra.articulo || "Sin detalle de artículos (compra legacy)"}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-base font-semibold text-slate-700">Total de la compra</span>
            <span className="text-xl font-bold text-sky-600">
              {compra.total.toLocaleString()}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">
              Cerrar
            </button>
            <button type="button" onClick={onEditar} className="btn-primary flex-1">
              Editar compra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [compraViendo, setCompraViendo] = useState<CompraList | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const comprasFiltradas = filtro.trim()
    ? compras.filter((c) => {
        const texto = filtro.trim().toLowerCase();
        const matchId = c.idcompra.toLowerCase().includes(texto);
        const matchFecha = c.fecha.toLowerCase().includes(texto);
        const matchProveedor = c.proveedor.toLowerCase().includes(texto);
        const matchTotal = c.total.toString().includes(texto);
        const matchArticulo = c.articulo.toLowerCase().includes(texto);
        const matchArticulos = c.articulos?.some(
          (a) =>
            a.nombre?.toLowerCase().includes(texto) ||
            a.idarticulo?.toLowerCase().includes(texto)
        );
        return (
          matchId ||
          matchFecha ||
          matchProveedor ||
          matchArticulo ||
          matchTotal ||
          matchArticulos
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

  function abrirVer(c: CompraList) {
    setCompraViendo(c);
  }

  function cerrarVer() {
    setCompraViendo(null);
  }

  async function handleEliminar(idcompra: string) {
    const compra = compras.find((c) => c.idcompra === idcompra);
    const desc = compra?.articulos?.length
      ? compra.articulos.map((a) => a.nombre).join(", ")
      : compra?.articulo;
    if (!confirm(`¿Eliminar la compra ${idcompra}${desc ? ` (${desc})` : ""}?`))
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
        {compraViendo && (
          <ModalVerCompra
            compra={compraViendo}
            onCerrar={cerrarVer}
            onEditar={() => {
              cerrarVer();
              abrirEditar(compraViendo);
            }}
          />
        )}
        <div className="mb-4">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por id, fecha, proveedor, artículos..."
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
                {comprasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="bg-white px-4 py-12 text-center text-slate-500"
                    >
                      {compras.length === 0
                        ? "No hay compras disponibles"
                        : "Ninguna compra coincide con el filtro"}
                    </td>
                  </tr>
                ) : (
                  comprasFiltradas.map((c, i) => {
                    const descripcionArticulos = c.articulos?.length
                      ? c.articulos
                          .map((a) =>
                            a.cantidad > 0
                              ? `${a.nombre} (${a.cantidad} × ${(a.total / a.cantidad).toLocaleString()})`
                              : a.nombre
                          )
                          .join(" · ")
                      : c.articulo || "-";
                    return (
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
                        <td
                          className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800 max-w-xs truncate"
                          title={descripcionArticulos}
                        >
                          {descripcionArticulos}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 font-medium">
                          {c.total.toLocaleString()}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => abrirVer(c)}
                              className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              Ver
                            </button>
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
