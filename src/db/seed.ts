import { randomBytes } from "node:crypto";

import { config } from "dotenv";

import { withTenant, type Tenant } from "../lib/tenant";
import * as schema from "./schema";

// Carga .env.local (Next lo hace solo; este script no corre bajo Next) ANTES de
// importar ./index, que lee DATABASE_URL al construir el pool.
config({ path: ".env.local" });
config();

// ---------------------------------------------------------------------------
// Helpers de formato (dinero y cantidades van como string numeric, nunca float)
// ---------------------------------------------------------------------------
const money = (pesos: number): string => pesos.toFixed(2);
const weight = (kg: number): string => kg.toFixed(3);
const token = (): string => randomBytes(24).toString("base64url"); // 32 caracteres

// ---------------------------------------------------------------------------
// Catálogo artesanal (kiosco/almacén argentino)
// ---------------------------------------------------------------------------
const categories = [
  "Golosinas",
  "Chocolates",
  "Galletitas",
  "Alfajores",
  "Bebidas",
  "Aguas y gaseosas",
  "Lácteos",
  "Fiambres y quesos",
  "Almacén",
  "Limpieza",
];

const brands = [
  "Arcor",
  "Bagley",
  "Terrabusi",
  "Georgalos",
  "Felfort",
  "Billiken",
  "Cadbury",
  "Lheritier",
  "Havanna",
  "Coca-Cola",
  "Pepsi",
  "Quilmes",
  "Villa del Sur",
  "Villavicencio",
  "La Serenísima",
  "Sancor",
  "Ilolay",
  "Marolio",
  "La Campagnola",
  "Knorr",
  "Ala",
  "Magistral",
];

type CategorySpec = {
  category: string;
  codePrefix: string;
  bases: string[];
  variants: string[];
  /** true si la variante es una presentación (500ml, 100g…) y no un sabor. */
  variantIsSize: boolean;
  /** pool de marcas; null = "Sin marca". */
  brands: (string | null)[];
  priceBase: number;
  priceStep: number;
  byWeight?: boolean;
};

const catalog: CategorySpec[] = [
  {
    category: "Golosinas",
    codePrefix: "GOL",
    bases: [
      "Caramelos masticables",
      "Chupetín",
      "Gomitas",
      "Chicles globo",
      "Pastillas",
      "Caramelos ácidos",
    ],
    variants: ["frutilla", "menta", "frutos rojos", "naranja", "ananá"],
    variantIsSize: false,
    brands: ["Arcor", "Georgalos", "Billiken", null],
    priceBase: 300,
    priceStep: 45,
  },
  {
    category: "Chocolates",
    codePrefix: "CHO",
    bases: [
      "Tableta chocolate con leche",
      "Tableta chocolate amargo",
      "Bombón",
      "Chocolate con maní",
      "Barra de chocolate",
    ],
    variants: ["25g", "50g", "100g", "150g"],
    variantIsSize: true,
    brands: ["Arcor", "Felfort", "Cadbury", "Georgalos"],
    priceBase: 650,
    priceStep: 180,
  },
  {
    category: "Galletitas",
    codePrefix: "GAL",
    bases: [
      "Galletitas dulces",
      "Galletitas de agua",
      "Galletitas rellenas",
      "Bizcochos",
      "Obleas",
    ],
    variants: ["vainilla", "chocolate", "limón", "clásicas", "coco"],
    variantIsSize: false,
    brands: ["Bagley", "Terrabusi", "Arcor"],
    priceBase: 500,
    priceStep: 90,
  },
  {
    category: "Alfajores",
    codePrefix: "ALF",
    bases: ["Alfajor simple", "Alfajor triple", "Alfajor de maicena", "Alfajor premium"],
    variants: ["chocolate", "dulce de leche", "fruta", "blanco"],
    variantIsSize: false,
    brands: ["Arcor", "Georgalos", "Havanna", "Felfort", "Lheritier"],
    priceBase: 700,
    priceStep: 150,
  },
  {
    category: "Bebidas",
    codePrefix: "BEB",
    bases: ["Jugo en polvo", "Jugo exprimido", "Bebida isotónica", "Energizante", "Té frío"],
    variants: ["naranja", "manzana", "pomelo", "multifruta", "uva"],
    variantIsSize: false,
    brands: ["Coca-Cola", "Pepsi", "Arcor", null],
    priceBase: 450,
    priceStep: 120,
  },
  {
    category: "Aguas y gaseosas",
    codePrefix: "AGU",
    bases: ["Gaseosa cola", "Gaseosa lima-limón", "Agua mineral", "Agua saborizada", "Soda"],
    variants: ["500ml", "1L", "1.5L", "2.25L"],
    variantIsSize: true,
    brands: ["Coca-Cola", "Pepsi", "Quilmes", "Villa del Sur", "Villavicencio"],
    priceBase: 800,
    priceStep: 260,
  },
  {
    category: "Lácteos",
    codePrefix: "LAC",
    bases: [
      "Leche entera",
      "Leche descremada",
      "Yogur bebible",
      "Yogur firme",
      "Postre",
      "Manteca",
      "Crema",
    ],
    variants: ["sachet", "botella", "pote"],
    variantIsSize: true,
    brands: ["La Serenísima", "Sancor", "Ilolay"],
    priceBase: 900,
    priceStep: 140,
  },
  {
    category: "Fiambres y quesos",
    codePrefix: "FIA",
    bases: [
      "Queso cremoso",
      "Queso pategrás",
      "Queso sardo",
      "Jamón cocido",
      "Jamón crudo",
      "Salame",
      "Mortadela",
      "Bondiola",
    ],
    variants: ["horma", "feteado"],
    variantIsSize: true,
    brands: ["La Serenísima", "Sancor", null, "Marolio"],
    priceBase: 6500,
    priceStep: 900,
    byWeight: true,
  },
  {
    category: "Almacén",
    codePrefix: "ALM",
    bases: [
      "Fideos",
      "Arroz",
      "Harina",
      "Azúcar",
      "Yerba mate",
      "Aceite",
      "Puré de tomate",
      "Arvejas",
    ],
    variants: ["500g", "1kg"],
    variantIsSize: true,
    brands: ["Marolio", "La Campagnola", "Knorr", "Arcor", null],
    priceBase: 1100,
    priceStep: 300,
  },
  {
    category: "Limpieza",
    codePrefix: "LIM",
    bases: [
      "Lavandina",
      "Detergente",
      "Jabón en polvo",
      "Esponja",
      "Papel higiénico",
      "Rollo de cocina",
    ],
    variants: ["1L", "500ml"],
    variantIsSize: true,
    brands: ["Ala", "Magistral", "Marolio", null],
    priceBase: 950,
    priceStep: 220,
  },
];

const customers = [
  {
    businessName: "Kiosco Don Pepe",
    contactName: "José Pérez",
    priceList: "wholesale" as const,
    discountPct: "0",
    isActive: true,
  },
  {
    businessName: "Maxikiosco La Esquina",
    contactName: "Marta Gómez",
    priceList: "wholesale" as const,
    discountPct: "5",
    isActive: true,
  },
  {
    businessName: "Almacén Doña Rosa",
    contactName: "Rosa Díaz",
    priceList: "retail" as const,
    discountPct: "0",
    isActive: true,
  },
  {
    businessName: "Kiosco 24hs Centro",
    contactName: "Luis Romero",
    priceList: "wholesale" as const,
    discountPct: "10",
    isActive: true,
  },
  {
    businessName: "Drugstore Belgrano",
    contactName: "Ana Suárez",
    priceList: "retail" as const,
    discountPct: "3",
    isActive: true,
  },
  {
    businessName: "Kiosco El Trébol",
    contactName: "Carlos Ruiz",
    priceList: "wholesale" as const,
    discountPct: "0",
    isActive: false,
  },
  {
    businessName: "Fiambrería San Cayetano",
    contactName: "Nora Luna",
    priceList: "retail" as const,
    discountPct: "0",
    isActive: true,
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function main() {
  const { db } = await import("./index");

  const counts = await db.transaction(async (tx) => {
    // Reset: borrar tablas de negocio en orden hijo → padre (respeta FKs).
    await tx.delete(schema.orderEvents);
    await tx.delete(schema.orderItems);
    await tx.delete(schema.orders);
    await tx.delete(schema.priceChanges);
    await tx.delete(schema.priceUpdateBatches);
    await tx.delete(schema.products);
    await tx.delete(schema.customers);
    await tx.delete(schema.categories);
    await tx.delete(schema.brands);
    await tx.delete(schema.suppliers);

    // Proveedor
    const [supplier] = await tx
      .insert(schema.suppliers)
      .values({
        name: "Distribuidora La Veloz",
        whatsappPhone: "5493510000000",
        useBrands: true,
        useCategories: true,
        usesOwnCodes: true,
      })
      .returning();
    const tenant: Tenant = { supplierId: supplier.id };

    // Categorías
    const categoryRows = await tx
      .insert(schema.categories)
      .values(categories.map((name, i) => withTenant({ name, sortOrder: i + 1 }, tenant)))
      .returning();
    const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));

    // Marcas
    const brandRows = await tx
      .insert(schema.brands)
      .values(brands.map((name) => withTenant({ name }, tenant)))
      .returning();
    const brandIdByName = new Map(brandRows.map((b) => [b.name, b.id]));

    // Productos (~200): combinación categoría × base × variante
    const productValues: (typeof schema.products.$inferInsert)[] = [];
    let globalIndex = 0;
    for (const spec of catalog) {
      const categoryId = categoryIdByName.get(spec.category) ?? null;
      let catIndex = 0;
      for (const base of spec.bases) {
        for (const variant of spec.variants) {
          const name = `${base} ${variant}`;
          const brandName = spec.brands[catIndex % spec.brands.length];
          const brandId = brandName ? (brandIdByName.get(brandName) ?? null) : null;
          const wholesale = spec.priceBase + (catIndex % 7) * spec.priceStep;
          const hasRetail = globalIndex % 2 === 0;
          const isAvailable = globalIndex % 17 !== 0;
          const presentation = spec.variantIsSize ? variant : undefined;

          // Venta por peso (fiambres): horma se pide por pieza; feteado por kilo.
          const byWeightHorma = spec.byWeight && variant === "horma";
          const byWeightFeteado = spec.byWeight && variant === "feteado";

          productValues.push(
            withTenant(
              {
                code: `${spec.codePrefix}-${String(catIndex + 1).padStart(3, "0")}`,
                name,
                categoryId,
                brandId,
                presentation,
                pricingUnit: spec.byWeight ? ("kg" as const) : ("unit" as const),
                orderMode: byWeightHorma
                  ? ("piece" as const)
                  : byWeightFeteado
                    ? ("kg" as const)
                    : ("unit" as const),
                avgPieceWeightKg: byWeightHorma ? weight(3.5 + (catIndex % 4) * 0.4) : null,
                wholesalePrice: money(wholesale),
                retailPrice: hasRetail ? money(Math.round(wholesale * 1.25)) : null,
                isAvailable,
              },
              tenant,
            ),
          );
          catIndex++;
          globalIndex++;
        }
      }
    }
    const productRows = await tx
      .insert(schema.products)
      .values(productValues)
      .returning({ id: schema.products.id });

    // El proveedor usa códigos propios; dejamos el contador de generados listo igual.
    await tx.update(schema.suppliers).set({ nextProductCode: productRows.length + 1 });

    // Clientes
    const customerRows = await tx
      .insert(schema.customers)
      .values(
        customers.map((c) =>
          withTenant(
            {
              businessName: c.businessName,
              contactName: c.contactName,
              priceList: c.priceList,
              discountPct: c.discountPct,
              isActive: c.isActive,
              accessToken: token(),
            },
            tenant,
          ),
        ),
      )
      .returning({ id: schema.customers.id });

    return {
      suppliers: 1,
      categories: categoryRows.length,
      brands: brandRows.length,
      products: productRows.length,
      customers: customerRows.length,
    };
  });

  console.log("Seed completado:");
  console.table(counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed falló:", err);
    process.exit(1);
  });
