"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CompraList, Proveedor } from "@/lib/google-sheets";

interface ArticuloEncontrado {
  id?: string;
  idarticulo?: string;
  codbarra: string;
  nombre: string;
  precio: number;
  stock: number;
}

interface FormComprasProps {
  onCerrar: () => void;
  compra: CompraList | null;
  proveedores: Proveedor[];
  onMutate?: () => void;
}

export default function FormCompras({
  onCerrar,
  compra,
  proveedores,
  onMutate,
}: FormComprasProps) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [codbarraBuscar, setCodbarraBuscar] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [articuloEncontrado, setArticuloEncontrado] =
    useState<ArticuloEncontrado | null>(null);
  const fechaHoy = () => new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    fecha: compra?.fecha ?? fechaHoy(),
    proveedor: compra?.proveedor ?? "",
    idarticulo: compra?.idarticulo ?? "",
    articulo: compra?.articulo ?? "",
    cantidad: compra?.cantidad?.toString() ?? "",
    precio: compra?.precio?.toString() ?? "",
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
      articulo: art.nombre ?? "",
      precio: art.precio?.toString() ?? prev.precio,
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
    if (compra) {
      setFormData({
        fecha: compra.fecha ?? fechaHoy(),
        proveedor: compra.proveedor ?? "",
        idarticulo: compra.idarticulo ?? "",
        articulo: compra.articulo ?? "",
        cantidad: compra.cantidad?.toString() ?? "",
        precio: compra.precio?.toString() ?? "",
      });
      setArticuloEncontrado({
        idarticulo: compra.idarticulo,
        codbarra: "",
        nombre: compra.articulo,
        precio: compra.precio,
        stock: 0,
      });
    } else {
      setFormData({
        fecha: fechaHoy(),
        proveedor: "",
        idarticulo: "",
        articulo: "",
        cantidad: "",
        precio: "",
      });
      setArticuloEncontrado(null);
      setCodbarraBuscar("");
    }
  }, [compra]);

  useEffect(() => {
    const id = (formData.idarticulo ?? "").trim();
    if (!id || compra) return;
    const idEncontrado = (
      articuloEncontrado?.idarticulo ?? articuloEncontrado?.id ?? ""
    )
      .trim()
      .toLowerCase();
    if (idEncontrado === id.toLowerCase()) return;
    const t = setTimeout(async () => {
      const art = await buscarArticulo(undefined, id);
      if (art) aplicarArticulo(art);
    }, 400);
    return () => clearTimeout(t);
  }, [
    formData.idarticulo,
    compra,
    articuloEncontrado?.idarticulo,
    articuloEncontrado?.id,
    buscarArticulo,
    aplicarArticulo,
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
    const precio = parseFloat(formData.precio) || 0;

    const payload = {
      fecha: formData.fecha.trim(),
      proveedor: formData.proveedor.trim(),
      idarticulo: formData.idarticulo.trim(),
      articulo: formData.articulo.trim(),
      cantidad,
      precio,
    };

    try {
      const url = compra
        ? `/api/compras/${encodeURIComponent(compra.idcompra)}`
        : "/api/compras";
      const method = compra ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            (compra ? "Error al actualizar la compra" : "Error al crear la compra")
        );
      }

      onCerrar();
      onMutate?.() ?? router.refresh();
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
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {compra ? "Editar compra" : "Nueva compra"}
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
              type="date"
              required
              value={formData.fecha ?? ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label
              htmlFor="proveedor"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Proveedor <span className="text-red-500">*</span>
            </label>
            <select
              id="proveedor"
              name="proveedor"
              required
              value={formData.proveedor}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Seleccionar proveedor</option>
              {proveedores.map((p) => (
                <option key={p.idproveedor} value={p.nombre}>
                  {p.nombre} ({p.idproveedor})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="codbarra"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Buscar artículo por código de barras
            </label>
            <div className="flex gap-2">
              <input
                id="codbarra"
                type="text"
                value={codbarraBuscar}
                onChange={(e) => setCodbarraBuscar(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(), handleBuscarPorCodbarra())
                }
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
              <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                <p className="text-sm font-medium text-sky-800">
                  Precio actual:{" "}
                  <span className="font-semibold">
                    {articuloEncontrado.precio.toLocaleString()}
                  </span>
                </p>
                <p className="text-sm font-medium text-sky-800">
                  Stock actual:{" "}
                  <span className="font-semibold">{articuloEncontrado.stock}</span>
                </p>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="articulo"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Artículo <span className="text-red-500">*</span>
            </label>
            <input
              id="articulo"
              name="articulo"
              type="text"
              required
              value={formData.articulo ?? ""}
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
                Cantidad <span className="text-red-500">*</span>
              </label>
              <input
                id="cantidad"
                name="cantidad"
                type="number"
                min="1"
                step="1"
                required
                value={formData.cantidad ?? ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="0"
              />
            </div>
            <div>
              <label
                htmlFor="precio"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Precio unitario <span className="text-red-500">*</span>
              </label>
              <input
                id="precio"
                name="precio"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.precio ?? ""}
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
              {enviando
                ? "Guardando…"
                : compra
                  ? "Actualizar compra"
                  : "Crear compra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
