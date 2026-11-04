"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { taxonomyNameSchema, type TaxonomyNameFormValues } from "@/lib/validations/catalog";

type Result = { ok: true } | { error: string };

export type TaxonomyItem = {
  id: string;
  name: string;
  productCount: number;
};

type TaxonomyManagerProps = {
  items: TaxonomyItem[];
  /** Nombres en castellano, femeninos ("categoría"/"categorías", "marca"/"marcas"). */
  labels: { singular: string; plural: string };
  onCreate: (values: TaxonomyNameFormValues) => Promise<Result>;
  onRename: (id: string, values: TaxonomyNameFormValues) => Promise<Result>;
  onDelete: (id: string) => Promise<Result>;
  /** Si viene, se muestran los botones ↑/↓ para reordenar. */
  onMove?: (id: string, direction: "up" | "down") => Promise<Result>;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Pantalla de ABM reutilizada por categorías y marcas. Recibe los datos ya ordenados y
// las server actions enlazadas; solo categorías pasan `onMove`.
export function TaxonomyManager({
  items,
  labels,
  onCreate,
  onRename,
  onDelete,
  onMove,
}: TaxonomyManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaxonomyNameFormValues>({
    resolver: zodResolver(taxonomyNameSchema),
    defaultValues: { name: "" },
  });

  function run(action: () => Promise<Result>, onOk: () => void) {
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      onOk();
      router.refresh();
    });
  }

  const onCreateSubmit = handleSubmit((values) => {
    run(
      () => onCreate(values),
      () => {
        reset();
        toast.success(`${capitalize(labels.singular)} creada.`);
      },
    );
  });

  function startEdit(item: TaxonomyItem) {
    setConfirmId(null);
    setEditingId(item.id);
    setEditName(item.name);
  }

  function saveEdit(id: string) {
    const parsed = taxonomyNameSchema.safeParse({ name: editName });
    if (!parsed.success) {
      toast.error("Revisá el nombre ingresado.");
      return;
    }
    run(
      () => onRename(id, { name: editName }),
      () => {
        setEditingId(null);
        toast.success("Nombre actualizado.");
      },
    );
  }

  function confirmDelete(id: string) {
    run(
      () => onDelete(id),
      () => {
        setConfirmId(null);
        toast.success(`${capitalize(labels.singular)} eliminada.`);
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onCreateSubmit} className="flex flex-col gap-1.5" noValidate>
        <Label htmlFor="new-name">Agregar {labels.singular}</Label>
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Input id="new-name" placeholder={`Nombre de la ${labels.singular}`} {...register("name")} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <Button type="submit" disabled={isPending}>
            Agregar
          </Button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Todavía no tenés {labels.plural}.</p>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {items.map((item, i) => (
            <li key={item.id} className="flex flex-col gap-2 p-3">
              {editingId === item.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(item.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button size="sm" disabled={isPending} onClick={() => saveEdit(item.id)}>
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.productCount === 0
                        ? "Sin artículos"
                        : `${item.productCount} ${item.productCount === 1 ? "artículo" : "artículos"}`}
                    </span>
                  </div>
                  {onMove && (
                    <>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Subir"
                        disabled={isPending || i === 0}
                        onClick={() => run(() => onMove(item.id, "up"), () => {})}
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Bajar"
                        disabled={isPending || i === items.length - 1}
                        onClick={() => run(() => onMove(item.id, "down"), () => {})}
                      >
                        <ArrowDownIcon />
                      </Button>
                    </>
                  )}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Editar ${item.name}`}
                    onClick={() => startEdit(item)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Eliminar ${item.name}`}
                    onClick={() => {
                      setEditingId(null);
                      setConfirmId(item.id);
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              )}

              {confirmId === item.id && (
                <div className="bg-muted/50 flex flex-wrap items-center gap-3 rounded-md p-3 text-sm">
                  <span className="flex-1">
                    ¿Eliminar «{item.name}»?
                    {item.productCount > 0 &&
                      ` ${item.productCount} ${item.productCount === 1 ? "artículo quedará" : "artículos quedarán"} sin ${labels.singular}.`}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => confirmDelete(item.id)}
                  >
                    Eliminar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                    Cancelar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
