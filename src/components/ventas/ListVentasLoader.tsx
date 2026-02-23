"use client";

import { useCallback, useEffect, useState } from "react";
import ListVentas from "./ListVentas";
import type { VentaList } from "@/lib/google-sheets";

export default function ListVentasLoader() {
  const [ventas, setVentas] = useState<VentaList[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVentas = useCallback(() => {
    return fetch("/api/ventas", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar ventas");
        return res.json();
      })
      .then((data) => setVentas(data.ventas ?? []))
      .catch((err) => setError(err.message ?? "Error de conexión"));
  }, []);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

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

  if (ventas === null) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <p className="text-slate-500">Cargando ventas...</p>
      </div>
    );
  }

  return <ListVentas ventas={ventas} onMutate={fetchVentas} />;
}
