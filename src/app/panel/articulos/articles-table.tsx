"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { cn } from "cn";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { ArticleRowActions } from "./article-row-actions";
import { PriceCell } from "./price-cell";
import { useUrlParams } from "./use-url-params";

export type ProductRow = {
  id: string;
  code: string;
  name: string;
  brandName: string | null;
  categoryName: string | null;
  presentation: string | null;
  wholesalePrice: string;
  retailPrice: string | null;
  isAvailable: boolean;
  isActive: boolean;
};

type SortKey = "name" | "code" | "wholesale";

type ArticlesTableProps = {
  rows: ProductRow[];
  useBrands: boolean;
  useCategories: boolean;
  sort: { key: SortKey; dir: "asc" | "desc" };
  pagination: { page: number; pageSize: number; total: number };
};

const RIGHT_ALIGNED = new Set(["wholesalePrice", "retailPrice"]);

// Checkbox nativo con estado "indeterminado" (algunas filas, no todas), que solo se puede
// fijar por JS. Se usa en el encabezado de selección de la tabla.
function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && Boolean(indeterminate);
  }, [checked, indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      className="size-4 cursor-pointer align-middle accent-primary"
    />
  );
}

export function ArticlesTable({
  rows,
  useBrands,
  useCategories,
  sort,
  pagination,
}: ArticlesTableProps) {
  const update = useUrlParams();
  const { page, pageSize, total } = pagination;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // La selección es por página visible (la tabla pagina en el servidor): al cambiar el
  // conjunto de filas —página, filtros u orden— se limpia para no arrastrar ids ocultos.
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const rowIdsKey = rows.map((r) => r.id).join(",");
  useEffect(() => {
    setRowSelection({});
  }, [rowIdsKey]);

  const columns = useMemo<ColumnDef<ProductRow>[]>(() => {
    function sortableHeader(label: string, key: SortKey) {
      const active = sort.key === key;
      return (
        <button
          type="button"
          className="hover:text-foreground inline-flex items-center gap-1"
          onClick={() =>
            update({ sort: key, dir: active && sort.dir === "asc" ? "desc" : "asc" }, { resetPage: true })
          }
        >
          {label}
          {active ? (
            sort.dir === "asc" ? (
              <ArrowUpIcon className="size-3.5" />
            ) : (
              <ArrowDownIcon className="size-3.5" />
            )
          ) : (
            <ChevronsUpDownIcon className="size-3.5 opacity-40" />
          )}
        </button>
      );
    }

    const cols: ColumnDef<ProductRow>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <SelectCheckbox
            label="Seleccionar todos"
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <SelectCheckbox
            label={`Seleccionar «${row.original.name}»`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        accessorKey: "code",
        header: () => sortableHeader("Código", "code"),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
      },
      {
        accessorKey: "name",
        header: () => sortableHeader("Nombre", "name"),
        cell: ({ row }) => (
          <Link
            href={`/panel/articulos/${row.original.id}/editar`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
    ];

    if (useBrands) {
      cols.push({
        accessorKey: "brandName",
        header: "Marca",
        cell: ({ row }) =>
          row.original.brandName ?? <span className="text-muted-foreground">Sin marca</span>,
      });
    }
    if (useCategories) {
      cols.push({
        accessorKey: "categoryName",
        header: "Categoría",
        cell: ({ row }) =>
          row.original.categoryName ?? (
            <span className="text-muted-foreground">Sin categoría</span>
          ),
      });
    }

    cols.push(
      {
        accessorKey: "presentation",
        header: "Presentación",
        cell: ({ row }) =>
          row.original.presentation ?? <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: "wholesalePrice",
        header: () => <div className="text-right">{sortableHeader("Mayorista", "wholesale")}</div>,
        cell: ({ row }) => (
          <PriceCell
            id={row.original.id}
            name={row.original.name}
            field="wholesale"
            value={row.original.wholesalePrice}
          />
        ),
      },
      {
        accessorKey: "retailPrice",
        header: () => <div className="text-right">Minorista</div>,
        cell: ({ row }) => (
          <PriceCell
            id={row.original.id}
            name={row.original.name}
            field="retail"
            value={row.original.retailPrice}
          />
        ),
      },
      {
        accessorKey: "isAvailable",
        header: "Estado",
        cell: ({ row }) =>
          !row.original.isActive ? (
            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Dado de baja
            </span>
          ) : row.original.isAvailable ? (
            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/40 dark:text-green-300">
              Disponible
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Sin stock
            </span>
          ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => (
          <ArticleRowActions
            id={row.original.id}
            name={row.original.name}
            isAvailable={row.original.isAvailable}
            isActive={row.original.isActive}
          />
        ),
      },
    );

    return cols;
  }, [useBrands, useCategories, sort, update]);

  // El React Compiler no puede memoizar las funciones que devuelve TanStack Table;
  // es esperado y seguro acá (paginación y orden son manuales, en el servidor).
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
  });

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const selectedCount = table.getSelectedRowModel().rows.length;

  return (
    <div className="flex flex-col gap-3">
      {selectedCount > 0 && (
        <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? "seleccionado" : "seleccionados"}
          </span>
          <Button variant="ghost" size="sm" onClick={() => table.resetRowSelection()}>
            Limpiar selección
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={cn(
                      "px-3 py-2 text-left font-medium whitespace-nowrap",
                      RIGHT_ALIGNED.has(h.column.id) && "text-right",
                    )}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-border divide-y">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-muted-foreground px-3 py-8 text-center"
                >
                  No se encontraron artículos.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-muted/30",
                    row.getIsSelected() && "bg-muted/40",
                    !row.original.isActive && "opacity-60",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-2 align-middle",
                        RIGHT_ALIGNED.has(cell.column.id) && "text-right tabular-nums",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {total === 0 ? "Sin resultados" : `${from}–${to} de ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => update({ page: page <= 2 ? null : String(page - 1) })}
          >
            Anterior
          </Button>
          <span className="text-sm">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => update({ page: String(page + 1) })}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
