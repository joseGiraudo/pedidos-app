"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CANONICAL_FIELDS,
  FIELD_LABELS,
  emptyMapping,
  type CanonicalField,
  type ColumnMapping,
} from "@/lib/import/mapping";
import type { RawSheet } from "@/lib/import/parse";
import type { ImportMode, MissingAction } from "@/lib/import/preview";

import {
  parseSpreadsheet,
  previewImport,
  type PreviewRowDto,
  type PreviewResult,
} from "./actions";

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:ring-3 dark:bg-input/30";

type Step = "upload" | "map" | "preview";

// Campos que no se muestran si el proveedor no usa esa taxonomía.
const TAXONOMY_FIELDS: Record<string, "brand" | "category"> = {
  marca: "brand",
  categoria: "category",
};

const MODE_OPTIONS: { value: ImportMode; label: string }[] = [
  { value: "upsert", label: "Agregar y actualizar" },
  { value: "add_only", label: "Solo agregar nuevos" },
  { value: "update_prices_only", label: "Solo actualizar precios" },
];

const MISSING_OPTIONS: { value: MissingAction; label: string }[] = [
  { value: "keep", label: "Dejarlos como están" },
  { value: "mark_out_of_stock", label: "Marcarlos sin stock" },
  { value: "deactivate", label: "Darlos de baja" },
];

const STATUS_LABELS: Record<PreviewRowDto["status"], string> = {
  create: "Nuevo",
  update: "Actualizar",
  possible_duplicate: "Posible duplicado",
  skip: "Omitir",
  error: "Error",
};

const STATUS_CLASSES: Record<PreviewRowDto["status"], string> = {
  create: "text-green-700 dark:text-green-400",
  update: "text-blue-700 dark:text-blue-400",
  possible_duplicate: "text-amber-700 dark:text-amber-400",
  skip: "text-muted-foreground",
  error: "text-destructive",
};

type ImportWizardProps = {
  usesOwnCodes: boolean;
  useBrands: boolean;
  useCategories: boolean;
};

export function ImportWizard({ usesOwnCodes, useBrands, useCategories }: ImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [sheet, setSheet] = useState<RawSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping());
  const [mode, setMode] = useState<ImportMode>("upsert");
  const [missingAction, setMissingAction] = useState<MissingAction>("keep");
  const [preview, setPreview] = useState<Extract<PreviewResult, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function isHiddenField(field: CanonicalField): boolean {
    const taxonomy = TAXONOMY_FIELDS[field];
    if (taxonomy === "brand") return !useBrands;
    if (taxonomy === "category") return !useCategories;
    return false;
  }

  function isRequiredField(field: CanonicalField): boolean {
    if (field === "nombre" || field === "precio_mayorista") return true;
    if (field === "codigo") return usesOwnCodes;
    return false;
  }

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Elegí un archivo primero.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await parseSpreadsheet(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setSheet(result.sheet);
      setMapping(result.mapping);
      setStep("map");
      if (result.savedMapping) toast.success("Se aplicó el mapeo que usaste la última vez.");
      if (result.codeMayHaveLostZeros) {
        toast.warning(
          "Los códigos parecen numéricos: si tenían ceros a la izquierda, puede que Excel los haya perdido. Exportá con formato texto.",
        );
      }
    });
  }

  function handlePreview() {
    if (!sheet) return;
    startTransition(async () => {
      const result = await previewImport({
        headers: sheet.headers,
        rows: sheet.rows,
        mapping,
        mode,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPreview(result);
      setStep("preview");
    });
  }

  function setField(field: CanonicalField, header: string) {
    setMapping((prev) => ({ ...prev, [field]: header === "" ? null : header }));
  }

  if (step === "upload") {
    return (
      <div className="flex flex-col gap-4 rounded-xl border p-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="file">Planilla (CSV o Excel .xlsx)</Label>
          <input
            ref={fileRef}
            id="file"
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="text-sm"
          />
          <p className="text-muted-foreground text-xs">
            CSV con separador «;» y decimales con coma. La primera fila son los encabezados.
          </p>
        </div>
        <div>
          <Button onClick={handleUpload} disabled={pending}>
            {pending ? "Leyendo…" : "Continuar"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "map" && sheet) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border p-6">
          <h2 className="mb-1 text-lg font-medium">Asociá las columnas</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {sheet.rows.length} {sheet.rows.length === 1 ? "fila" : "filas"} detectadas. Elegí qué
            columna de tu planilla corresponde a cada dato. Los campos con * son obligatorios.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CANONICAL_FIELDS.filter((f) => !isHiddenField(f)).map((field) => (
              <div key={field} className="flex flex-col gap-1">
                <Label htmlFor={`map-${field}`}>
                  {FIELD_LABELS[field]}
                  {isRequiredField(field) && <span className="text-destructive"> *</span>}
                </Label>
                <select
                  id={`map-${field}`}
                  className={selectClass}
                  value={mapping[field] ?? ""}
                  onChange={(e) => setField(field, e.target.value)}
                >
                  <option value="">— No importar</option>
                  {sheet.headers.map((h, i) => (
                    <option key={`${h}-${i}`} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4 flex max-w-xs flex-col gap-1">
            <Label htmlFor="import-mode">Modo de importación</Label>
            <select
              id="import-mode"
              className={selectClass}
              value={mode}
              onChange={(e) => setMode(e.target.value as ImportMode)}
            >
              {MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("upload")} disabled={pending}>
            Atrás
          </Button>
          <Button onClick={handlePreview} disabled={pending}>
            {pending ? "Calculando…" : "Ver vista previa"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "preview" && preview) {
    const { summary, rows } = preview;
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <SummaryCard label="Nuevos" value={summary.create} className={STATUS_CLASSES.create} />
          <SummaryCard label="Actualizar" value={summary.update} className={STATUS_CLASSES.update} />
          <SummaryCard
            label="Posibles duplicados"
            value={summary.possibleDuplicate}
            className={STATUS_CLASSES.possible_duplicate}
          />
          <SummaryCard label="Omitir" value={summary.skip} className={STATUS_CLASSES.skip} />
          <SummaryCard label="Errores" value={summary.error} className={STATUS_CLASSES.error} />
        </div>

        <PreviewTable rows={rows} />

        {summary.missing > 0 && (
          <div className="flex max-w-md flex-col gap-1 rounded-xl border p-4">
            <Label htmlFor="missing-action">
              {summary.missing} {summary.missing === 1 ? "artículo" : "artículos"} del catálogo no
              {summary.missing === 1 ? " está" : " están"} en la planilla
            </Label>
            <select
              id="missing-action"
              className={selectClass}
              value={missingAction}
              onChange={(e) => setMissingAction(e.target.value as MissingAction)}
            >
              {MISSING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("map")} disabled={pending}>
            Atrás
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className={`text-2xl font-semibold ${className}`}>{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function PreviewTable({ rows }: { rows: PreviewRowDto[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No hay filas para mostrar.</p>;
  }
  return (
    <div className="max-h-96 overflow-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr className="text-left">
            <th className="p-2 font-medium">Fila</th>
            <th className="p-2 font-medium">Estado</th>
            <th className="p-2 font-medium">Código</th>
            <th className="p-2 font-medium">Nombre</th>
            <th className="p-2 font-medium">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.index} className="border-t">
              {/* +2: la fila 1 son los encabezados y el índice arranca en 0. */}
              <td className="text-muted-foreground p-2">{r.index + 2}</td>
              <td className={`p-2 font-medium ${STATUS_CLASSES[r.status]}`}>
                {STATUS_LABELS[r.status]}
              </td>
              <td className="p-2">{r.code || "—"}</td>
              <td className="p-2">{r.name || "—"}</td>
              <td className="text-muted-foreground p-2">
                {r.errors.length > 0 ? r.errors.join(". ") : (r.skipReason ?? "")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
