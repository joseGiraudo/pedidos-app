"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer";

import { createCustomer, updateCustomer } from "./actions";

type CustomerFormProps = {
  mode: "create" | "edit";
  customerId?: string;
  defaults: CustomerFormValues;
};

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:ring-3 dark:bg-input/30";

export function CustomerForm({ mode, customerId, defaults }: CustomerFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result =
      mode === "create"
        ? await createCustomer(values)
        : await updateCustomer(customerId!, values);

    if ("error" in result) {
      setError("root", { message: result.error });
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? "Cliente creado." : "Cambios guardados.");
    router.push("/panel/clientes");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessName">Nombre del negocio</Label>
        <Input id="businessName" {...register("businessName")} />
        {errors.businessName && (
          <p className="text-destructive text-sm">{errors.businessName.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactName">Contacto</Label>
          <Input id="contactName" placeholder="Opcional" {...register("contactName")} />
          {errors.contactName && (
            <p className="text-destructive text-sm">{errors.contactName.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">WhatsApp / teléfono</Label>
          <Input
            id="phone"
            inputMode="tel"
            placeholder="Opcional (ej. 351 234-5678)"
            {...register("phone")}
          />
          {errors.phone ? (
            <p className="text-destructive text-sm">{errors.phone.message}</p>
          ) : (
            <p className="text-muted-foreground text-xs">Sirve para enviarle el link por WhatsApp.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" placeholder="Opcional" {...register("address")} />
          {errors.address && <p className="text-destructive text-sm">{errors.address.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" placeholder="Opcional" {...register("city")} />
          {errors.city && <p className="text-destructive text-sm">{errors.city.message}</p>}
        </div>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Lista y descuento</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priceList">Lista de precios</Label>
            <select id="priceList" className={selectClass} {...register("priceList")}>
              <option value="wholesale">Mayorista</option>
              <option value="retail">Minorista</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discountPct">Descuento (%)</Label>
            <Input
              id="discountPct"
              inputMode="decimal"
              placeholder="0"
              {...register("discountPct")}
            />
            {errors.discountPct && (
              <p className="text-destructive text-sm">{errors.discountPct.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Opcional"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-3 dark:bg-input/30"
          {...register("notes")}
        />
        {errors.notes && <p className="text-destructive text-sm">{errors.notes.message}</p>}
      </div>

      {errors.root && <p className="text-destructive text-sm">{errors.root.message}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : mode === "create"
              ? "Crear cliente"
              : "Guardar cambios"}
        </Button>
        <Link href="/panel/clientes" className="text-muted-foreground px-2 text-sm hover:underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
