"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Articulo } from "@/lib/google-sheets";

interface FormArticulosProps {
  onCerrar: () => void;
  articulo?: Articulo | null;
  onMutate?: () => void;
}

export default function FormArticulos({ onCerrar, articulo, onMutate }: FormArticulosProps) {
  const router = useRouter();
  const esEdicion = !!articulo;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [codigoExiste, setCodigoExiste] = useState(false);
  const [codbarraExiste, setCodbarraExiste] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [verificandoCodbarra, setVerificandoCodbarra] = useState(false);
  const [formData, setFormData] = useState({
    codbarra: articulo?.codbarra ?? "",
    idarticulo: articulo?.idarticulo ?? "",
    nombre: articulo?.nombre ?? "",
    descripcion: articulo?.descripcion ?? "",
    precio: articulo?.precio?.toString() ?? "",
    stock: articulo?.stock?.toString() ?? "",
  });

  useEffect(() => {
    if (articulo) {
      setFormData({
        codbarra: articulo.codbarra ?? "",
        idarticulo: articulo.idarticulo,
        nombre: articulo.nombre,
        descripcion: articulo.descripcion ?? "",
        precio: articulo.precio.toString(),
        stock: articulo.stock.toString(),
      });
      setCodigoExiste(false);
      setCodbarraExiste(false);
    }
  }, [articulo]);

  const verificarCodigo = useCallback(
    async (id: string) => {
      const codigo = id.trim();
      if (!codigo) {
        setCodigoExiste(false);
        return;
      }
      if (esEdicion && codigo.toLowerCase() === articulo?.idarticulo?.toLowerCase()) {
        setCodigoExiste(false);
        return;
      }
      setVerificando(true);
      try {
        const res = await fetch(
          `/api/articulos/${encodeURIComponent(codigo)}`
        );
        const data = await res.json();
        setCodigoExiste(data.exists === true);
      } catch {
        setCodigoExiste(false);
      } finally {
        setVerificando(false);
      }
    },
    [esEdicion, articulo?.idarticulo]
  );

  useEffect(() => {
    const tiempo = setTimeout(() => {
      verificarCodigo(formData.idarticulo);
    }, 400);
    return () => clearTimeout(tiempo);
  }, [formData.idarticulo, verificarCodigo]);

  const verificarCodbarra = useCallback(
    async (codbarra: string) => {
      const c = codbarra.trim();
      if (!c) {
        setCodbarraExiste(false);
        return;
      }
      if (
        esEdicion &&
        c.toLowerCase() === articulo?.codbarra?.toLowerCase()
      ) {
        setCodbarraExiste(false);
        return;
      }
      setVerificandoCodbarra(true);
      try {
        const params = new URLSearchParams({ codbarra: c });
        if (esEdicion && articulo?.idarticulo) {
          params.set("excluirId", articulo.idarticulo);
        }
        const res = await fetch(`/api/articulos/check-codbarra?${params}`);
        const data = await res.json();
        setCodbarraExiste(data.exists === true);
      } catch {
        setCodbarraExiste(false);
      } finally {
        setVerificandoCodbarra(false);
      }
    },
    [esEdicion, articulo?.idarticulo, articulo?.codbarra]
  );

  useEffect(() => {
    const tiempo = setTimeout(() => {
      verificarCodbarra(formData.codbarra);
    }, 400);
    return () => clearTimeout(tiempo);
  }, [formData.codbarra, verificarCodbarra]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setError("");
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoExiste || codbarraExiste) return;
    setError("");
    setEnviando(true);

    const payload = {
      codbarra: formData.codbarra.trim(),
      idarticulo: formData.idarticulo.trim(),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || undefined,
      precio: parseFloat(formData.precio) || 0,
      stock: parseInt(formData.stock, 10) || 0,
    };

    try {
      const url = esEdicion
        ? `/api/articulos/${encodeURIComponent(articulo!.idarticulo)}`
        : "/api/articulos";
      const method = esEdicion ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar el artículo");
      }

      onCerrar();
      onMutate?.() ?? router.refresh();
      setFormData({ codbarra: "", idarticulo: "", nombre: "", descripcion: "", precio: "", stock: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {esEdicion ? "Editar artículo" : "Crear nuevo artículo"}
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
              htmlFor="codbarra"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Código de barras
            </label>
            <input
              id="codbarra"
              name="codbarra"
              type="text"
              value={formData.codbarra}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 ${
                codbarraExiste
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-sky-500 focus:ring-sky-500"
              }`}
              placeholder="Ej: 7891234567890"
            />
            {verificandoCodbarra && formData.codbarra.trim() && (
              <p className="mt-1 text-xs text-slate-500">Verificando...</p>
            )}
            {codbarraExiste && !verificandoCodbarra && (
              <p className="mt-1 text-sm font-medium text-red-600">
                Código de barras existente
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="idarticulo"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              ID Artículo <span className="text-red-500">*</span>
            </label>
            <input
              id="idarticulo"
              name="idarticulo"
              type="text"
              required
              value={formData.idarticulo}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 ${
                codigoExiste
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-sky-500 focus:ring-sky-500"
              }`}
              placeholder="Ej: ART001"
            />
            {verificando && formData.idarticulo.trim() && (
              <p className="mt-1 text-xs text-slate-500">Verificando...</p>
            )}
            {codigoExiste && !verificando && (
              <p className="mt-1 text-sm font-medium text-red-600">
                Código existente
              </p>
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
              value={formData.nombre}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Nombre del artículo"
            />
          </div>

          <div>
            <label
              htmlFor="descripcion"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={2}
              value={formData.descripcion}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Descripción opcional"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="precio"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Precio
              </label>
              <input
                id="precio"
                name="precio"
                type="number"
                min="0"
                step="0.01"
                value={formData.precio}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="0"
              />
            </div>
            <div>
              <label
                htmlFor="stock"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Stock
              </label>
              <input
                id="stock"
                name="stock"
                type="number"
                min="0"
                value={formData.stock}
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
              disabled={enviando || codigoExiste || codbarraExiste}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {enviando ? "Guardando…" : esEdicion ? "Actualizar" : "Crear artículo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
