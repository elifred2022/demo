"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Proveedor } from "@/lib/google-sheets";

interface FormProveedoresProps {
  onCerrar: () => void;
  proveedor?: Proveedor | null;
  onMutate?: () => void;
}

export default function FormProveedores({
  onCerrar,
  proveedor,
  onMutate,
}: FormProveedoresProps) {
  const router = useRouter();
  const esEdicion = !!proveedor;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [codigoExiste, setCodigoExiste] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [formData, setFormData] = useState({
    idproveedor: proveedor?.idproveedor ?? "",
    nombre: proveedor?.nombre ?? "",
    telefono: proveedor?.telefono ?? "",
    email: proveedor?.email ?? "",
    direccion: proveedor?.direccion ?? "",
    contacto: proveedor?.contacto ?? "",
  });

  useEffect(() => {
    if (proveedor) {
      setFormData({
        idproveedor: proveedor.idproveedor ?? "",
        nombre: proveedor.nombre ?? "",
        telefono: proveedor.telefono ?? "",
        email: proveedor.email ?? "",
        direccion: proveedor.direccion ?? "",
        contacto: proveedor.contacto ?? "",
      });
      setCodigoExiste(false);
    }
  }, [proveedor]);

  const verificarCodigo = useCallback(
    async (id: string) => {
      const codigo = id.trim();
      if (!codigo) {
        setCodigoExiste(false);
        return;
      }
      if (
        esEdicion &&
        codigo.toLowerCase() === proveedor?.idproveedor?.toLowerCase()
      ) {
        setCodigoExiste(false);
        return;
      }
      setVerificando(true);
      try {
        const res = await fetch(
          `/api/proveedores/${encodeURIComponent(codigo)}`
        );
        const data = await res.json();
        setCodigoExiste(data.exists === true);
      } catch {
        setCodigoExiste(false);
      } finally {
        setVerificando(false);
      }
    },
    [esEdicion, proveedor?.idproveedor]
  );

  useEffect(() => {
    const tiempo = setTimeout(() => {
      verificarCodigo(formData.idproveedor);
    }, 400);
    return () => clearTimeout(tiempo);
  }, [formData.idproveedor, verificarCodigo]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setError("");
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoExiste) return;
    setError("");
    setEnviando(true);

    const payload = {
      idproveedor: formData.idproveedor.trim(),
      nombre: formData.nombre.trim(),
      telefono: formData.telefono.trim() || undefined,
      email: formData.email.trim() || undefined,
      direccion: formData.direccion.trim() || undefined,
      contacto: formData.contacto.trim() || undefined,
    };

    try {
      const url = esEdicion
        ? `/api/proveedores/${encodeURIComponent(proveedor!.idproveedor)}`
        : "/api/proveedores";
      const method = esEdicion ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar el proveedor");
      }

      onCerrar();
      onMutate?.() ?? router.refresh();
      setFormData({
        idproveedor: "",
        nombre: "",
        telefono: "",
        email: "",
        direccion: "",
        contacto: "",
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
            {esEdicion ? "Editar proveedor" : "Crear nuevo proveedor"}
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
              htmlFor="idproveedor"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              ID Proveedor <span className="text-red-500">*</span>
            </label>
            <input
              id="idproveedor"
              name="idproveedor"
              type="text"
              required
              value={formData.idproveedor}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 ${
                codigoExiste
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-sky-500 focus:ring-sky-500"
              }`}
              placeholder="Ej: PROV001"
            />
            {verificando && formData.idproveedor.trim() && (
              <p className="mt-1 text-xs text-slate-500">Verificando...</p>
            )}
            {codigoExiste && !verificando && (
              <p className="mt-1 text-sm font-medium text-red-600">
                ID existente
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
              placeholder="Nombre del proveedor"
            />
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

          <div>
            <label
              htmlFor="contacto"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Contacto
            </label>
            <input
              id="contacto"
              name="contacto"
              type="text"
              value={formData.contacto}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Persona de contacto"
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
              disabled={enviando || codigoExiste}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {enviando
                ? "Guardando…"
                : esEdicion
                  ? "Actualizar"
                  : "Crear proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
