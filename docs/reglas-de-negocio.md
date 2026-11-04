# Reglas de negocio

## Estados del pedido

```
Borrador ──enviar──▶ Enviado ──aceptar──▶ Aceptado ──entregar──▶ Entregado
                       │  ▲
          pedir cambio │  │ cliente corrige y reenvía
                       ▼  │
              Modificación solicitada

Enviado ──rechazar──▶ Rechazado (fin)
Cualquier estado antes de Entregado ──cancelar──▶ Cancelado (fin)
```

| Estado | Quién actúa | Qué pasa |
| --- | --- | --- |
| Borrador (`draft`) | Cliente | Arma el pedido; se guarda en el servidor con precios vigentes. Un solo borrador por cliente. |
| Enviado (`sent`) | Cliente | Se congelan los precios y se abre WhatsApp. El cliente puede editarlo o cancelarlo mientras el proveedor no actúe. |
| Modificación solicitada (`changes_requested`) | Proveedor | Marca artículos que no tiene y deja una nota; el cliente corrige y reenvía. |
| Aceptado (`accepted`) | Proveedor | Fecha estimada de entrega, descuento extra opcional, nota. Carga pesos reales → total final. |
| Entregado (`delivered`) | Proveedor | Fecha real, ajuste de cantidades, forma de pago, estado de pago (pagado/pendiente). |
| Rechazado (`rejected`) | Proveedor | Motivo obligatorio. Fin. |
| Cancelado (`cancelled`) | Cliente hasta Enviado; proveedor antes de Entregado | Queda quién y por qué. Fin. |

Cada transición y cada modificación se registran en `order_events`.

## Cambios del proveedor

- Puede reemplazar artículos o cambiar cantidades y aceptar en el mismo paso, sin confirmación del cliente; se avisa por WhatsApp.
- El artículo de reemplazo toma su precio vigente; queda registrado el original.
- Puede cargar un pedido a nombre de un cliente; se crea como Enviado o Aceptado con `created_by = supplier`.

## Quién edita

- Cliente: en Borrador, y en Enviado mientras el proveedor no actúe.
- Proveedor: en Enviado, Modificación solicitada y Aceptado.
- Ediciones simultáneas: al guardar se verifica `version`/estado; si cambió, se rechaza y se pide recargar.

## Precios y cálculo

- El borrador muestra precios vigentes; al enviar se congelan en `order_items.unit_price`.
- Orden: precio de la lista del cliente → descuento del cliente → descuento extra del pedido → total.
- El redondeo solo se aplica al actualizar la lista de precios, nunca sobre descuentos.
- Si `retail_price` está vacío, se usa `wholesale_price`.
- Totales recalculados en el servidor al guardar.
- Por peso: estimado = piezas × peso promedio × precio/kg; final = peso real × precio/kg.
- Sin IVA por ahora: los precios son finales.

## Otras reglas

- Artículo sin stock o dado de baja en un borrador: se avisa y no se puede enviar con ese artículo.
- Link desactivado: "Este link ya no está activo, contactá a tu proveedor", sin lista ni pedidos.
- Pedidos enviados sin respuesta por varios días: destacados en el panel (plazo a definir).

## Avisos por WhatsApp

- Envío del cliente: link `wa.me` al número del proveedor con el pedido.
- Botón del proveedor para avisar al cliente en: modificación pedida, aceptado (con fecha), rechazado, total final tras pesar.
- Si WhatsApp no se abre, el pedido igual está guardado.

### Plantilla del mensaje de pedido

```
*Pedido #45 – Kiosco Don Pepe*
31/10/2026

• 2 × Alfajor triple chocolate (caja x 24) — $25.000
• 1 × Queso cremoso (horma, ~4,2 kg) — est. $33.600

Total estimado: $58.600
Notas: si no hay cremoso, mandar mozzarella

Ver pedido: app.com/p/abc123/pedidos/45
```

## Formato de planilla (CSV / Excel)

CSV: separador `;`, UTF-8 con BOM, primera fila con encabezados, decimales con coma. Las planillas propias se mapean columna por columna al importar.

| Columna | Obligatoria | Ejemplo |
| --- | --- | --- |
| codigo | Sí, si el proveedor usa códigos propios | ALF-024 |
| nombre | Sí | Alfajor triple chocolate |
| marca | No | Marca X |
| categoria | No | Golosinas |
| presentacion | No | Caja x 24 |
| tipo_precio | No (default `unidad`) | `unidad` / `kg` |
| forma_pedido | No (default `unidad`) | `unidad` / `pieza` / `kg` |
| peso_promedio_kg | No | 4,2 |
| precio_mayorista | Sí | 12500,00 |
| precio_minorista | No | 13800,00 |
| disponible | No (default `si`) | `si` / `no` |

Reglas de importación: ver `requisitos.md` → "Importación y exportación".
