# Plan de Implementación por Fases y Checklist de Steps

Este documento registra el progreso del proyecto paso a paso, manteniendo actualizado el estado de cada fase y subtarea de acuerdo con las especificaciones de `AGENTS.md`.

---

## Fase 1 — Inicialización y Entorno Base
**Objetivo:** App base configurada que abre en escritorio, con soporte de estilos y suite de pruebas frontend y backend.

- [x] **Paso 1.1:** Crear proyecto Tauri v2 (`src-tauri` generado e integrado).
- [x] **Paso 1.2:** Configurar React 19, TypeScript y Vite.
- [x] **Paso 1.3:** Configurar gestor de paquetes pnpm.
- [x] **Paso 1.4:** Configurar Tailwind CSS y utilidades base (`clsx`, `tailwind-merge`, helper `cn()`).
- [x] **Paso 1.5:** Instalar `lucide-react` para iconografía estándar.
- [x] **Paso 1.6:** Instalar y configurar Vitest, React Testing Library y jsdom para pruebas de UI (`vitest.config.ts`, `setup.ts`, `tauri.ts`).
- [x] **Paso 1.7:** Crear prueba unitaria frontend de prueba y verificar `pnpm test` y `pnpm build`.
- [x] **Paso 1.8:** Verificar compilación inicial de Rust / Tauri con `cargo check`.

---

## Fase 2 — Layout, Navegación y Asistente Inicial (Onboarding Wizard)
**Objetivo:** Interfaz estructurada (sidebar + contenido) y asistente por pasos para el primer arranque.

- [x] **Paso 2.1:** Implementar layout con Sidebar lateral colapsable y área de contenido principal (`AppSidebar`, `AppLayout`).
- [x] **Paso 2.2:** Configurar secciones de navegación: Inicio, Archivos y Configuración con iconos `lucide-react`.
- [x] **Paso 2.3:** Crear estructura del Asistente Inicial (Onboarding Wizard) en formato de pasos (`steps`).
  - [x] Paso 1: Carpeta predeterminada de salida (`StepExportFolder.tsx`).
  - [x] Paso 2: Estatus comerciales y marca de conversión (`StepDimensionEditor.tsx`).
  - [x] Paso 3: Niveles de prioridad (`StepDimensionEditor.tsx`).
  - [x] Paso 4: Plataformas de origen (`StepDimensionEditor.tsx`).
  - [x] Paso 5: Medios de captación (`StepDimensionEditor.tsx`).
  - [x] Paso 6: Resumen y confirmación (`StepSummary.tsx`).
- [x] **Paso 2.4:** Crear pantalla de Inicio con estados vacíos (`HomeScreen.tsx`).
- [x] **Paso 2.5:** Añadir pruebas de renderizado y navegación con Vitest (`AppSidebar.test.tsx`, `OnboardingWizard.test.tsx`, `App.test.tsx` — 9 tests aprobados).

---

## Fase 3 — Persistencia de Configuración, Ruta y Dimensiones
**Objetivo:** Configuración de carpeta y personalización CRUD de dimensiones comerciales persistidas en SQLite.

- [x] **Paso 3.1:** Crear migraciones SQLite para `app_settings` y `dimension_categories` con valores predeterminados (seeds).
- [x] **Paso 3.2:** Implementar comandos Tauri en Rust para leer/guardar configuración (`settings.rs`) y categorías (`dimensions.rs`).
- [x] **Paso 3.3:** Implementar selector nativo de carpeta y sugerencia de ruta predeterminada del sistema (`tauri-plugin-dialog`, `get_suggested_export_folder`).
- [x] **Paso 3.4:** Crear pantalla de Configuración en UI (cambio de ruta y pestañas CRUD para estatus, prioridad, origen, medio).
- [x] **Paso 3.5:** Conectar el Onboarding Wizard con los comandos Tauri de persistencia.
- [x] **Paso 3.6:** Visualizar carpeta activa en pantalla de Inicio y campo de nombre XLSX.
- [x] **Paso 3.7:** Pruebas unitarias de comandos Rust (`cargo test`: 3 tests aprobados) y componentes de configuración (`vitest`: 10 tests aprobados).

---

## Fase 4 — Importación de CSV y Modos de Operación
**Objetivo:** Carga de archivos por drag-and-drop o diálogo nativo, con soporte para modo Individual y Múltiple.

- [x] **Paso 4.1:** Implementar diálogo nativo de selección de archivos `.csv` (`pickCsvFilesDialog` con filtro `.csv`).
- [x] **Paso 4.2:** Implementar zona de Drag-and-Drop compatible con Tauri v2 y web fallback.
- [x] **Paso 4.3:** Validar formato `.csv`, existencia, permisos y legibilidad (`validate_csv_file` en Rust, 4 tests aprobados).
- [x] **Paso 4.4:** Crear selector de modo (Individual por defecto / Múltiple).
- [x] **Paso 4.5:** Lista de archivos seleccionados con tamaño formateado, ruta y acción para quitarlos individualmente o todos.
- [x] **Paso 4.6:** Validación: exigir exactamente un archivo en modo Individual con diálogo interactivo de resolución (conservar solo el primero o cambiar a modo múltiple).
- [x] **Paso 4.7:** Pruebas automatizadas de selección y validación (`HomeScreen.test.tsx` con 6 tests aprobados).

---

## Fase 5 — Lectura, Detección y Vista Previa de CSV
**Objetivo:** Lectura robusta de CSV en Rust sin alterar archivos originales.

- [x] **Paso 5.1:** Implementar lector CSV en Rust (`csv` crate en `src-tauri/src/infrastructure/csv_reader.rs`).
- [x] **Paso 5.2:** Detección automática de delimitador (coma, punto y coma, tabulador, barra) y manejo de UTF-8 con despojo de BOM.
- [x] **Paso 5.3:** Lectura de encabezados y preservación de identificadores/teléfonos como texto sin pérdida de ceros ni formato.
- [x] **Paso 5.4:** Vista previa paginada/limitada en UI con selector de delimitador (`CsvPreviewModal.tsx`).
- [x] **Paso 5.5:** Manejo y reporte de advertencias/errores de codificación y filas irregulares.
- [x] **Paso 5.6:** Pruebas Rust con archivos temporales y casos límite (11 tests aprobados en `cargo test`, 20 tests en Vitest).

---

## Fase 6 — Catálogo de Archivos Fuente en SQLite
**Objetivo:** Biblioteca opcional de fuentes con metadatos y revinculación.

- [x] **Paso 6.1:** Crear tabla `source_files` en SQLite (esquema inicializado en `database.rs`).
- [x] **Paso 6.2:** Comandos Tauri para alta, listado, filtrado y edición de alias (`register_source_file`, `list_source_files`, `update_source_alias`).
- [x] **Paso 6.3:** Detección de fuentes movidas o inaccesibles con badge "Archivo no encontrado" (`is_available` dinámico).
- [x] **Paso 6.4:** Flujo de revinculación ("Localizar archivo" con `relink_source_file`).
- [x] **Paso 6.5:** Eliminación de referencias individuales o vaciado de catálogo sin borrar archivos físicos.
- [x] **Paso 6.6:** Pruebas unitarias de base de datos y comandos (`test_source_files_lifecycle` en Rust, `LibraryScreen.test.tsx` con 5 tests en Vitest).

---

## Fase 7 — Limpieza Configurable en Memoria
**Objetivo:** Reglas reversibles de filtrado y saneamiento de datos previo a la exportación.

- [ ] **Paso 7.1:** Modelo de reglas de limpieza en Rust.
- [ ] **Paso 7.2:** Filtro por rango de fechas según columna elegida.
- [ ] **Paso 7.3:** Detección y eliminación de duplicados por columnas seleccionadas.
- [ ] **Paso 7.4:** Exclusión de filas vacías o por condición de estatus.
- [ ] **Paso 7.5:** Normalización de espacios y vacíos.
- [ ] **Paso 7.6:** UI para configurar limpieza y visualizar registros conservados/excluidos.
- [ ] **Paso 7.7:** Pruebas unitarias de cada regla de limpieza.

---

## Fase 8 — Motor de Métricas y Normalización Dinámica
**Objetivo:** Cálculo preciso de indicadores comerciales basado en las dimensiones activas del usuario.

- [ ] **Paso 8.1:** Mapeo y normalización de columnas del CSV contra `dimension_categories`.
- [ ] **Paso 8.2:** Agrupación y conteo por estatus activos; etiquetado `"Sin catalogar"` para no coincidentes.
- [ ] **Paso 8.3:** Cálculo de tasa de conversión dinámica (`is_conversion = 1`).
- [ ] **Paso 8.4:** Cruces comerciales: responsable, producto, origen, medio y prioridad.
- [ ] **Paso 8.5:** Reconciliación de totales contra filas válidas.
- [ ] **Paso 8.6:** Pruebas unitarias de métricas y casos de datos incompletos.

---

## Fase 9 — Generación XLSX (Modo Individual)
**Objetivo:** Generación completa de reportes Excel con `rust_xlsxwriter` respetando estilos personalizados.

- [ ] **Paso 9.1:** Integración de `rust_xlsxwriter`.
- [ ] **Paso 9.2:** Hoja **Resumen:** tablas métricas, conteos y gráficos con paleta activa.
- [ ] **Paso 9.3:** Hoja **Análisis comercial:** tablas cruzadas y gráficos.
- [ ] **Paso 9.4:** Hoja **Seguimiento:** oportunidades y fechas de contacto.
- [ ] **Paso 9.5:** Hoja **Datos RAW:** datos limpios con encabezados originales y filtros automáticos.
- [ ] **Paso 9.6:** Exportación a la ruta configurada evitando sobrescritura accidental.
- [ ] **Paso 9.7:** Pruebas de integración de generación y validación de hojas.

---

## Fase 10 — Exportación Múltiple (Lote)
**Objetivo:** Procesamiento en lote generando un XLSX independiente por cada CSV.

- [ ] **Paso 10.1:** Procesamiento secuencial o concurrente de múltiples CSV.
- [ ] **Paso 10.2:** Generación de nombres no colisionantes con sufijos distintivos.
- [ ] **Paso 10.3:** Reporte de progreso global y detalle de archivos exitosos/fallidos.
- [ ] **Paso 10.4:** Pruebas de integración con múltiples archivos.

---

## Fase 11 — Mantenimiento de Biblioteca y Pulido General
**Objetivo:** Limpieza de catálogo, consistencia visual y accesibilidad en español de México.

- [ ] **Paso 11.1:** Acciones para limpiar referencias huérfanas o vaciar catálogo con confirmación.
- [ ] **Paso 11.2:** Revisión de accesibilidad, contrastes de color y textos en español `es-MX`.
- [ ] **Paso 11.3:** Manejo exhaustivo de estados de carga, avisos y errores accionables.
- [ ] **Paso 11.4:** Ejecución y validación de suite completa (`cargo test`, `pnpm test`, `pnpm build`).

---

## Fase 12 — Empaquetado y Validación de Escritorio
**Objetivo:** Ejecutables e instaladores validados sin dependencias externas.

- [ ] **Paso 12.1:** Configurar metadatos, iconos y permisos en Tauri v2.
- [ ] **Paso 12.2:** Compilación de release (`pnpm tauri build`).
- [ ] **Paso 12.3:** Pruebas de funcionamiento 100% offline.
- [ ] **Paso 12.4:** Documentación final de uso y comandos de desarrollo.
