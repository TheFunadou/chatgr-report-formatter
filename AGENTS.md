# AGENTS.md — Aplicación de reportes CSV offline

## 1. Propósito

Construir una aplicación de escritorio offline, sin servidor, que permita importar uno o varios CSV exportados desde un CRM, analizarlos y generar reportes Excel listos para utilizar. El objetivo es eliminar limpieza manual, fórmulas repetitivas y creación manual de tablas y gráficos. Todo el procesamiento, persistencia y generación de archivos ocurre localmente.

## 2. Stack tecnológico

- **Tauri v2** como contenedor de escritorio y sistema de compilación para los entornos de escritorio objetivo.
- **Rust** para comandos locales, sistema de archivos, procesamiento CSV, SQLite y generación XLSX.
- **React + TypeScript + Vite** para la interfaz; **pnpm** como gestor de paquetes.
- **Tailwind CSS + shadcn/ui** para estilos y componentes.
- **lucide-react** como biblioteca única de iconos.
- **rusqlite** con `bundled` para SQLite embebido.
- **csv**, **serde/serde_json**, **chrono**, **rust_xlsxwriter**, **thiserror/anyhow** y opcionalmente **sha2**.

### Convenciones de idioma y localización

- **Programación:** Todo el código fuente, identificadores, modelos de dominio, esquemas y tablas de base de datos, APIs de comandos Tauri, componentes React, pruebas unitarias y de integración, commits y comentarios técnicos se escriben en **inglés**.
- **Interfaz de usuario (UI) y reportes:** Toda la interacción visual, textos de botones, formularios, etiquetas, diálogos modales, estados de carga, mensajes de error accionables, asistente inicial de configuración y nombres de hojas/encabezados en los libros de Excel generados se presentan en **español de México (`es-MX`)**.

### Pruebas automatizadas

- Rust: `cargo test` para dominio, CSV, SQLite y generación XLSX.
- Frontend: **Vitest + React Testing Library** para componentes, interacciones y estados.
- Usar **tempfile** en pruebas Rust para CSV, SQLite y XLSX temporales.
- Mockear los comandos Tauri en `src/lib/tauri.ts`; los tests de UI no deben requerir runtime Tauri real.
- Verificaciones: `cargo fmt --check`, `cargo clippy`, `cargo test`, `pnpm test` y `pnpm build`.

No introducir Python, Node como backend, servicios HTTP, APIs remotas ni bases de datos externas. Rust es la capa local de operaciones, no un backend de red.

## 3. Arquitectura

Separar en cuatro capas:

1. **UI (React):** presentación, navegación, formularios, estados de carga y mensajes.
2. **Aplicación (comandos Tauri):** validación y coordinación de casos de uso.
3. **Dominio:** modelos, limpieza, normalización, agrupaciones y métricas.
4. **Infraestructura:** CSV, sistema de archivos, SQLite y escritura XLSX.

La UI no implementa cálculos comerciales ni accede directamente a rutas arbitrarias. Los comandos delegan en servicios de dominio. Evitar bloquear el hilo principal; comunicar progreso durante operaciones largas. Mantener los servicios independientes de la UI para probarlos aisladamente.

## 4. Flujo principal del usuario

### Primer lanzamiento: Asistente de configuración inicial (Onboarding por pasos)

Al abrir la aplicación por primera vez (o mientras no se haya completado la configuración inicial), la aplicación presenta un asistente interactivo en formato de **pasos progresivos (steps)**:

1. **Paso 1 — Carpeta de exportación:** Solicita al usuario definir la carpeta predeterminada de salida. Sugiere una ruta válida del sistema (por ejemplo, la carpeta de Documentos del usuario) y permite seleccionarla o cambiarla mediante el diálogo nativo de carpetas.
2. **Paso 2 — Estatus comerciales:** Muestra la lista de estatus predeterminados (`nuevo`, `contactado`, `cotizado`, `compra`, `en seguimiento`, `sin respuesta`, `en espera`, `sin estatus`), con sus colores sugeridos y la casilla de verificación para indicar cuál o cuáles representan venta/conversión (por defecto, `compra`). El usuario es libre de agregar nuevos estatus, editar los existentes o remover los que no utilice.
3. **Paso 3 — Niveles de prioridad:** Muestra las prioridades predeterminadas (`baja`, `media`, `alta`, `urgente`, `nula`) con sus colores asignados. El usuario puede agregar nuevas prioridades, editar etiquetas y colores, o remover elementos.
4. **Paso 4 — Plataformas de origen:** Muestra los orígenes predeterminados (`whatsapp`, `facebook`, `instagram`, `web`, `orgánico`) con sus colores asignados. El usuario puede agregar nuevos orígenes, editar o remover elementos.
5. **Paso 5 — Medios de captación:** Muestra los medios predeterminados (`orgánico`, `campaña`, `referido`, `prospección`) con sus colores asignados. El usuario puede agregar nuevos medios, editar o remover elementos.
6. **Paso 6 — Confirmación y bienvenida:** Permite revisar un resumen de las preferencias configuradas, persiste los valores en SQLite, marca el asistente como completado y redirige al usuario a la pantalla de Inicio.

### Flujo regular de trabajo

Una vez completada la configuración inicial:

1. El usuario abre la aplicación y entra directamente a la pantalla de Inicio.
2. Ve la pantalla inicial con zona de importación, selector de modo de operación (Individual por defecto o Múltiple) y la carpeta de exportación activa visible.
3. Arrastra uno o varios CSV desde el escritorio o pulsa el botón para seleccionarlos mediante el diálogo nativo.
4. Elige modo **Individual** (predeterminado) o **Múltiple**.
5. La app valida los archivos y muestra una vista previa o resumen de la selección.
6. El usuario configura limpieza si lo necesita y escribe el nombre del archivo de salida en un campo de texto separado de la ruta.
7. Pulsa Procesar/Exportar.
8. La app muestra loading, etapa actual y progreso sin congelar la interfaz.
9. Se genera el XLSX en la carpeta de exportación configurada utilizando las dimensiones y colores personalizados por el usuario.
10. Se muestra el resultado, la ruta y acciones para abrir el archivo o su carpeta contenedora.

No procesar ni exportar antes de una acción explícita. En modo múltiple, informar resultados exitosos y fallidos individualmente.

## 5. Diseño de interfaz: sidebar + contenido

La estructura principal debe ser una **sidebar** lateral y un área de **contenido**.

### Sidebar

Navegación compacta con iconos `lucide-react`:
- **Inicio:** importar y procesar CSV.
- **Archivos:** biblioteca de fuentes recientes.
- **Configuración:** carpeta de exportación predeterminada y personalización de dimensiones comerciales.

Mostrar sección activa y permitir colapsar la sidebar en ventanas estrechas.

### Inicio

Priorizar:
- Zona de drag-and-drop CSV.
- Botón para seleccionar archivos mediante diálogo nativo.
- Selector Individual/Múltiple.
- Carpeta de exportación actual, visible claramente desde el primer inicio.
- Campo para nombre del XLSX, separado de la ruta.
- Lista de archivos seleccionados y acción para quitarlos.
- Botón principal Procesar/Exportar.

Usar textos claros, jerarquía visual simple y estados vacíos/loading/error/success. Evitar dashboard complejo, gráficos interactivos redundantes, animaciones innecesarias y autenticación.

### Configuración

Apartado dedicado a la gestión y mantenimiento de preferencias del usuario:
- **Ruta de exportación predeterminada:**
  - Visualizar la ruta activa actual.
  - Botón para cambiar la carpeta mediante diálogo nativo de selección de directorio.
- **Personalización de dimensiones (`estatus`, `prioridad`, `origen`, `medio`):**
  - Navegación por pestañas o secciones para cada dimensión.
  - Tabla/lista de categorías activas con muestra visual de color, etiqueta y acciones.
  - **Agregar nueva categoría:** Campo para ingresar el nombre/etiqueta, selector de color hex y, para `estatus`, casilla para indicar si representa venta/conversión.
  - **Editar categoría:** Modificar etiqueta, color asignado o marca de conversión.
  - **Remover categoría:** Eliminar elementos con confirmación para mantener la lista limpia según el CRM del usuario.
  - **Restablecer valores predeterminados:** Botón para restaurar la lista y colores de fábrica de la dimensión seleccionada o de todas las dimensiones, previa confirmación.

### Iconografía

Usar `lucide-react` para todos los iconos de UI. No usar emojis como iconos, caracteres Unicode decorativos ni mezclar bibliotecas. Mantener tamaños y grosores consistentes.

## 6. Importación y modos de operación

### Drag-and-drop y selector

- Aceptar archivos `.csv` mediante capacidades compatibles de Tauri v2.
- Mostrar estado visual al arrastrar sobre la zona.
- Validar extensión, existencia, permisos y legibilidad.
- Mostrar errores accionables para archivos no compatibles.
- Mantener siempre un botón de selección nativa como alternativa.

### Individual (predeterminado)

- Procesar exactamente un CSV por operación.
- Si se seleccionan varios, pedir elegir uno o cambiar a Múltiple; nunca procesarlos silenciosamente.
- Generar un XLSX para ese CSV.

### Múltiple

- Permitir seleccionar dos o más CSV y retirar elementos antes de procesar.
- En el MVP, generar **un XLSX independiente por cada CSV**. No combinar archivos con estructuras potencialmente distintas.
- Aplicar reglas comunes solo si las columnas y condiciones son compatibles; advertir si una regla no aplica a algún archivo.
- Mostrar progreso global y estado por archivo.
- Gestionar fallos parciales sin descartar los resultados exitosos.
- Un nombre base indicado por el usuario debe recibir sufijos distintivos por archivo para evitar colisiones.

## 7. Carpeta y nombre de exportación

### Carpeta

- La carpeta de exportación debe estar configurada desde el primer inicio (solicitada durante el asistente por pasos) y ser visible en Inicio.
- En el primer inicio, proponer un destino predeterminado mediante APIs de rutas de Tauri (por ejemplo, una carpeta de documentos o una carpeta de salida de la aplicación).
- Permitir cambiarla en cualquier momento desde **Configuración** mediante diálogo nativo de selección de directorio; no pedir escribir la ruta manualmente.
- Persistir la preferencia localmente en SQLite.
- Validar existencia y permisos de escritura antes de exportar. Si falla, solicitar otra carpeta.

### Nombre

- Incluir un campo UI para el nombre del XLSX, separado de la carpeta/ruta.
- Proponer un nombre derivado del CSV, por ejemplo `reporte_clientes_2026-11-23`.
- Normalizar caracteres no permitidos y rechazar nombres vacíos.
- Añadir `.xlsx` automáticamente si falta.
- Nunca sobrescribir silenciosamente: solicitar confirmación o proponer un nombre alternativo.
- En modo múltiple, derivar un nombre por CSV y agregar sufijo distintivo si el usuario proporcionó un nombre base.

## 8. Persistencia local, SQLite y biblioteca de archivos

SQLite conserva metadatos de archivos fuente, configuraciones globales y catálogo de categorías personalizadas, nunca el CSV completo. Guardar la base de datos en el directorio de datos de Tauri y usar migraciones.

### Esquema sugerido

```sql
-- Preferencias generales de la aplicación
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Dimensiones comerciales personalizables (status, priority, source, medium)
CREATE TABLE dimension_categories (
    id TEXT PRIMARY KEY,
    dimension TEXT NOT NULL,                  -- 'status', 'priority', 'source', 'medium'
    match_value TEXT NOT NULL,               -- Texto normalizado para comparación: 'compra', 'whatsapp'
    display_name TEXT NOT NULL,              -- Etiqueta para UI y reportes: 'Compra', 'WhatsApp'
    color_hex TEXT NOT NULL,                 -- Color de etiqueta/celda: '#22C55E'
    is_conversion INTEGER NOT NULL DEFAULT 0, -- 1 si cuenta como venta/conversión (en status)
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_system_default INTEGER NOT NULL DEFAULT 0,
    UNIQUE(dimension, match_value)
);

-- Catálogo de archivos fuente
CREATE TABLE source_files (
    id TEXT PRIMARY KEY,
    source_route TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    alias TEXT,
    added_at TEXT NOT NULL,
    last_seen_at TEXT,
    file_size INTEGER,
    modified_at TEXT,
    content_hash TEXT
);
```

`content_hash` nullable y bajo demanda; no calcular hashes grandes en cada inicio.

### Funciones de la biblioteca de fuentes

La biblioteca es opcional: el usuario puede importar, procesar y exportar sin registrar permanentemente la fuente.
- Listar por fecha descendente y filtrar por alias/nombre.
- Registrar ruta absoluta y metadatos cuando el usuario lo solicite.
- Editar alias.
- Eliminar referencia sin borrar el CSV.
- Revincular un archivo desde su nueva ubicación.
- Comprobar disponibilidad al abrir la biblioteca o procesar.

No prometer detección automática universal de movimientos. Si la ruta no existe, mostrar **Archivo no encontrado** y ofrecer **Localizar archivo**. Una búsqueda asistida puede usar nombre, tamaño y huella, pero nunca actualizar silenciosamente una coincidencia ambigua. No eliminar referencias automáticamente por inaccesibilidad.

## 9. Procesamiento CSV

- Detectar o permitir elegir coma, punto y coma o tabulador.
- Manejar UTF-8 y reportar errores de codificación.
- Mostrar encabezados y vista previa limitada/paginada.
- Normalizar nombres de columnas para análisis sin cambiar encabezados originales en RAW.
- Reconocer vacíos, espacios y variaciones de escritura.
- Interpretar fechas explícitamente y advertir valores inválidos.
- Tratar identificadores y teléfonos como texto para conservar ceros iniciales.
- No asumir que una fila equivale a una venta ni que `Compra` equivale a unidades vendidas.
- No inventar valores, fechas, importes, cantidades ni estados.
- Conservar advertencias del procesamiento.

## 10. Diccionario de columnas y composición de reportes

El CSV de CRM puede contener, entre otras, las siguientes columnas. La aplicación debe reconocerlas sin depender de mayúsculas/minúsculas ni de espacios accidentales en encabezados o valores. La normalización se utiliza para analizar; la hoja **Datos RAW** conserva los encabezados y valores originales.

### Columnas de identificación y contacto

| Columna | Significado | Tratamiento |
|---|---|---|
| `nombre` | Nombre del cliente | Texto. Puede utilizarse para mostrar el registro y, junto con otros campos, facilitar la revisión de duplicados. No asumir que el nombre identifica de forma única a una persona. |
| `telefono` | Teléfono del cliente | Texto, nunca número; conservar `+`, ceros iniciales y formato original. |
| `email` | Correo electrónico del cliente | Campo opcional. Puede no existir en el CSV o estar vacío en algunos registros; no marcar el registro como inválido por ello. |

Estos campos de contacto se conservan en la hoja RAW y en vistas de detalle cuando corresponda. No deben convertirse en categorías de gráficos ni mostrarse en resúmenes agregados.

### Dimensiones configurables y referencias por defecto

Las siguientes tablas establecen las **referencias y valores predeterminados de fábrica**. Al iniciar la aplicación por primera vez se precargan como opciones activas en SQLite. El usuario puede personalizarlas en el asistente inicial o en Configuración (agregando, editando colores/etiquetas o removiendo elementos). Durante el análisis, el motor consulta las categorías activas en SQLite.

#### Columna `estatus`

Representa la etapa o situación comercial del lead. Comparar valores sin distinguir mayúsculas/minúsculas y tolerar espacios exteriores.

**Valores predeterminados:**

| Valor | Significado para el reporte | Color | ¿Es conversión? |
|---|---|---|---|
| `nuevo` | Lead recién registrado | Azul cielo `#38BDF8` | No |
| `contactado` | Ya hubo contacto | Púrpura `#A855F7` | No |
| `cotizado` | Se realizó una cotización | Naranja `#F97316` | No |
| `compra` | Registro marcado como compra | Verde `#22C55E` | **Sí** |
| `en seguimiento` | Requiere seguimiento comercial | Azul cian `#06B6D4` | No |
| `sin respuesta` | No se obtuvo respuesta | Rojo `#EF4444` | No |
| `en espera` | Está en espera | Amarillo `#EAB308` | No |
| vacío o `sin estatus` | No tiene estatus informado | Gris `#9CA3AF` | No |

En el resumen debe existir un conteo de registros por cada estatus activo y un gráfico de distribución. Los registros cuyo estatus esté marcado como conversión (por defecto `compra`) se utilizan para contar registros convertidos y calcular la tasa de conversión sobre el total de registros válidos incluidos. No equivale a unidades vendidas ni confirma facturación.

#### Columna `prioridad`

Representa la prioridad asignada al lead.

**Valores predeterminados:**

| Valor | Color |
|---|---|
| `baja` | Gris `#9CA3AF` |
| `media` | Verde `#22C55E` |
| `alta` | Amarillo `#EAB308` |
| `urgente` | Rojo `#EF4444` |
| `nula` | Negro `#111827` |

Incluir conteo y gráfico de distribución por prioridad. No convertir automáticamente un valor vacío en `nula`: mostrarlo como `Sin dato` y distinguirlo de la categoría explícita `nula`.

#### Columna `origen`

Representa el origen o plataforma por la que llegó el lead.

**Valores predeterminados:**

| Valor | Color |
|---|---|
| `whatsapp` | Verde `#22C55E` |
| `facebook` | Azul `#1877F2` |
| `instagram` | Rosado `#E1306C` |
| `web` | Negro `#111827` |
| `orgánico` / `organico` | Amarillo pálido `#FDE68A` |

Incluir conteo por origen y gráfico de distribución. Para `orgánico`, reconocer la variante sin tilde como el mismo valor analítico, conservando el texto original en RAW.

#### Columna `medio`

Representa el medio o tipo de captación. No confundirlo con `origen`: son dimensiones distintas y deben tener resúmenes separados.

**Valores predeterminados:**

| Valor | Color |
|---|---|
| `orgánico` / `organico` | Verde `#22C55E` |
| `campaña` / `campana` | Naranja `#F97316` |
| `referido` | Púrpura `#A855F7` |
| `prospección` / `prospeccion` | Azul cian `#06B6D4` |

Incluir conteo por medio y gráfico de distribución. Reconocer variantes con/sin tilde para agrupar, sin modificar el valor original en RAW.

### Reglas de normalización y aplicación de categorías

- Normalizar para comparación: quitar espacios exteriores, comparar sin distinguir mayúsculas/minúsculas y admitir variantes diacríticas habituales (ej. tildes).
- El motor de análisis busca coincidencia entre el valor normalizado del CSV y los `match_value` de las categorías activas en `dimension_categories`.
- Si un registro del CSV tiene un valor que no coincide con ninguna categoría activa (por ejemplo, porque el usuario la eliminó o el CRM exportó un valor nuevo), no ignorarlo ni inventar datos: clasificarlo bajo la etiqueta `"Sin catalogar"` con estilo neutral `#6B7280` y reportarlo en el resumen como valor no catalogado.
- Los valores vacíos deben aparecer como `Sin dato`, excepto en `estatus`, donde el reporte puede etiquetarlos visualmente como `Sin estatus`.
- Mantener una sola fuente de verdad para las etiquetas, equivalencias y colores (el servicio de dominio que carga `dimension_categories`), y reutilizarla en todas las hojas Excel.
- Aplicar los colores en las celdas/etiquetas de las tablas y en las leyendas cuando la biblioteca de Excel lo permita. En gráficos, usar colores coherentes con las categorías cuando sea posible.
- Elegir color de texto con contraste legible sobre cada relleno; especialmente texto oscuro sobre colores claros y texto claro sobre colores oscuros.
- Los colores son una ayuda visual, no deben ser el único medio para comunicar el estado: conservar siempre el texto de la categoría.

### Composición mínima de los reportes a partir de estas columnas

La hoja **Resumen** debe incluir:
1. Total de registros válidos incluidos.
2. Total y porcentaje de registros con estatus de conversión (por defecto `compra`).
3. Conteo y gráfico por `estatus`.
4. Conteo y gráfico por `prioridad`.
5. Conteo y gráfico por `origen`.
6. Conteo y gráfico por `medio`.
7. Conteo de valores vacíos o no catalogados en las dimensiones anteriores.

La hoja **Análisis comercial** debe cruzar, cuando las columnas existan:
- Compras por responsable.
- Compras por producto.
- Compras por origen y por medio.
- Distribución de estatus por responsable.
- Prioridad por responsable.

Los cruces deben contar registros, no unidades. Si una columna opcional no está presente, omitir únicamente el análisis que depende de ella y añadir una advertencia comprensible; no fallar la generación completa del libro.

La hoja **Datos RAW** conserva `nombre`, `telefono`, `email` y el resto de columnas originales. Si `email` no existe, no crear una columna ficticia en RAW. Los indicadores agregados deben evitar exponer innecesariamente datos personales.

## 11. Limpieza configurable

Permitir, antes de exportar:
- Filtrar por rango de fechas y columna seleccionada.
- Excluir filas vacías o inválidas.
- Detectar/eliminar duplicados por una o varias columnas elegidas.
- Excluir registros mediante condiciones, por ejemplo estatus.
- Normalizar espacios y valores vacíos.
- Restaurar la selección original durante la sesión.

Aplicar reglas en memoria; nunca modificar el CSV. Mostrar filas conservadas/excluidas y motivos cuando sea posible. La limpieza debe ser reversible durante la sesión. En Múltiple, indicar qué reglas se aplican a cada CSV y no asumir que todos tienen las mismas columnas.

## 12. Generación XLSX

Usar `rust_xlsxwriter`. Generar archivos nuevos en la carpeta configurada.

- **Resumen:** total de registros, conteos por estatus, compras y porcentaje, prioridad, origen, medio, periodo disponible y advertencias.
- **Análisis comercial:** registros/compras por responsable, producto, origen, medio y prioridad; valor estimado solo si es numérico y su significado es válido.
- **Seguimiento:** estatus, fechas de seguimiento y registros sin fecha si existen; oportunidades pendientes solo mediante reglas explícitas.
- **Datos RAW:** filas incluidas después de limpieza, encabezados originales, tabla con filtros, fila superior inmovilizada y formatos inequívocos.

Incluir gráficos dentro del Excel. No hace falta replicarlos como dashboard interactivo en la app. Validar la existencia de hojas y la integridad del archivo generado.

## 13. Criterios de cálculo

- Diferenciar **cantidad de registros**, **clientes únicos**, **compras** y **unidades vendidas**.
- Compras cuenta registros cuyo estatus normalizado esté marcado como conversión (`is_conversion = 1`) en la configuración del usuario (por defecto `compra`); no inferir unidades.
- Tasa de conversión = registros marcados como conversión / total de registros válidos incluidos × 100; mostrar denominador.
- Sin identificador confiable, no afirmar que se cuentan clientes únicos.
- Un `valor_estimado` vacío no es cero automáticamente.
- No presentar valor estimado como facturación real.
- Categorías vacías se muestran como “Sin dato” o se excluyen explícitamente.
- Los totales deben reconciliar con las filas incluidas.

## 14. Limpieza de biblioteca

Permitir eliminar referencias cuyo archivo no exista, referencias anteriores a una fecha o vaciar el catálogo, siempre con confirmación. Aclarar que solo se eliminan referencias SQLite, no archivos fuente ni XLSX del disco. El historial de reportes generados no es obligatorio para el MVP.

## 15. Pruebas y calidad

### Rust (`cargo test` + `tempfile`)

Cubrir CSV vacío/mal formado, encabezados duplicados, delimitadores, comillas, comas y saltos de línea dentro de campos, acentos, vacíos, fechas válidas/inválidas, ceros iniciales, métricas y reconciliación, duplicados, fuentes movidas/eliminadas/sin permisos, revinculación, validación de carpeta/nombre, colisiones, modos individual/múltiple, fallos parciales, categorías dinámicas en base de datos y XLSX con hojas esperadas.

### Frontend (Vitest + React Testing Library)

Cubrir sidebar/navegación, pantalla inicial, carpeta visible, asistente de configuración por pasos (onboarding wizard), vista de Configuración (cambio de ruta y CRUD de dimensiones), Individual por defecto, cambio de modo, selección y drag-and-drop, validación de selección múltiple en Individual, nombre de exportación, loading/progreso/éxito/error, archivo no encontrado, biblioteca y alias. Mockear comandos Tauri desde `src/lib/tauri.ts`.

### Verificaciones por fase

Ejecutar `cargo test`, `cargo fmt --check`, `cargo clippy`, `pnpm test` y `pnpm build`. Corregir fallos antes de avanzar. No afirmar éxito sin verificarlo. Mostrar errores accionables, no solo errores técnicos crudos.

## 16. Estructura sugerida

```text
src/
  app/
  components/
    layout/
      AppSidebar.tsx
      AppLayout.tsx
    ui/
  features/
    onboarding/
      components/
        OnboardingWizard.tsx
        StepExportFolder.tsx
        StepStatusCategories.tsx
        StepPriorityCategories.tsx
        StepSourceCategories.tsx
        StepMediumCategories.tsx
    home/
    source-library/
    csv-import/
    csv-preview/
    data-cleaning/
    report-export/
    settings/
      components/
        ExportFolderSettings.tsx
        DimensionCategoriesSettings.tsx
  lib/
    tauri.ts
  test/
  types/

src-tauri/
  capabilities/
  migrations/
  src/
    commands/
      source_files.rs
      csv.rs
      reports.rs
      settings.rs
      dimensions.rs
    domain/
      models.rs
      cleaning.rs
      metrics.rs
      dimensions.rs
    infrastructure/
      database.rs
      csv_reader.rs
      excel_writer.rs
      filesystem.rs
    lib.rs
    main.rs
```

Adaptar la estructura cuando sea necesario; no crear abstracciones vacías.

## 17. Plan de implementación por fases y pasos cortos

Trabajar una fase a la vez. Cada paso debe ser pequeño, verificable y dejar el proyecto compilable. No avanzar si fallan tests o build de la fase actual.

### Fase 1 — Inicialización
1. Crear proyecto Tauri v2.
2. Configurar React, TypeScript y Vite.
3. Configurar pnpm.
4. Instalar Tailwind y shadcn/ui.
5. Instalar `lucide-react`.
6. Configurar Vitest y React Testing Library.
7. Verificar `pnpm build` y `pnpm test`.
8. Verificar compilación inicial Tauri.

**Entregable:** app vacía que abre en escritorio y tiene tests frontend.

### Fase 2 — Layout, navegación y asistente inicial (Onboarding Wizard)
1. Crear layout sidebar + contenido.
2. Añadir Inicio, Archivos y Configuración.
3. Añadir iconos Lucide React.
4. Implementar estructura de asistente inicial por pasos (Steps) para el primer arranque.
5. Crear pantalla inicial y estados vacíos.
6. Añadir tests de navegación y renderizado del wizard.

**Entregable:** UI navegable con soporte de asistente inicial por pasos.

### Fase 3 — Persistencia de configuración, ruta y dimensiones
1. Crear tablas SQLite `app_settings` y `dimension_categories` con semillas predeterminadas.
2. Implementar comandos Tauri para leer y actualizar configuración (`settings.rs` y `dimensions.rs`).
3. Definir carpeta predeterminada con APIs de rutas Tauri.
4. Implementar selector nativo de carpeta y persistencia en configuración.
5. Implementar vista de Configuración: cambio de ruta y CRUD de dimensiones (`estatus`, `prioridad`, `origen`, `medio`).
6. Conectar asistente inicial de pasos con los comandos de configuración.
7. Mostrar carpeta activa en Inicio y añadir campo separado para nombre XLSX.
8. Añadir tests Rust y frontend.

**Entregable:** carpeta de exportación y dimensiones comerciales configurables y persistentes desde el primer inicio.

### Fase 4 — Importación y modos
1. Implementar diálogo nativo de selección.
2. Implementar drag-and-drop.
3. Validar extensión y acceso.
4. Crear selector Individual/Múltiple.
5. Establecer Individual por defecto.
6. Mostrar lista de archivos y permitir retirarlos.
7. Validar que Individual acepte solo un CSV.
8. Añadir tests de ambos modos.

**Entregable:** usuario puede seleccionar o arrastrar CSV en ambos modos.

### Fase 5 — Lectura y vista previa
1. Implementar lector CSV Rust.
2. Detectar delimitador.
3. Leer encabezados y filas.
4. Crear vista previa limitada/paginada.
5. Mostrar errores y advertencias.
6. Conservar identificadores como texto.
7. Añadir tests de CSV y casos límite.

**Entregable:** inspección de CSV sin modificar fuentes.

### Fase 6 — SQLite y biblioteca de fuentes
1. Crear migración `source_files`.
2. Implementar alta opcional de fuentes.
3. Implementar listado y búsqueda.
4. Implementar alias y eliminación de referencia.
5. Detectar rutas no disponibles.
6. Implementar revinculación.
7. Añadir tests de repositorio/filesystem.

**Entregable:** biblioteca local persistente de metadatos y rutas.

### Fase 7 — Limpieza
1. Crear modelo de reglas.
2. Implementar rango de fechas.
3. Excluir filas vacías/inválidas.
4. Implementar duplicados configurables.
5. Normalizar espacios y vacíos.
6. Mostrar filas conservadas y excluidas.
7. Permitir restaurar datos originales en sesión.
8. Añadir tests unitarios por regla.

**Entregable:** limpieza reversible en memoria.

### Fase 8 — Métricas y análisis dinámico
1. Implementar total de registros válidos.
2. Agrupar por estatus dinámicos consultando `dimension_categories`.
3. Calcular compras y tasa de conversión sobre los estatus marcados con `is_conversion`.
4. Agrupar por responsable.
5. Agrupar por producto, origen y prioridad dinámicos.
6. Tratar valor estimado con advertencias.
7. Verificar reconciliación de totales.
8. Añadir tests de datos incompletos y valores no catalogados.

**Entregable:** métricas reproducibles por CSV basadas en las categorías del usuario.

### Fase 9 — Exportación individual
1. Integrar `rust_xlsxwriter`.
2. Generar hoja Resumen aplicando colores de las categorías configuradas.
3. Generar Análisis comercial.
4. Generar Seguimiento.
5. Generar Datos RAW.
6. Añadir tablas, filtros, formatos y gráficos.
7. Aplicar carpeta y nombre configurados.
8. Evitar sobrescritura silenciosa.
9. Validar XLSX generado en tests.

**Entregable:** flujo Individual completo CSV → XLSX con personalización de categorías.

### Fase 10 — Exportación múltiple
1. Procesar cada CSV independientemente.
2. Aplicar reglas compatibles por archivo.
3. Generar un XLSX por fuente.
4. Evitar colisiones de nombres.
5. Mostrar progreso global e individual.
6. Gestionar fallos parciales.
7. Añadir tests de lote.

**Entregable:** modo Múltiple funcional.

### Fase 11 — Biblioteca y pulido
1. Añadir filtros y orden.
2. Añadir limpieza de referencias antiguas.
3. Añadir vaciado con confirmación.
4. Mejorar avisos de rutas inaccesibles.
5. Revisar accesibilidad y estados de UI en español de México.
6. Ejecutar toda la suite.

**Entregable:** experiencia de uso consistente y localizada.

### Fase 12 — Empaquetado de escritorio
1. Configurar identificador y metadatos.
2. Configurar iconos y recursos.
3. Configurar builds para los sistemas objetivo.
4. Generar instalador.
5. Probar instalación limpia.
6. Probar funcionamiento sin Internet.
7. Probar permisos, rutas y exportación en cada sistema.
8. Documentar comandos de desarrollo, test y build.

**Entregable:** app instalable y validada en los entornos objetivo.

## 18. Criterios de aceptación del MVP

El usuario puede abrir la app offline por primera vez y completar el asistente de configuración por pasos; configurar la ruta predeterminada de salida; personalizar estatus, prioridad, origen y medio (agregando, editando o removiendo categorías, o restableciendo valores de fábrica); ver la sidebar y la pantalla de Inicio; ver la carpeta de exportación; modificar preferencias en Configuración; seleccionar o arrastrar CSV; usar Individual por defecto o Múltiple; escribir el nombre de XLSX separado de la ruta; ver loading y progreso; generar un XLSX en la carpeta configurada con los colores y categorías activos; obtener un XLSX por CSV en modo múltiple; ver errores parciales; registrar y editar alias; conservar biblioteca, configuraciones y categorías tras reiniciar; detectar y revincular fuentes movidas; previsualizar y limpiar datos; verificar que los totales coinciden; y eliminar referencias sin borrar archivos originales. Toda la UI y reportes están en español de México (`es-MX`) y el código en inglés.

## 19. Decisiones y límites del MVP

- No construir backend HTTP.
- SQLite almacena catálogo, configuración y categorías activas, no CSV completos.
- La ruta absoluta es la referencia principal; no prometer detección universal de movimientos.
- Los reportes se regeneran desde la fuente mientras esté disponible.
- Carpeta de exportación y nombre son campos separados.
- Individual es el modo predeterminado.
- Múltiple genera un XLSX independiente por CSV.
- Las referencias originales de estatus, prioridad, origen y medio son valores semilla predeterminados que el usuario puede adaptar a su negocio.
- Priorizar exactitud, trazabilidad, claridad y tests sobre cantidad de gráficos.
- Preparar arquitectura para futuras plantillas y perfiles de columnas por tipo de CSV.
