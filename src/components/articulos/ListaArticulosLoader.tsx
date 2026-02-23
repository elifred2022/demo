"use client";

import { useCallback, useEffect, useState } from "react";
import ListaArticulos from "./ListaArticulos";
import type { Articulo } from "@/lib/google-sheets";

export default function ListaArticulosLoader() {
  const [articulos, setArticulos] = useState<Articulo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchArticulos = useCallback(() => {
    return fetch("/api/articulos", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar artículos");
        return res.json();
      })
      .then((data) => setArticulos(data.articulos ?? []))
      .catch((err) => setError(err.message ?? "Error de conexión"));
  }, []);

  useEffect(() => {
    fetchArticulos();
  }, [fetchArticulos]);

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

  if (articulos === null) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <p className="text-slate-500">Cargando artículos...</p>
      </div>
    );
  }

  return <ListaArticulos articulos={articulos} onMutate={fetchArticulos} />;
}
