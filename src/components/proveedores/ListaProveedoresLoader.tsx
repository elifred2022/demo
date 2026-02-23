"use client";

import { useCallback, useEffect, useState } from "react";
import ListaProveedores from "./ListaProveedores";
import type { Proveedor } from "@/lib/google-sheets";

export default function ListaProveedoresLoader() {
  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProveedores = useCallback(() => {
    return fetch("/api/proveedores", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar proveedores");
        return res.json();
      })
      .then((data) => setProveedores(data.proveedores ?? []))
      .catch((err) => setError(err.message ?? "Error de conexión"));
  }, []);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <a href="/" className="text-sky-600 underline">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (proveedores === null) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <p className="text-slate-500">Cargando proveedores...</p>
      </div>
    );
  }

  return (
    <ListaProveedores
      proveedores={proveedores}
      onMutate={fetchProveedores}
    />
  );
}
