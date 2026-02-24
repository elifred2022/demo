"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CompraList, ArticuloCompra, Proveedor } from "@/lib/google-sheets";

interface ArticuloEncontrado {
  id?: string;
  idarticulo?: string;
  codbarra: string;
  nombre: string;
  precio: number;
  stock: number;
}

interface LineaCompra extends ArticuloCompra {
  precioUnitario: number;
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
  const [fecha, setFecha] = useState(compra?.fecha ?? fechaHoy());
  const [proveedor, setProveedor] = useState(compra?.proveedor ?? "");
  const [lineas, setLineas] = useState<LineaCompra[]>([]);
  const [cantidadActual, setCantidadActual] = useState("1");
  const [precioActual, setPrecioActual] = useState("");

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

  const agregarLinea = useCallback(
    (art: ArticuloEncontrado, cantidad: number, precioUnit: number) => {
      const idArt = art.idarticulo ?? art.id ?? "";
      const total = cantidad * precioUnit;
      const nueva: LineaCompra = {
        idarticulo: idArt,
        nombre: art.nombre ?? "",
        cantidad,
        total,
        precioUnitario: precioUnit,
      };
      setLineas((prev) => {
        const existente = prev.find(
          (l) => l.idarticulo?.toLowerCase() === idArt.toLowerCase()
        );
        if (existente) {
          return prev.map((l) =>
            l.idarticulo?.toLowerCase() === idArt.toLowerCase()
              ? {
                  ...l,
                  cantidad: l.cantidad + cantidad,
                  total: (l.cantidad + cantidad) * precioUnit,
                  precioUnitario: precioUnit,
                }
              : l
          );
        }
        return [...prev, nueva];
      });
      setArticuloEncontrado(null);
      setCantidadActual("1");
      setPrecioActual("");
    },
    []
  );

  const quitarLinea = useCallback((index: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const actualizarLinea = useCallback(
    (index: number, nuevaCantidad: number, nuevoPrecio: number) => {
      if (nuevaCantidad < 1 || nuevoPrecio < 0) return;
      setLineas((prev) =>
        prev.map((l, i) =>
          i === index
            ? {
                ...l,
                cantidad: nuevaCantidad,
                precioUnitario: nuevoPrecio,
                total: nuevaCantidad * nuevoPrecio,
              }
            : l
        )
      );
    },
    []
  );

  const handleBuscarPorCodbarra = async () => {
    const cod = codbarraBuscar.trim();
    if (!cod) return;
    setError("");
    const art = await buscarArticulo(cod, cod);
    if (art) {
      setArticuloEncontrado(art);
      setPrecioActual(art.precio?.toString() ?? "");
      setCodbarraBuscar("");
    } else {
      setError("No se encontró artículo con ese código de barras o ID");
    }
  };

  const handleAgregarAlCarrito = () => {
    if (!articuloEncontrado) return;
    const cant = parseInt(cantidadActual, 10) || 1;
    const prec = parseFloat(precioActual) || articuloEncontrado.precio || 0;
    if (cant < 1) {
      setError("La cantidad debe ser al menos 1");
      return;
    }
    if (prec < 0) {
      setError("El precio debe ser mayor o igual a 0");
      return;
    }
    setError("");
    agregarLinea(articuloEncontrado, cant, prec);
  };

  useEffect(() => {
    if (compra) {
      setFecha(compra.fecha ?? "");
      setProveedor(compra.proveedor ?? "");
      if (compra.articulos && compra.articulos.length > 0) {
        setLineas(
          compra.articulos.map((a) => ({
            ...a,
            precioUnitario: a.cantidad > 0 ? a.total / a.cantidad : 0,
          }))
        );
      } else {
        setLineas([]);
      }
    } else {
      setFecha(fechaHoy());
      setProveedor("");
      setLineas([]);
      setCodbarraBuscar("");
      setArticuloEncontrado(null);
    }
  }, [compra]);

  const totalCompra = lineas.reduce((sum, l) => sum + l.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (lineas.length === 0) {
      setError("Debe agregar al menos un artículo a la compra");
      return;
    }
    if (!proveedor.trim()) {
      setError("Debe seleccionar un proveedor");
      return;
    }

    const articulos: ArticuloCompra[] = lineas.map(
      ({ idarticulo, nombre, cantidad, total }) => ({
        idarticulo,
        nombre,
        cantidad,
        total,
      })
    );

    setEnviando(true);

    const payload = {
      fecha: fecha.trim(),
      proveedor: proveedor.trim(),
      articulos,
      total: totalCompra,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl my-8">
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
              value={fecha ?? ""}
              onChange={(e) => setFecha(e.target.value)}
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
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
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
              Buscar artículo (código de barras o ID)
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
                placeholder="Escanear o tipear código"
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

          {articuloEncontrado && (
            <div className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-3">
              <p className="text-sm font-medium text-sky-800 mb-1">
                {articuloEncontrado.nombre}
              </p>
              <p className="text-xs text-sky-700 mb-2">
                Precio actual: {articuloEncontrado.precio.toLocaleString()} ·
                Stock: {articuloEncontrado.stock}
              </p>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="number"
                  min="1"
                  value={cantidadActual}
                  onChange={(e) => setCantidadActual(e.target.value)}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="Cant."
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioActual}
                  onChange={(e) => setPrecioActual(e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="Precio"
                />
                <button
                  type="button"
                  onClick={handleAgregarAlCarrito}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  Agregar a la compra
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Artículos en la compra
              </span>
              {lineas.length > 0 && (
                <span className="text-xs text-slate-500">
                  {lineas.length} artículo(s)
                </span>
              )}
            </div>
            {lineas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-slate-500 text-sm">
                Busca artículos y agrégalos aquí
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-2 text-left font-medium text-slate-700">
                        Artículo
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-slate-700">
                        Cant
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-slate-700">
                        P. unit.
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-slate-700">
                        Total
                      </th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-2 py-2 text-slate-800">{l.nombre}</td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={l.cantidad}
                            onChange={(e) =>
                              actualizarLinea(
                                i,
                                parseInt(e.target.value, 10) || 1,
                                l.precioUnitario
                              )
                            }
                            className="w-14 text-right rounded border border-slate-200 px-1 py-0.5 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.precioUnitario}
                            onChange={(e) =>
                              actualizarLinea(
                                i,
                                l.cantidad,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-16 text-right rounded border border-slate-200 px-1 py-0.5 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {l.total.toLocaleString()}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => quitarLinea(i)}
                            className="text-red-500 hover:text-red-700 text-xs"
                            aria-label="Quitar"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {lineas.length > 0 && (
            <div className="rounded-lg bg-slate-100 px-4 py-3 flex justify-between items-center">
              <span className="font-medium text-slate-700">
                Total de la compra
              </span>
              <span className="text-lg font-bold text-slate-900">
                {totalCompra.toLocaleString()}
              </span>
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || lineas.length === 0}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {enviando
                ? "Guardando…"
                : compra
                  ? "Actualizar"
                  : "Crear compra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
