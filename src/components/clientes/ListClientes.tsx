"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Cliente } from "@/lib/google-sheets";
import FormCliente from "./FormCliente";

interface ListClientesProps {
  clientes: Cliente[];
  onMutate?: () => void;
}

export default function ListClientes({
  clientes,
  onMutate,
}: ListClientesProps) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const clientesFiltrados = filtro.trim()
    ? clientes.filter((cli) => {
        const texto = filtro.trim().toLowerCase();
        const matchId = cli.idcliente?.toLowerCase().includes(texto);
        const matchNombre = cli.nombre.toLowerCase().includes(texto);
        const matchTel = cli.telefono?.toLowerCase().includes(texto);
        const matchEmail = cli.email?.toLowerCase().includes(texto);
        const matchDir = cli.direccion?.toLowerCase().includes(texto);
        const matchFecha = cli.fechaCreacion?.toLowerCase().includes(texto);
        return matchId || matchNombre || matchTel || matchEmail || matchDir || matchFecha;
      })
    : clientes;

  function abrirCrear() {
    setClienteEditando(null);
    setMostrarForm(true);
  }

  function abrirEditar(cli: Cliente) {
    setClienteEditando(cli);
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setClienteEditando(null);
  }

  async function handleEliminar(id: string) {
    const nombre =
      clientes.find((c) => c.idcliente === id)?.nombre ?? "este cliente";
    if (!confirm(`¿Eliminar el cliente "${nombre}"?`)) return;
    setEliminando(id);
    try {
      const res = await fetch(
        `/api/clientes/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      onMutate?.() ?? router.refresh();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Error al eliminar"
      );
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
            Lista de clientes
          </h1>
          <button
            type="button"
            onClick={abrirCrear}
            className="btn-primary w-fit"
          >
            + Crear cliente
          </button>
        </div>
        {mostrarForm && (
          <FormCliente
            onCerrar={cerrarForm}
            cliente={clienteEditando}
            onMutate={onMutate}
          />
        )}
        <div className="mb-4">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por ID, nombre, teléfono..."
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-sky-100">
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    ID Cliente
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Nombre
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Fecha creación
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Teléfono
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Email
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800">
                    Act
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="bg-white px-4 py-12 text-center text-slate-500"
                    >
                      {clientes.length === 0
                        ? "No hay clientes disponibles"
                        : "Ningún cliente coincide con el filtro"}
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cli, i) => (
                    <tr
                      key={cli.idcliente || `cli-${i}`}
                      className="border-t border-slate-100 bg-white transition-colors hover:bg-sky-50/50"
                    >
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {cli.idcliente}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800">
                        {cli.nombre}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {cli.fechaCreacion || "—"}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {cli.telefono ?? "—"}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                        {cli.email ?? "—"}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(cli)}
                            className="rounded-lg bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(cli.idcliente)}
                            disabled={eliminando === cli.idcliente}
                            className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {eliminando === cli.idcliente ? "…" : "Eliminar"}
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
