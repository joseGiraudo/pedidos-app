"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { cn } from "cn";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

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
        cell: ({ row }) => formatMoney(row.original.wholesalePrice),
      },
      {
        accessorKey: "retailPrice",
        header: "Minorista",
        cell: ({ row }) =>
          row.original.retailPrice ? (
            formatMoney(row.original.retailPrice)
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "isAvailable",
        header: "Estado",
        cell: ({ row }) =>
          row.original.isAvailable ? (
            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/40 dark:text-green-300">
              Disponible
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Sin stock
            </span>
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
  });

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3">
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
                <tr key={row.id} className="hover:bg-muted/30">
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
