import type { AppSettings, DimensionCategory } from '../types/dimensions'
import type { CsvFileMetadata, CsvPreviewData } from '../types/csv'
import type { SourceFileItem } from '../types/sourceFiles'
import type { CleaningRules, CleaningSummary } from '../types/cleaning'

/**
 * Tauri API wrapper allowing mocking in tests without requiring real Tauri runtime.
 */
type CommandHandler = (args?: unknown) => Promise<unknown> | unknown

const mockHandlers = new Map<string, CommandHandler>()

export function registerMockCommand(command: string, handler: CommandHandler) {
  mockHandlers.set(command, handler)
}

export function clearMockCommands() {
  mockHandlers.clear()
}

export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  // If running in test environment or mock is registered
  if (mockHandlers.has(command)) {
    const handler = mockHandlers.get(command)!
    return (await handler(args)) as T
  }

  // Check if Tauri is present in window
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<T>(command, args)
  }

  console.warn(
    `[tauri.ts] Unhandled mock command invocation: "${command}" with args:`,
    args
  )
  throw new Error(
    `Command "${command}" has no mock registered and Tauri is not available.`
  )
}

export async function pickFolderDialog(defaultPath?: string): Promise<string | null> {
  if (mockHandlers.has('pick_folder_dialog')) {
    const handler = mockHandlers.get('pick_folder_dialog')!
    return (await handler({ defaultPath })) as string | null
  }

  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const result = await open({
        directory: true,
        multiple: false,
        defaultPath,
        title: 'Seleccionar carpeta de exportación',
      })
      if (typeof result === 'string') return result
      return null
    } catch (err) {
      console.warn('Native dialog failed, falling back:', err)
    }
  }

  // The native picker is a desktop capability. Never ask the user to type a
  // raw filesystem path: surface the limitation instead.
  console.warn(
    'La selección de carpetas requiere la aplicación de escritorio. No hay diálogo nativo disponible.'
  )
  return null
}

export async function pickCsvFilesDialog(multiple: boolean): Promise<string[]> {
  if (mockHandlers.has('pick_csv_files_dialog')) {
    const handler = mockHandlers.get('pick_csv_files_dialog')!
    return (await handler({ multiple })) as string[]
  }

  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const result = await open({
        directory: false,
        multiple,
        title: multiple ? 'Seleccionar archivos CSV' : 'Seleccionar archivo CSV',
        filters: [{ name: 'Archivos CSV (*.csv)', extensions: ['csv'] }],
      })
      if (Array.isArray(result)) return result
      if (typeof result === 'string') return [result]
      return []
    } catch (err) {
      console.warn('Native csv dialog failed:', err)
    }
  }

  return []
}

// Typed backend API services
export async function getAppSettingsApi(): Promise<AppSettings> {
  return await invokeCommand<AppSettings>('get_app_settings')
}

export async function saveAppSettingsApi(settings: AppSettings): Promise<void> {
  return await invokeCommand<void>('save_app_settings', { settings })
}

export async function getSuggestedExportFolderApi(): Promise<string> {
  return await invokeCommand<string>('get_suggested_export_folder')
}

export async function validateExportFolderApi(path: string): Promise<void> {
  return await invokeCommand<void>('validate_export_folder', { path })
}

export async function getDimensionCategoriesApi(
  dimension?: string
): Promise<DimensionCategory[]> {
  return await invokeCommand<DimensionCategory[]>('get_dimension_categories', {
    dimension,
  })
}

export async function saveDimensionCategoriesApi(
  dimension: string,
  categories: DimensionCategory[]
): Promise<void> {
  return await invokeCommand<void>('save_dimension_categories', {
    dimension,
    categories,
  })
}

export async function resetDimensionCategoriesApi(
  dimension?: string
): Promise<DimensionCategory[]> {
  return await invokeCommand<DimensionCategory[]>('reset_dimension_categories', {
    dimension,
  })
}

export async function validateCsvFileApi(path: string): Promise<CsvFileMetadata> {
  return await invokeCommand<CsvFileMetadata>('validate_csv_file', { path })
}

export async function getCsvPreviewApi(
  path: string,
  delimiter?: string,
  limit?: number
): Promise<CsvPreviewData> {
  return await invokeCommand<CsvPreviewData>('get_csv_preview', {
    path,
    delimiter,
    limit,
  })
}

// Cleaning APIs
export async function applyCleaningRulesApi(
  path: string,
  rules: CleaningRules,
  delimiter?: string
): Promise<CleaningSummary> {
  return await invokeCommand<CleaningSummary>('apply_cleaning_rules', {
    path,
    rules,
    delimiter,
  })
}

// Source Files Library APIs
export async function registerSourceFileApi(
  route: string,
  fileName: string,
  alias?: string
): Promise<SourceFileItem> {
  return await invokeCommand<SourceFileItem>('register_source_file', {
    route,
    fileName,
    alias,
  })
}

export async function listSourceFilesApi(query?: string): Promise<SourceFileItem[]> {
  return await invokeCommand<SourceFileItem[]>('list_source_files', { query })
}

export async function updateSourceAliasApi(
  id: string,
  alias?: string
): Promise<void> {
  return await invokeCommand<void>('update_source_alias', { id, alias })
}

export async function relinkSourceFileApi(
  id: string,
  newRoute: string
): Promise<void> {
  return await invokeCommand<void>('relink_source_file', { id, newRoute })
}

export async function deleteSourceFileApi(id: string): Promise<void> {
  return await invokeCommand<void>('delete_source_file', { id })
}

export async function cleanMissingSourcesApi(): Promise<number> {
  return await invokeCommand<number>('clean_missing_sources')
}

export async function clearSourceLibraryApi(): Promise<void> {
  return await invokeCommand<void>('clear_source_library')
}
