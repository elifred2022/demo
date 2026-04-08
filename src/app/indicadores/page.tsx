"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CreditCard,
  Download,
  FilterX,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";

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
  idcliente?: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
};

type VentaApi = FechaTotalItem & {
  idventa?: string;
  cliente?: string;
  nombre?: string;
  cantidad?: number;
  precioUnitario?: number;
};

type CompraApi = FechaTotalItem & {
  idcompra?: string;
  proveedor?: string;
  articulo?: string;
  cantidad?: number;
};

type ArticuloApi = ArticuloItem & {
  codbarra?: string;
  idarticulo?: string;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  por_aplic?: number;
  precio_venta?: number;
  stock?: number;
  categoria?: string;
};

type DatosFiltradosExport = {
  ventas: VentaApi[];
  compras: CompraApi[];
  articulos: ArticuloApi[];
  clientes: ClienteItem[];
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
  const [datosFiltrados, setDatosFiltrados] = useState<DatosFiltradosExport | null>(
    null
  );
  const cargaSeq = useRef(0);

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
    if (!fechaDesde && !fechaHasta) {
      return "Sin filtros: indicá al menos una fecha y aplicá para ver indicadores.";
    }
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

  function vaciarResultadosIndicadores() {
    setVentasTotal(null);
    setComprasTotal(null);
    setArticulosCreados(null);
    setClientesCreados(null);
    setDatosFiltrados(null);
  }

  function invalidarCargaEnCurso() {
    cargaSeq.current += 1;
    setLoading(false);
  }

  async function cargarIndicadores(desde: string, hasta: string) {
    const id = ++cargaSeq.current;
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

      const ventas: VentaApi[] = Array.isArray(ventasData?.ventas)
        ? ventasData.ventas
        : [];
      const compras: CompraApi[] = Array.isArray(comprasData?.compras)
        ? comprasData.compras
        : [];
      const articulos: ArticuloApi[] = Array.isArray(articulosData?.articulos)
        ? articulosData.articulos
        : [];
      const clientes: ClienteItem[] = Array.isArray(clientesData?.clientes)
        ? clientesData.clientes
        : [];

      const ventasEnRango = ventas.filter((v) =>
        estaEnRango(String(v.fecha ?? ""), desde, hasta)
      );
      const comprasEnRango = compras.filter((c) =>
        estaEnRango(String(c.fecha ?? ""), desde, hasta)
      );
      const articulosEnRango = articulos.filter((a) =>
        estaEnRango(String(a.fecha_alta ?? ""), desde, hasta)
      );
      const clientesEnRango = clientes.filter((c) =>
        estaEnRango(String(c.fechaCreacion ?? ""), desde, hasta)
      );

      const sumaVentas = ventasEnRango.reduce(
        (acc, v) => acc + (Number(v.total) || 0),
        0
      );
      const sumaCompras = comprasEnRango.reduce(
        (acc, c) => acc + (Number(c.total) || 0),
        0
      );
      const totalArticulosCreados = articulosEnRango.length;
      const totalClientesCreados = clientesEnRango.length;

      if (id !== cargaSeq.current) return;

      setVentasTotal(sumaVentas);
      setComprasTotal(sumaCompras);
      setArticulosCreados(totalArticulosCreados);
      setClientesCreados(totalClientesCreados);
      setDatosFiltrados({
        ventas: ventasEnRango,
        compras: comprasEnRango,
        articulos: articulosEnRango,
        clientes: clientesEnRango,
      });
    } catch (err) {
      if (id !== cargaSeq.current) return;
      setError(err instanceof Error ? err.message : "Error al aplicar filtros");
      vaciarResultadosIndicadores();
    } finally {
      if (id === cargaSeq.current) setLoading(false);
    }
  }

  async function aplicarFiltros(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fechaDesde.trim() && !fechaHasta.trim()) {
      invalidarCargaEnCurso();
      vaciarResultadosIndicadores();
      setError("Indicá al menos una fecha (desde o hasta).");
      return;
    }
    await cargarIndicadores(fechaDesde, fechaHasta);
  }

  function limpiarFiltros() {
    invalidarCargaEnCurso();
    setFechaDesde("");
    setFechaHasta("");
    setError(null);
    vaciarResultadosIndicadores();
  }

  function descargarExcel() {
    if (!datosFiltrados || ventasTotal === null || comprasTotal === null) return;

    const balanceVal = ventasTotal - comprasTotal;
    const resumen = [
      { concepto: "Periodo", valor: periodoTexto.replace(/^Periodo:\s*/i, "") },
      { concepto: "Fecha desde", valor: fechaDesde || "(sin filtro)" },
      { concepto: "Fecha hasta", valor: fechaHasta || "(sin filtro)" },
      { concepto: "Total ventas", valor: ventasTotal },
      { concepto: "Total compras", valor: comprasTotal },
      { concepto: "Artículos creados (cantidad)", valor: articulosCreados ?? 0 },
      { concepto: "Clientes creados (cantidad)", valor: clientesCreados ?? 0 },
      { concepto: "Resultado (ventas - compras)", valor: balanceVal },
    ];

    const ventasRows = datosFiltrados.ventas.map((v) => ({
      idventa: v.idventa ?? "",
      fecha: v.fecha ?? "",
      cliente: v.cliente ?? "",
      total: Number(v.total) || 0,
      cantidad: v.cantidad ?? "",
      precioUnitario: v.precioUnitario ?? "",
      detalle: v.nombre ?? "",
    }));

    const comprasRows = datosFiltrados.compras.map((c) => ({
      idcompra: c.idcompra ?? "",
      fecha: c.fecha ?? "",
      proveedor: c.proveedor ?? "",
      total: Number(c.total) || 0,
      cantidad: c.cantidad ?? "",
      detalle: c.articulo ?? "",
    }));

    const articulosRows = datosFiltrados.articulos.map((a) => ({
      codbarra: a.codbarra ?? "",
      idarticulo: a.idarticulo ?? "",
      nombre: a.nombre ?? "",
      descripcion: a.descripcion ?? "",
      precio: a.precio ?? "",
      por_aplic: a.por_aplic ?? "",
      precio_venta: a.precio_venta ?? "",
      stock: a.stock ?? "",
      categoria: a.categoria ?? "",
      fecha_alta: a.fecha_alta ?? "",
    }));

    const clientesRows = datosFiltrados.clientes.map((c) => ({
      idcliente: c.idcliente ?? "",
      nombre: c.nombre ?? "",
      telefono: c.telefono ?? "",
      email: c.email ?? "",
      direccion: c.direccion ?? "",
      fechaCreacion: c.fechaCreacion ?? "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(resumen),
      "Resumen"
    );
    XLSX.utils.book_append_sheet(
      wb,
      ventasRows.length
        ? XLSX.utils.json_to_sheet(ventasRows)
        : XLSX.utils.aoa_to_sheet([["Sin ventas en el período"]]),
      "Ventas"
    );
    XLSX.utils.book_append_sheet(
      wb,
      comprasRows.length
        ? XLSX.utils.json_to_sheet(comprasRows)
        : XLSX.utils.aoa_to_sheet([["Sin compras en el período"]]),
      "Compras"
    );
    XLSX.utils.book_append_sheet(
      wb,
      articulosRows.length
        ? XLSX.utils.json_to_sheet(articulosRows)
        : XLSX.utils.aoa_to_sheet([["Sin artículos creados en el período"]]),
      "Articulos"
    );
    XLSX.utils.book_append_sheet(
      wb,
      clientesRows.length
        ? XLSX.utils.json_to_sheet(clientesRows)
        : XLSX.utils.aoa_to_sheet([["Sin clientes creados en el período"]]),
      "Clientes"
    );

    const slugDesde = fechaDesde || "todo";
    const slugHasta = fechaHasta || "todo";
    XLSX.writeFile(wb, `indicadores_${slugDesde}_${slugHasta}.xlsx`);
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

            <div className="col-span-full flex flex-row flex-wrap items-end gap-2 sm:col-span-2">
              <button
                type="submit"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-sky-500 px-3 text-sm font-medium text-white transition-colors hover:bg-sky-600 active:scale-[0.98]"
              >
                {loading ? "Aplicando..." : "Aplicar filtros"}
              </button>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-900 transition-colors hover:border-sky-300 hover:bg-sky-100"
              >
                <FilterX className="size-3.5 shrink-0" aria-hidden />
                Limpiar filtro
              </button>
              <button
                type="button"
                onClick={descargarExcel}
                disabled={!datosFiltrados || ventasTotal === null}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="size-3.5 shrink-0" aria-hidden />
                Descargar Excel
              </button>
            </div>
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
