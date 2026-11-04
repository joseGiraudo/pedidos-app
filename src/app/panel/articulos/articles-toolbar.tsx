"use client";

import { SearchIcon } from "lucide-react";
import { useRef } from "react";

import { Input } from "@/components/ui/input";

import { useUrlParams } from "./use-url-params";

type Option = { id: string; name: string };

type ArticlesToolbarProps = {
  defaults: { q: string; cat: string; brand: string; avail: string };
  categories: Option[];
  brands: Option[];
  useBrands: boolean;
  useCategories: boolean;
};

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:ring-3 dark:bg-input/30";

export function ArticlesToolbar({
  defaults,
  categories,
  brands,
  useBrands,
  useCategories,
}: ArticlesToolbarProps) {
  const update = useUrlParams();
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative flex-1 basis-60"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: searchRef.current?.value.trim() ?? "" }, { resetPage: true });
        }}
      >
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          ref={searchRef}
          type="search"
          defaultValue={defaults.q}
          placeholder="Buscar por nombre o código"
          className="pl-8"
          aria-label="Buscar artículos"
        />
      </form>

      {useCategories && (
        <select
          className={selectClass}
          value={defaults.cat}
          aria-label="Filtrar por categoría"
          onChange={(e) => update({ cat: e.target.value }, { resetPage: true })}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="none">Sin categoría</option>
        </select>
      )}

      {useBrands && (
        <select
          className={selectClass}
          value={defaults.brand}
          aria-label="Filtrar por marca"
          onChange={(e) => update({ brand: e.target.value }, { resetPage: true })}
        >
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          <option value="none">Sin marca</option>
        </select>
      )}

      <select
        className={selectClass}
        value={defaults.avail}
        aria-label="Filtrar por disponibilidad"
        onChange={(e) => update({ avail: e.target.value === "all" ? "" : e.target.value }, { resetPage: true })}
      >
        <option value="all">Disponibilidad: todas</option>
        <option value="yes">Disponibles</option>
        <option value="no">Sin stock</option>
      </select>
    </div>
  );
}
