"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supplierConfigSchema, type SupplierConfigFormValues } from "@/lib/validations/supplier";

import { saveConfig } from "./actions";

const toggles = [
  { name: "useBrands", label: "Uso marcas", hint: "Clasificá tus artículos por marca." },
  {
    name: "useCategories",
    label: "Uso categorías",
    hint: "Agrupá tus artículos por categoría.",
  },
  {
    name: "usesOwnCodes",
    label: "Uso mis propios códigos",
    hint: "Si lo desactivás, el sistema genera los códigos.",
  },
] as const;

export function ConfigForm({ defaults }: { defaults: SupplierConfigFormValues }) {
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupplierConfigFormValues>({
    resolver: zodResolver(supplierConfigSchema),
    defaultValues: defaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false);
    const result = await saveConfig(values);
    if ("error" in result) {
      setError("root", { message: result.error });
      return;
    }
    setSaved(true);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nombre del comercio</Label>
        <Input id="name" autoComplete="organization" {...register("name")} />
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input id="whatsapp" type="tel" inputMode="tel" {...register("whatsapp")} />
        {errors.whatsapp && <p className="text-destructive text-sm">{errors.whatsapp.message}</p>}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Funciones</legend>
        {toggles.map((t) => (
          <label key={t.name} htmlFor={t.name} className="flex items-start gap-3">
            <input
              id={t.name}
              type="checkbox"
              className="accent-primary mt-0.5 size-4"
              {...register(t.name)}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t.label}</span>
              <span className="text-muted-foreground text-sm">{t.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {errors.root && <p className="text-destructive text-sm">{errors.root.message}</p>}
      {saved && <p className="text-sm text-green-700 dark:text-green-500">Cambios guardados.</p>}

      <Button type="submit" size="lg" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
