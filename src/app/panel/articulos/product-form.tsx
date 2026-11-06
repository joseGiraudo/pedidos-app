"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { makeProductSchema, type ProductFormValues } from "@/lib/validations/catalog";

import { createProduct, updateProduct } from "./actions";

type Option = { id: string; name: string };

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  defaults: ProductFormValues;
  brands: Option[];
  categories: Option[];
  useBrands: boolean;
  useCategories: boolean;
  usesOwnCodes: boolean;
  /** Código generado por el sistema, a mostrar como solo lectura al editar. */
  generatedCode?: string;
};

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:ring-3 dark:bg-input/30";

export function ProductForm({
  mode,
  productId,
  defaults,
  brands,
  categories,
  useBrands,
  useCategories,
  usesOwnCodes,
  generatedCode,
}: ProductFormProps) {
  const router = useRouter();
  const schema = useMemo(() => makeProductSchema(usesOwnCodes), [usesOwnCodes]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  // `watch()` dispara el warning `react-hooks/incompatible-library` del React Compiler
  // (no puede memoizar lo que devuelve RHF); es esperado y seguro acá.
  /* eslint-disable react-hooks/incompatible-library */
  const pricingUnit = watch("pricingUnit");
  const orderMode = watch("orderMode");
  /* eslint-enable react-hooks/incompatible-library */

  // Mantener coherente cómo se pide con el tipo de precio: por unidad ⇒ se pide por
  // unidad; al pasar a por kilo, arrancar en "por pieza".
  useEffect(() => {
    if (pricingUnit === "unit" && orderMode !== "unit") setValue("orderMode", "unit");
    if (pricingUnit === "kg" && orderMode === "unit") setValue("orderMode", "piece");
  }, [pricingUnit, orderMode, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const result =
      mode === "create"
        ? await createProduct(values)
        : await updateProduct(productId!, values);

    if ("error" in result) {
      setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? "Artículo creado." : "Cambios guardados.");
    router.push("/panel/articulos");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {usesOwnCodes ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Código</Label>
          <Input id="code" className="font-mono" {...register("code")} />
          {errors.code && <p className="text-destructive text-sm">{errors.code.message}</p>}
        </div>
      ) : (
        mode === "edit" &&
        generatedCode && (
          <div className="flex flex-col gap-1.5">
            <Label>Código</Label>
            <p className="text-muted-foreground font-mono text-sm">
              {generatedCode}{" "}
              <span className="font-sans">(generado por el sistema)</span>
            </p>
          </div>
        )
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </div>

      {useBrands && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brandId">Marca</Label>
          <select id="brandId" className={selectClass} {...register("brandId")}>
            <option value="">Sin marca</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {useCategories && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">Categoría</Label>
          <select id="categoryId" className={selectClass} {...register("categoryId")}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="presentation">Presentación</Label>
          <Input id="presentation" placeholder="Caja x 24, horma…" {...register("presentation")} />
          {errors.presentation && (
            <p className="text-destructive text-sm">{errors.presentation.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unitsPerPack">Unidades por bulto</Label>
          <Input
            id="unitsPerPack"
            inputMode="numeric"
            placeholder="Opcional"
            {...register("unitsPerPack")}
          />
          {errors.unitsPerPack && (
            <p className="text-destructive text-sm">{errors.unitsPerPack.message}</p>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Precio y forma de pedido</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pricingUnit">Tipo de precio</Label>
            <select id="pricingUnit" className={selectClass} {...register("pricingUnit")}>
              <option value="unit">Por unidad</option>
              <option value="kg">Por kilo</option>
            </select>
          </div>

          {pricingUnit === "kg" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="orderMode">Cómo se pide</Label>
              <select id="orderMode" className={selectClass} {...register("orderMode")}>
                <option value="piece">Por pieza (ej. 2 hormas)</option>
                <option value="kg">Por kilo (ej. 1,5 kg)</option>
              </select>
              {errors.orderMode && (
                <p className="text-destructive text-sm">{errors.orderMode.message}</p>
              )}
            </div>
          )}
        </div>

        {pricingUnit === "kg" && orderMode === "piece" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="avgPieceWeightKg">Peso promedio por pieza (kg)</Label>
            <Input
              id="avgPieceWeightKg"
              inputMode="decimal"
              placeholder="4,200"
              {...register("avgPieceWeightKg")}
            />
            <p className="text-muted-foreground text-xs">Sirve para estimar el total al pedir.</p>
            {errors.avgPieceWeightKg && (
              <p className="text-destructive text-sm">{errors.avgPieceWeightKg.message}</p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wholesalePrice">
              Precio mayorista {pricingUnit === "kg" ? "(por kg)" : ""}
            </Label>
            <Input
              id="wholesalePrice"
              inputMode="decimal"
              placeholder="12500,00"
              {...register("wholesalePrice")}
            />
            {errors.wholesalePrice && (
              <p className="text-destructive text-sm">{errors.wholesalePrice.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="retailPrice">Precio minorista</Label>
            <Input
              id="retailPrice"
              inputMode="decimal"
              placeholder="Opcional (usa el mayorista)"
              {...register("retailPrice")}
            />
            {errors.retailPrice && (
              <p className="text-destructive text-sm">{errors.retailPrice.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      <label htmlFor="isAvailable" className="flex items-start gap-3">
        <input
          id="isAvailable"
          type="checkbox"
          className="accent-primary mt-0.5 size-4"
          {...register("isAvailable")}
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">Disponible</span>
          <span className="text-muted-foreground text-sm">
            Destildá para marcarlo sin stock sin borrarlo.
          </span>
        </span>
      </label>

      {errors.root && <p className="text-destructive text-sm">{errors.root.message}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : mode === "create"
              ? "Crear artículo"
              : "Guardar cambios"}
        </Button>
        <Link
          href="/panel/articulos"
          className="text-muted-foreground px-2 text-sm hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
