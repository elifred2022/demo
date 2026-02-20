"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { VentaList } from "@/lib/google-sheets";

interface ArticuloEncontrado {
  id?: string;
  idarticulo?: string;
  codbarra: string;
  nombre: string;
  precio: number;
  stock: number;
}

interface FormVentasProps {
  onCerrar: () => void;
  venta: VentaList | null;
}

export default function FormVentas({ onCerrar, venta }: FormVentasProps) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [codbarraBuscar, setCodbarraBuscar] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [articuloEncontrado, setArticuloEncontrado] = useState<ArticuloEncontrado | null>(null);
  const [formData, setFormData] = useState({
    fecha: venta?.fecha ?? "",
    idarticulo: venta?.idarticulo ?? "",
    nombre: venta?.nombre ?? "",
    cantidad: venta?.cantidad?.toString() ?? "",
    total: venta?.total?.toString() ?? "",
  });

  const buscarArticulo = useCallback(async (codbarra?: string, id?: string) => {
    if ((!codbarra || !codbarra.trim()) && (!id || !id.trim())) return null;
    setBuscando(true);
    try {
      const params = new URLSearchParams();
      if (codbarra?.trim()) params.set("codbarra", codbarra.trim());
      if (id?.trim()) params.set("id", id.trim());
      const res = await fetch(`/api/articulos/buscar?${params}`);
      const data = await res.json();
      return data.articulo as ArticuloEncontrado | null;
    } catch {
      return null;
    } finally {
      setBuscando(false);
    }
  }, []);

  const aplicarArticulo = useCallback((art: ArticuloEncontrado) => {
    setArticuloEncontrado(art);
    const idArt = art.idarticulo ?? art.id ?? "";
    setFormData((prev) => ({
      ...prev,
      idarticulo: idArt,
      nombre: art.nombre ?? "",
      total: prev.cantidad ? String(Number(prev.cantidad) * art.precio) : prev.total,
    }));
  }, []);

  const handleBuscarPorCodbarra = async () => {
    const cod = codbarraBuscar.trim();
    if (!cod) return;
    setError("");
    const art = await buscarArticulo(cod);
    if (art) {
      aplicarArticulo(art);
      setCodbarraBuscar("");
    } else {
      setError("No se encontró artículo con ese código de barras");
    }
  };

  useEffect(() => {
    if (venta) {
      setFormData({
        fecha: venta.fecha ?? "",
        idarticulo: venta.idarticulo ?? "",
        nombre: venta.nombre ?? "",
        cantidad: venta.cantidad?.toString() ?? "",
        total: venta.total?.toString() ?? "",
      });
      setArticuloEncontrado({
        idarticulo: venta.idarticulo,
        codbarra: "",
        nombre: venta.nombre,
        precio: venta.precioUnitario,
        stock: 0,
      });
    } else {
      setFormData({
        fecha: "",
        idarticulo: "",
        nombre: "",
        cantidad: "",
        total: "",
      });
      setArticuloEncontrado(null);
      setCodbarraBuscar("");
    }
  }, [venta]);

  useEffect(() => {
    const id = (formData.idarticulo ?? "").trim();
    if (!id || venta) return;
    const idEncontrado = (articuloEncontrado?.idarticulo ?? articuloEncontrado?.id ?? "").trim().toLowerCase();
    if (idEncontrado === id.toLowerCase()) return;
    const t = setTimeout(async () => {
      const art = await buscarArticulo(undefined, id);
      if (art) aplicarArticulo(art);
    }, 400);
    return () => clearTimeout(t);
  }, [formData.idarticulo, venta, articuloEncontrado?.idarticulo, articuloEncontrado?.id, buscarArticulo, aplicarArticulo]);

  useEffect(() => {
    if (articuloEncontrado && formData.cantidad) {
      const cant = parseFloat(formData.cantidad) || 0;
      setFormData((prev) => ({
        ...prev,
        total: String(cant * articuloEncontrado.precio),
      }));
    }
  }, [formData.cantidad, articuloEncontrado]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError("");
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value ?? "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);

    const cantidad = parseFloat(formData.cantidad) || 0;
    const total = parseFloat(formData.total) || 0;
    const precioUnitario = cantidad > 0 ? total / cantidad : 0;

    const payload = {
      fecha: formData.fecha.trim(),
      idarticulo: formData.idarticulo.trim(),
      nombre: formData.nombre.trim(),
      cantidad,
      total,
      precioUnitario,
    };

    try {
      const url = venta
        ? `/api/ventas/${encodeURIComponent(venta.idventa)}`
        : "/api/ventas";
      const method = venta ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (venta ? "Error al actualizar la venta" : "Error al crear la venta"));
      }

      onCerrar();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {venta ? "Editar venta" : "Nueva venta"}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="fecha"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              id="fecha"
              name="fecha"
              type="text"
              required
              value={formData.fecha ?? ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Ej: 2025-02-20"
            />
          </div>

          <div>
            <label
              htmlFor="codbarra"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Buscar por código de barras
            </label>
            <div className="flex gap-2">
              <input
                id="codbarra"
                type="text"
                value={codbarraBuscar}
                onChange={(e) => setCodbarraBuscar(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleBuscarPorCodbarra())}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Escanear o tipear código de barras"
              />
              <button
                type="button"
                onClick={handleBuscarPorCodbarra}
                disabled={buscando || !codbarraBuscar.trim()}
                className="btn-primary shrink-0 disabled:opacity-50"
              >
                {buscando ? "…" : "Buscar"}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="idarticulo"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              ID artículo <span className="text-red-500">*</span>
            </label>
            <input
              id="idarticulo"
              name="idarticulo"
              type="text"
              required
              value={formData.idarticulo ?? ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Tipear ID del artículo (busca automáticamente)"
            />
            {buscando && !articuloEncontrado && (
              <p className="mt-1 text-xs text-slate-500">Buscando artículo…</p>
            )}
            {articuloEncontrado && (
              <div className="mt-2 rounded-lg bg-sky-50 border border-sky-200 px-3 py-2">
                <p className="text-sm font-medium text-sky-800">
                  Precio unitario: <span className="font-semibold">{articuloEncontrado.precio.toLocaleString()}</span>
                </p>
                <p className="text-sm font-medium text-sky-800">
                  Stock disponible: <span className="font-semibold">{articuloEncontrado.stock}</span>
                </p>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="nombre"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              value={formData.nombre ?? ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Nombre del artículo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="cantidad"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Cantidad
              </label>
              <input
                id="cantidad"
                name="cantidad"
                type="number"
                min="0"
                step="1"
                value={formData.cantidad ?? ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="0"
              />
            </div>
            <div>
              <label
                htmlFor="total"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Total
              </label>
              <input
                id="total"
                name="total"
                type="number"
                min="0"
                step="0.01"
                value={formData.total ?? ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {enviando ? "Guardando…" : venta ? "Actualizar" : "Crear venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
