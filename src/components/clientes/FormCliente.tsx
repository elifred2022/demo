"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Cliente } from "@/lib/google-sheets";

interface FormClienteProps {
  onCerrar: () => void;
  cliente?: Cliente | null;
  onMutate?: () => void;
}

export default function FormCliente({
  onCerrar,
  cliente,
  onMutate,
}: FormClienteProps) {
  const router = useRouter();
  const esEdicion = !!cliente;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const fechaHoy = () => new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    nombre: cliente?.nombre ?? "",
    telefono: cliente?.telefono ?? "",
    email: cliente?.email ?? "",
    direccion: cliente?.direccion ?? "",
    fechaCreacion: cliente?.fechaCreacion ?? fechaHoy(),
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre ?? "",
        telefono: cliente.telefono ?? "",
        email: cliente.email ?? "",
        direccion: cliente.direccion ?? "",
        fechaCreacion: cliente.fechaCreacion ?? "",
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        fechaCreacion: fechaHoy(),
      }));
    }
  }, [cliente]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setError("");
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);

    const payload = esEdicion
      ? {
          nombre: formData.nombre.trim(),
          telefono: formData.telefono.trim() || undefined,
          email: formData.email.trim() || undefined,
          direccion: formData.direccion.trim() || undefined,
          fechaCreacion: formData.fechaCreacion.trim(),
        }
      : {
          nombre: formData.nombre.trim(),
          telefono: formData.telefono.trim() || undefined,
          email: formData.email.trim() || undefined,
          direccion: formData.direccion.trim() || undefined,
        };

    try {
      const url = esEdicion
        ? `/api/clientes/${encodeURIComponent(cliente!.idcliente)}`
        : "/api/clientes";
      const method = esEdicion ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar el cliente");
      }

      onCerrar();
      onMutate?.() ?? router.refresh();
      setFormData({
        nombre: "",
        telefono: "",
        email: "",
        direccion: "",
        fechaCreacion: fechaHoy(),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar"
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {esEdicion ? "Editar cliente" : "Crear nuevo cliente"}
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

          {esEdicion && (
            <div>
              <label
                htmlFor="idcliente"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                ID Cliente
              </label>
              <input
                id="idcliente"
                type="text"
                value={cliente.idcliente}
                readOnly
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-600 cursor-not-allowed bg-slate-100"
              />
            </div>
          )}

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
              placeholder="Nombre del cliente"
            />
          </div>

          <div>
            <label
              htmlFor="fechaCreacion"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Fecha de creación
            </label>
            <input
              id="fechaCreacion"
              name="fechaCreacion"
              type="date"
              value={formData.fechaCreacion ?? ""}
              readOnly
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 cursor-not-allowed bg-slate-100 focus:outline-none focus:ring-1"
            />
            <p className="mt-1 text-xs text-slate-500">
              {esEdicion
                ? "Fecha de alta del registro (solo lectura)"
                : "Se asignará automáticamente la fecha de hoy"}
            </p>
          </div>

          <div>
            <label
              htmlFor="telefono"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="text"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Ej: +54 11 1234-5678"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label
              htmlFor="direccion"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Dirección
            </label>
            <textarea
              id="direccion"
              name="direccion"
              rows={2}
              value={formData.direccion}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Dirección opcional"
            />
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
                : esEdicion
                  ? "Actualizar"
                  : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
