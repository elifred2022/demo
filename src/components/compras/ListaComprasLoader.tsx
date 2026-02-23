"use client";

import { useCallback, useEffect, useState } from "react";
import ListCompras from "./ListCompras";
import type { CompraList, Proveedor } from "@/lib/google-sheets";

export default function ListaComprasLoader() {
  const [compras, setCompras] = useState<CompraList[] | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    const fetchCompras = fetch("/api/compras", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar compras");
        return res.json();
      })
      .then((data) => setCompras(data.compras ?? []));

    const fetchProveedores = fetch("/api/proveedores", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar proveedores");
        return res.json();
      })
      .then((data) => setProveedores(data.proveedores ?? []));

    return Promise.all([fetchCompras, fetchProveedores]).catch((err) =>
      setError(err.message ?? "Error de conexión")
    );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (compras === null || proveedores === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-slate-500">Cargando compras...</p>
      </div>
    );
  }

  return (
    <ListCompras
      compras={compras}
      proveedores={proveedores}
      onMutate={fetchData}
    />
  );
}
