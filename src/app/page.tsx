import Link from "next/link";
import { BarChart3, Package, Receipt, ShoppingCart, Truck, Users } from "lucide-react";

const navLinkClass =
  "btn-primary w-full sm:w-auto sm:min-w-[180px] gap-2";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-6 lg:p-8">
      <main className="flex w-full max-w-3xl flex-col items-center justify-center gap-8 sm:gap-12 py-12 sm:py-20 lg:py-32 sm:items-start">
        <div className="rounded-xl shadow-sm border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 w-full">
          <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
            <h1 className="max-w-md text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-slate-800">
              App de gestión Administrativa y stock (demo).
            </h1>
            <p className="max-w-md text-base sm:text-lg leading-7 text-slate-600">
              Pruébalo, si te sirve para tu negocio,
              contáctame al ws +5491127003907
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row mt-8 pt-8 border-t border-slate-100">
            <Link href="/listaarticulos" className={navLinkClass}>
              <Package className="size-5 shrink-0" aria-hidden />
              Artículos
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row mt-8 pt-8 border-t border-slate-100">
            <Link href="/listaventas" className={navLinkClass}>
              <Receipt className="size-5 shrink-0" aria-hidden />
              Ventas
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row mt-8 pt-8 border-t border-slate-100">
            <Link href="/listaproveedores" className={navLinkClass}>
              <Truck className="size-5 shrink-0" aria-hidden />
              Proveedores
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row mt-8 pt-8 border-t border-slate-100">
            <Link href="/listacompras" className={navLinkClass}>
              <ShoppingCart className="size-5 shrink-0" aria-hidden />
              Compras y gastos
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row mt-8 pt-8 border-t border-slate-100">
            <Link href="/listaclientes" className={navLinkClass}>
              <Users className="size-5 shrink-0" aria-hidden />
              Clientes
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row mt-8 pt-8 border-t border-slate-100">
            <Link href="/indicadores" className={navLinkClass}>
              <BarChart3 className="size-5 shrink-0" aria-hidden />
              Indicadores
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
