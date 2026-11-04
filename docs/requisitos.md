# Requisitos

## Resumen y objetivos

Webapp donde cada proveedor de kioscos y almacenes mantiene su lista de artículos y precios, y la comparte con sus clientes para que hagan el pedido semanal desde el celular.

- Que el proveedor actualice precios en minutos, incluso aumentos masivos por marca o categoría.
- Que el kiosquero arme su pedido rápido, vea el costo estimado y lo envíe sin crear una cuenta.
- Que empezar sea fácil: el proveedor sube la planilla que ya usa, sin adaptarla. La adopción es el mayor desafío, así que cada paso tiene que pedir lo mínimo.
- Que el proveedor reciba los pedidos ordenados en un solo lugar, sin perder la costumbre de WhatsApp.

## Alcance del MVP

Entra:

- Registro y login del proveedor.
- Catálogo con categorías y marcas (opcionales), filtros y buscador; artículos por unidad y por peso.
- Precios mayorista y minorista, descuento por cliente, edición directa y aumento masivo por % con vista previa y redondeo.
- Importación (CSV y Excel) y exportación.
- Clientes con link personal.
- Flujo completo de pedidos: estados, reemplazos, pesaje, entrega, pago (pagado/pendiente), pedidos cargados por el proveedor y avisos por WhatsApp.
- Historial de pedidos y "repetir pedido".
- Grabación del historial de precios (sin pantalla todavía).

Queda para después:

- PDF de lista de precios y pedidos.
- Pantalla de historial de precios y deshacer aumentos.
- PWA (instalable).
- Imágenes de artículos.
- Planes gratuitos y pagos con límites de uso.
- IVA.

## Usuarios y roles

Plataforma multi-proveedor: 10 a 50 proveedores, cada uno con sus clientes, artículos y pedidos totalmente separados.

| Rol | Acceso | Qué hace |
| --- | --- | --- |
| Proveedor | Se registra solo con email y contraseña | Carga artículos, gestiona precios, da de alta clientes, gestiona pedidos |
| Kiosquero (cliente) | Link personal, sin cuenta | Consulta la lista, arma y envía pedidos, ve su historial |
| Administrador | Cuenta interna | Suspende proveedores y da soporte |

## Acceso del kiosquero: link personal

- El proveedor da de alta al cliente: nombre del negocio, contacto, teléfono, dirección, lista (mayorista/minorista) y descuento opcional.
- El sistema genera un link único y difícil de adivinar (`app.com/p/abc123`).
- El proveedor lo comparte con un botón "Enviar por WhatsApp".
- El proveedor puede desactivar o regenerar el link.
- El link identifica al cliente: pedidos e historial quedan en el servidor.

## Catálogo de artículos

| Campo | Obligatorio | Notas |
| --- | --- | --- |
| Código | Sí (generado si el proveedor no usa códigos) | Único por proveedor; clave para cruzar al importar |
| Nombre | Sí | |
| Marca | No | Si falta o no se usan marcas: "Sin marca" |
| Categoría | No | Si falta o no se usan categorías: "Sin categoría" |
| Presentación | No | Unidad, caja x 24, horma |
| Precio mayorista | Sí | |
| Precio minorista | No | Si está vacío se usa el mayorista |
| Disponible | Sí | "Sin stock" sin borrar |
| Imagen | No | Post-MVP |

- Filtros por categoría, marca y disponibilidad; buscador por nombre o código.
- Selección múltiple para acciones masivas: cambiar precio, marcar sin stock, cambiar categoría.
- El proveedor elige si usa marcas y categorías; si no, no aparecen en formularios, filtros ni en la vista del cliente.

## Precios

- **Edición individual** directamente en la lista.
- **Aumento por porcentaje** sobre seleccionados o filtrados (por marca o categoría); también rebaja.
- **Precio a aplicar**: mayorista, minorista o ambos.
- **Redondeo opcional**: al $10, $50 o $100.
- **Vista previa** con precio actual, nuevo y diferencia antes de confirmar.
- **Deshacer** el último cambio masivo (post-MVP, pero el modelo lo soporta).
- **Historial de precios** grabado desde el día 1.
- **Aviso al kiosquero** si los precios cambiaron desde su último pedido.
- Cada cliente tiene una lista (mayorista/minorista) y un descuento % opcional.

## Importación y exportación

- **Importar**: CSV y Excel (.xlsx), con plantilla descargable opcional. Se cruza por código: actualiza existentes y crea nuevos.
- **Planilla propia del proveedor**: indica qué columna es cada dato; el sistema recuerda el mapeo.
- **Datos mínimos**: nombre y precio mayorista, más código si el proveedor usa códigos propios.
- **Sin códigos propios**: la primera importación genera códigos. Para actualizar: exportar, editar y volver a subir.
- **Planilla sin columna de código**: cruce por nombre + presentación, con confirmación en la vista previa.
- **Comparación tolerante**: ignora espacios sobrantes y mayúsculas.
- **Códigos duplicados en la planilla**: error en la vista previa, no se importan.
- **Ceros a la izquierda**: el código es texto; al exportar a Excel va con formato texto; al importar se avisa si parecen haberse perdido.
- **Modo de importación**: *Agregar y actualizar* (default), *Solo agregar nuevos*, *Solo actualizar precios*.
- **Celdas vacías** no borran datos existentes.
- **Posibles duplicados**: mismo nombre y presentación con distinto código → el proveedor elige "es el mismo" (se vincula y se reemplaza el código generado) o "es otro".
- **Artículos que no están en la planilla**: dejarlos, marcarlos sin stock o darlos de baja (elige el proveedor).
- **Marcas y categorías nuevas** se crean solas.
- **Historial**: los cambios de precio de una importación se registran como una operación.
- **Resumen previo**: cuántos se crean, actualizan y qué filas tienen errores.
- **Exportar**: lista completa o filtrada, CSV y Excel.

## Armado del pedido (kiosquero)

- Lista agrupada por categoría, con buscador y filtros.
- Botones grandes de + y −, y opción de escribir la cantidad.
- Precios de su lista con su descuento aplicado.
- Artículos sin stock visibles pero no seleccionables.
- Barra fija con cantidad de artículos y total estimado.
- **Repetir pedido** anterior como base.
- Revisar carrito antes de enviar; campo de observaciones.
- El borrador se guarda en el servidor.
- Aclaración de que el total es estimado.

## Venta por peso

- Precio por unidad o por kilo.
- Artículos por kilo se piden por pieza ("2 hormas") o por kilos ("1,5 kg").
- Peso promedio de la pieza para estimar.
- El proveedor carga el peso real al preparar y se recalcula el total final.
- Botón para avisar el total final por WhatsApp.

## Pedidos (resumen)

Detalle de estados y reglas en `reglas-de-negocio.md`.

- Envío del cliente: se guarda el pedido y se abre WhatsApp con el mensaje armado.
- Panel del proveedor: lista filtrable por estado, cliente, fecha y pago; pedidos sin respuesta destacados; impresión/exportación; vista consolidada de artículos de pedidos aceptados.
- El proveedor puede cargar pedidos a nombre de un cliente.
- Historial: el kiosquero ve sus últimos pedidos (cantidad a definir); el servidor guarda todos.

## Requisitos no funcionales

- Vista del kiosquero pensada para celular; panel usable en PC y celular.
- Rápido con datos móviles, incluso con 1.000+ artículos.
- Aislamiento total entre proveedores.
- Links con tokens largos y aleatorios, desactivables; páginas sin indexar; límite de intentos.
- Escala inicial: 10–50 proveedores, ~50 clientes y ~1.000 artículos cada uno.
- Formato local: pesos argentinos, coma decimal, fechas dd/mm/aaaa.
- Backups automáticos de la base.
- Recuperación de contraseña por email.

## Temas abiertos

- [ ] Modelo de presentaciones (¿una por artículo o varias con distinto precio? ¿mínimos o caja cerrada?).
- [ ] Reglas de pedido: monto mínimo, días de entrega por zona, horario límite.
- [ ] Uso real de las dos listas (mayorista/minorista).
- [ ] Precio al público sugerido o margen para el kiosquero.
- [ ] Modelo de negocio: planes gratuitos y pagos con límites de uso.
- [ ] IVA (por ahora los precios se toman como finales).
- [ ] Términos de uso y política de privacidad (Ley 25.326), antes del piloto.
- [ ] Plazo para destacar pedidos sin respuesta.
- [ ] Nombre del proyecto y dominio.
- [ ] Tamaño real de las listas.
- [ ] Cantidad de pedidos visibles en el historial del kiosquero.

## Fuera de alcance (v1)

- Pagos en línea y facturación electrónica.
- Control de stock con cantidades.
- API de WhatsApp Business (la v1 usa links `wa.me`).
- Ruteo de entregas y repartidores.
- App nativa.
- Campos personalizados por proveedor (tabla `custom_fields` + `jsonb` en `products`, con visibilidad interna o para el cliente).
- Dashboards de ventas (agregaciones sobre `orders`, `order_items` y `order_events`).
