"use client";

import { useCallback, useEffect, useState } from "react";
import ListClientes from "./ListClientes";
import type { Cliente } from "@/lib/google-sheets";

export default function ListClientesLoader() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(() => {
    return fetch("/api/clientes", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar clientes");
        return res.json();
      })
      .then((data) => setClientes(data.clientes ?? []))
      .catch((err) => setError(err.message ?? "Error de conexión"));
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="text-center">
          <p className="mb-2 text-red-600">{error}</p>
          <a href="/" className="text-sky-600 underline">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (clientes === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-slate-500">Cargando clientes...</p>
      </div>
    );
  }

  return <ListClientes clientes={clientes} onMutate={fetchClientes} />;
}
