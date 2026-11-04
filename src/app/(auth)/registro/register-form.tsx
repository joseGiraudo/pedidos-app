"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth";

import { register as registerAction } from "./actions";

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { businessName: "", whatsapp: "", name: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    // register() redirige al panel si todo sale bien; solo vuelve con un error.
    const result = await registerAction(values);
    if (result?.error) {
      setError("root", { message: result.error });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessName">Nombre del comercio</Label>
        <Input id="businessName" autoComplete="organization" {...register("businessName")} />
        {errors.businessName && (
          <p className="text-destructive text-sm">{errors.businessName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          type="tel"
          inputMode="tel"
          placeholder="Ej. 3512345678"
          autoComplete="tel"
          {...register("whatsapp")}
        />
        {errors.whatsapp && <p className="text-destructive text-sm">{errors.whatsapp.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Tu nombre</Label>
        <Input id="name" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
      </div>

      {errors.root && <p className="text-destructive text-sm">{errors.root.message}</p>}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
