"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { BarChart3, CreditCard, Package, TrendingUp, Users } from "lucide-react";

const cardClass =
  "rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md";

type FechaTotalItem = {
  fecha?: string;
  total?: number;
};

type ArticuloItem = {
  fecha_alta?: string;
};

type ClienteItem = {
  fechaCreacion?: string;
};

function parseFecha(raw: string): Date | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const latamMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (latamMatch) {
    const [, d, m, y] = latamMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function estaEnRango(fecha: string, desde: string, hasta: string): boolean {
  const f = parseFecha(fecha);
  if (!f) return false;

  if (desde) {
    const d = parseFecha(desde);
    if (d && f < d) return false;
  }
  if (hasta) {
    const h = parseFecha(hasta);
    if (h && f > h) return false;
  }
  return true;
}

export default function IndicadoresPage() {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ventasTotal, setVentasTotal] = useState<number | null>(null);
  const [comprasTotal, setComprasTotal] = useState<number | null>(null);
  const [articulosCreados, setArticulosCreados] = useState<number | null>(null);
  const [clientesCreados, setClientesCreados] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
      }),
    []
  );

  const periodoTexto = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return "Periodo: todo";
    if (fechaDesde && fechaHasta) return `Periodo: ${fechaDesde} a ${fechaHasta}`;
    if (fechaDesde) return `Periodo: desde ${fechaDesde}`;
    return `Periodo: hasta ${fechaHasta}`;
  }, [fechaDesde, fechaHasta]);

  const balance = useMemo(() => {
    if (ventasTotal === null || comprasTotal === null) return null;
    return ventasTotal - comprasTotal;
  }, [ventasTotal, comprasTotal]);

  const balanceClassName = useMemo(() => {
    if (balance === null) {
      return "border-slate-200 bg-white text-slate-800";
    }
    if (balance >= 0) {
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }
    return "border-red-200 bg-red-50 text-red-800";
  }, [balance]);

  async function aplicarFiltros(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const [ventasRes, comprasRes, articulosRes, clientesRes] = await Promise.all([
        fetch("/api/ventas", { cache: "no-store" }),
        fetch("/api/compras", { cache: "no-store" }),
        fetch("/api/articulos", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
      ]);

      if (!ventasRes.ok) throw new Error("No se pudieron cargar las ventas");
      if (!comprasRes.ok) throw new Error("No se pudieron cargar las compras");
      if (!articulosRes.ok) throw new Error("No se pudieron cargar los artículos");
      if (!clientesRes.ok) throw new Error("No se pudieron cargar los clientes");

      const [ventasData, comprasData, articulosData, clientesData] =
        await Promise.all([
          ventasRes.json(),
          comprasRes.json(),
          articulosRes.json(),
          clientesRes.json(),
        ]);

      const ventas: FechaTotalItem[] = Array.isArray(ventasData?.ventas)
        ? ventasData.ventas
        : [];
      const compras: FechaTotalItem[] = Array.isArray(comprasData?.compras)
        ? comprasData.compras
        : [];
      const articulos: ArticuloItem[] = Array.isArray(articulosData?.articulos)
        ? articulosData.articulos
        : [];
      const clientes: ClienteItem[] = Array.isArray(clientesData?.clientes)
        ? clientesData.clientes
        : [];

      const sumaVentas = ventas
        .filter((v) => estaEnRango(String(v.fecha ?? ""), fechaDesde, fechaHasta))
        .reduce((acc, v) => acc + (Number(v.total) || 0), 0);

      const sumaCompras = compras
        .filter((c) => estaEnRango(String(c.fecha ?? ""), fechaDesde, fechaHasta))
        .reduce((acc, c) => acc + (Number(c.total) || 0), 0);

      const totalArticulosCreados = articulos.filter((a) =>
        estaEnRango(String(a.fecha_alta ?? ""), fechaDesde, fechaHasta)
      ).length;

      const totalClientesCreados = clientes.filter((c) =>
        estaEnRango(String(c.fechaCreacion ?? ""), fechaDesde, fechaHasta)
      ).length;

      setVentasTotal(sumaVentas);
      setComprasTotal(sumaCompras);
      setArticulosCreados(totalArticulosCreados);
      setClientesCreados(totalClientesCreados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aplicar filtros");
      setVentasTotal(null);
      setComprasTotal(null);
      setArticulosCreados(null);
      setClientesCreados(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-1 size-6 text-sky-600" aria-hidden />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-800">
                Indicadores
              </h1>
              <p className="mt-2 text-slate-600">
                Resumen rápido de métricas clave del negocio.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <form
            onSubmit={aplicarFiltros}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="fecha-desde"
                className="text-sm font-medium text-slate-700"
              >
                Fecha desde
              </label>
              <input
                id="fecha-desde"
                name="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="fecha-hasta"
                className="text-sm font-medium text-slate-700"
              >
                Fecha hasta
              </label>
              <input
                id="fecha-hasta"
                name="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <button type="submit" className="btn-primary w-full sm:w-auto">
              {loading ? "Aplicando..." : "Aplicar filtros"}
            </button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 sm:px-6 shadow-sm">
          <p className="text-sm font-medium text-slate-700">{periodoTexto}</p>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cardClass}>
            <p className="text-sm text-slate-500">Ventas del mes</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold text-slate-800">
                {ventasTotal === null ? "--" : money.format(ventasTotal)}
              </p>
              <TrendingUp className="size-5 text-emerald-600" aria-hidden />
            </div>
          </div>
          <div className={cardClass}>
            <p className="text-sm text-slate-500">Compras del mes</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold text-slate-800">
                {comprasTotal === null ? "--" : money.format(comprasTotal)}
              </p>
              <CreditCard className="size-5 text-amber-600" aria-hidden />
            </div>
          </div>
          <div className={cardClass}>
            <p className="text-sm text-slate-500">Artículos creados</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold text-slate-800">
                {articulosCreados === null ? "--" : articulosCreados}
              </p>
              <Package className="size-5 text-indigo-600" aria-hidden />
            </div>
          </div>
          <div className={cardClass}>
            <p className="text-sm text-slate-500">Clientes creados</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold text-slate-800">
                {clientesCreados === null ? "--" : clientesCreados}
              </p>
              <Users className="size-5 text-fuchsia-600" aria-hidden />
            </div>
          </div>
        </section>

        <div className={`rounded-xl border p-6 shadow-sm ${balanceClassName}`}>
          <p className="text-sm font-medium opacity-80">Resultado (Ventas - Compras)</p>
          <p className="mt-2 text-3xl font-semibold">
            {balance === null ? "--" : money.format(balance)}
          </p>
          <p className="mt-1 text-sm opacity-80">
            {balance === null
              ? "Aplica filtros para ver el resultado."
              : balance >= 0
              ? "Resultado positivo"
              : "Resultado negativo"}
          </p>
        </div>

        <div>
          <Link href="/" className="btn-secondary w-full sm:w-auto">
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
