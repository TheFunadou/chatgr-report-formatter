import React, { useMemo, useState } from 'react'
import {
  UploadCloud,
  FileText,
  Trash2,
  Play,
  Layers,
  FileCheck,
  FolderOpen,
  AlertTriangle,
  Info,
  X,
  Eye,
  Sparkles,
  ArrowRight,
  FolderTree,
} from 'lucide-react'
import type { SelectedCsvFile } from '../../../types/csv'
import type { DimensionCategory } from '../../../types/dimensions'
import {
  DEFAULT_CLEANING_RULES,
  describeCleaningRules,
  type CleaningRules,
} from '../../../types/cleaning'
import { pickCsvFilesDialog, validateCsvFileApi } from '../../../lib/tauri'
import { CsvPreviewModal } from './CsvPreviewModal'
import { CleaningConfigModal } from './CleaningConfigModal'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Input, Label } from '../../../components/ui/input'
import { cn } from '../../../lib/utils'

export type ProcessMode = 'individual' | 'multiple'

interface HomeScreenProps {
  exportPath: string
  onOpenSettings: () => void
  statuses?: DimensionCategory[]
  initialFile?: {
    path: string
    name: string
    size: number
  } | null
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  exportPath,
  onOpenSettings,
  statuses = [],
  initialFile,
}) => {
  const [mode, setMode] = useState<ProcessMode>('individual')
  const [selectedFiles, setSelectedFiles] = useState<SelectedCsvFile[]>(() => {
    if (initialFile) {
      return [
        {
          id: `file-${Date.now()}`,
          path: initialFile.path,
          name: initialFile.name,
          size: initialFile.size,
        },
      ]
    }
    return []
  })
  const [outputFileName, setOutputFileName] = useState('reporte_crm_clientes')
  const [isDragging, setIsDragging] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [pendingMultipleFiles, setPendingMultipleFiles] = useState<SelectedCsvFile[] | null>(null)
  const [previewTargetFile, setPreviewTargetFile] = useState<SelectedCsvFile | null>(null)
  const [cleaningTargetFile, setCleaningTargetFile] = useState<SelectedCsvFile | null>(null)
  const [rulesByFile, setRulesByFile] = useState<Record<string, CleaningRules>>({})

  const rulesFor = (file?: SelectedCsvFile) =>
    file ? rulesByFile[file.path] ?? DEFAULT_CLEANING_RULES : DEFAULT_CLEANING_RULES

  const configuredFilesCount = useMemo(() => Object.keys(rulesByFile).length, [rulesByFile])

  const processAndAddFilePaths = async (paths: string[]) => {
    setErrorMessage(null)
    const validatedFiles: SelectedCsvFile[] = []

    for (const path of paths) {
      try {
        const meta = await validateCsvFileApi(path)
        validatedFiles.push({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          path: meta.path,
          name: meta.fileName,
          size: meta.fileSize,
        })
      } catch (err: unknown) {
        const message =
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Error al validar el archivo CSV.'
        setErrorMessage(message)
      }
    }

    if (validatedFiles.length === 0) return

    const base = validatedFiles[0].name.replace(/\.csv$/i, '')
    setOutputFileName(`reporte_${base}`)

    if (mode === 'individual') {
      if (validatedFiles.length === 1 && selectedFiles.length === 0) {
        setSelectedFiles(validatedFiles)
      } else {
        const allCandidates = [...selectedFiles, ...validatedFiles]
        setPendingMultipleFiles(allCandidates)
      }
    } else {
      setSelectedFiles((prev) => {
        const existingPaths = new Set(prev.map((file) => file.path))
        const newOnes = validatedFiles.filter((file) => !existingPaths.has(file.path))
        return [...prev, ...newOnes]
      })
    }
  }

  const handlePickFiles = async () => {
    const paths = await pickCsvFilesDialog(mode === 'multiple')
    if (paths && paths.length > 0) {
      await processAndAddFilePaths(paths)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const paths = files.map((file) => {
        const candidate = file as File & { path?: string }
        return candidate.path || candidate.name
      })
      await processAndAddFilePaths(paths)
    }
  }

  const handleRemoveFile = (id: string) => {
    const target = selectedFiles.find((file) => file.id === id)
    setSelectedFiles((prev) => prev.filter((file) => file.id !== id))
    if (target) {
      setRulesByFile((prev) => {
        const next = { ...prev }
        delete next[target.path]
        return next
      })
    }
  }

  const handleClearAll = () => {
    setSelectedFiles([])
    setErrorMessage(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleKeepFirstOnly = () => {
    if (pendingMultipleFiles && pendingMultipleFiles.length > 0) {
      setSelectedFiles([pendingMultipleFiles[0]])
    }
    setPendingMultipleFiles(null)
  }

  const handleSwitchToMultiple = () => {
    if (pendingMultipleFiles && pendingMultipleFiles.length > 0) {
      setSelectedFiles(pendingMultipleFiles)
      setMode('multiple')
    }
    setPendingMultipleFiles(null)
  }

  const isIndividualModeOvercrowded = mode === 'individual' && selectedFiles.length > 1
  const canProcess =
    selectedFiles.length > 0 && !isIndividualModeOvercrowded && outputFileName.trim().length > 0

  const primaryFile = selectedFiles[0]
  const primaryRules = rulesFor(primaryFile)
  const primaryRulesSummary = describeCleaningRules(primaryRules)

  return (
    <div className="space-y-5">
      {/* Mode + destination */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <Label htmlFor="mode-individual">Modo de procesamiento</Label>
            <span className="text-[11px] text-ink-500">Individual procesa un archivo por vez</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                {
                  id: 'individual' as ProcessMode,
                  title: 'Individual (Predeterminado)',
                  description: 'Un CSV a la vez con reporte detallado',
                  icon: FileCheck,
                },
                {
                  id: 'multiple' as ProcessMode,
                  title: 'Múltiple en lote',
                  description: 'Un XLSX independiente por cada CSV',
                  icon: Layers,
                },
              ] as const
            ).map((option) => {
              const Icon = option.icon
              const isActive = mode === option.id
              return (
                <button
                  key={option.id}
                  id={option.id === 'individual' ? 'mode-individual' : undefined}
                  type="button"
                  onClick={() => {
                    setMode(option.id)
                    if (option.id === 'individual' && selectedFiles.length > 1) {
                      setPendingMultipleFiles(selectedFiles)
                    }
                  }}
                  aria-pressed={isActive}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    isActive
                      ? 'border-signal-600 bg-signal-50/70'
                      : 'border-line hover:border-line-strong hover:bg-paper/60'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
                      isActive ? 'bg-signal-600 text-white' : 'bg-paper text-ink-500'
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-[13px] font-semibold leading-tight',
                        isActive ? 'text-signal-700' : 'text-ink-800'
                      )}
                    >
                      {option.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-ink-500">
                      {option.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-paper text-ink-500">
              <FolderTree className="size-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink-700">Carpeta de destino</p>
              <p
                className="mt-1 break-all font-mono text-[11px] leading-4 text-ink-600"
                title={exportPath}
              >
                {exportPath || 'No definida'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="mt-3 self-start px-0" onClick={onOpenSettings}>
            <FolderOpen className="size-3.5" />
            Cambiar carpeta en Configuración
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
            <span className="leading-5">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded p-0.5 text-red-500 transition-colors hover:text-red-700"
            aria-label="Cerrar aviso"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed px-8 py-10 text-center transition-colors',
          isDragging
            ? 'border-signal-500 bg-signal-50'
            : 'border-line-strong bg-surface hover:border-ink-500/60'
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-400/60 to-transparent"
          aria-hidden="true"
        />
        <div
          className={cn(
            'mb-4 flex size-12 items-center justify-center rounded-lg border transition-colors',
            isDragging
              ? 'border-signal-200 bg-surface text-signal-600'
              : 'border-line bg-paper text-ink-500'
          )}
        >
          <UploadCloud className="size-6" strokeWidth={1.7} />
        </div>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
          Arrastra tu archivo CSV aquí
        </h2>
        <p className="mt-1 max-w-md text-xs leading-5 text-ink-500">
          Exportaciones de CRM en formato .csv con codificación UTF-8. Nada se modifica: la limpieza
          se aplica en memoria.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button variant="primary" onClick={handlePickFiles}>
            <FolderOpen />
            {mode === 'individual' ? 'Seleccionar archivo CSV' : 'Seleccionar archivos CSV'}
          </Button>
          <span className="text-[11px] text-ink-500">o suelta los archivos sobre esta zona</span>
        </div>
      </div>

      {/* Selected files workspace */}
      {selectedFiles.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div className="flex items-center gap-2.5">
              <h3 className="text-[13px] font-semibold text-ink-900">Archivos listos para procesar</h3>
              <Badge tone="neutral">{selectedFiles.length}</Badge>
              <span className="text-[11px] text-ink-500">
                {mode === 'individual' ? 'Modo individual (1 archivo requerido)' : 'Modo múltiple en lote'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-medium text-ink-500 transition-colors hover:text-red-600"
            >
              Quitar todos
            </button>
          </div>

          {/* Cleaning strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/60 px-5 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-ink-600">
              <Sparkles className="size-3.5 shrink-0 text-signal-600" />
              {describeWorkbenchState(
                mode,
                configuredFilesCount,
                primaryFile,
                primaryRulesSummary
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCleaningTargetFile(primaryFile)}
              disabled={!primaryFile}
            >
              Configurar reglas de limpieza
            </Button>
          </div>

          {isIndividualModeOvercrowded && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Info className="size-4 shrink-0 text-amber-600" />
                <span>
                  El modo Individual procesa exactamente un CSV a la vez. Conserva solo uno o cambia
                  a modo Múltiple.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedFiles([selectedFiles[0]])}
                >
                  Conservar primero
                </Button>
                <Button variant="primary" size="sm" onClick={() => setMode('multiple')}>
                  Cambiar a Múltiple
                </Button>
              </div>
            </div>
          )}

          <div className="divide-y divide-line">
            {selectedFiles.map((file) => {
              const fileRules = rulesFor(file)
              const fileRuleCount = describeCleaningRules(fileRules).length
              return (
                <div
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-paper/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-ink-500">
                      <FileText className="size-4" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-ink-900">{file.name}</p>
                        {fileRuleCount > 0 && (
                          <Badge tone="signal">
                            <Sparkles className="size-2.5" />
                            {fileRuleCount} regla{fileRuleCount === 1 ? '' : 's'}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate font-mono text-[10.5px] text-ink-500" title={file.path}>
                        {formatFileSize(file.size)} · {file.path}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Reglas de limpieza"
                      aria-label={`Reglas de limpieza de ${file.name}`}
                      onClick={() => setCleaningTargetFile(file)}
                    >
                      <Sparkles className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Ver vista previa del CSV"
                      aria-label={`Vista previa de ${file.name}`}
                      onClick={() => setPreviewTargetFile(file)}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Quitar archivo"
                      aria-label={`Quitar ${file.name}`}
                      onClick={() => handleRemoveFile(file.id)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Export form */}
          <div className="grid grid-cols-1 gap-4 border-t border-line bg-paper/40 px-5 py-4 lg:grid-cols-[1fr_1.1fr_auto] lg:items-end">
            <div>
              <Label htmlFor="output-filename">
                {mode === 'individual'
                  ? 'Nombre del archivo Excel (sin ruta)'
                  : 'Nombre base de los archivos Excel'}
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="output-filename"
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  placeholder="ej. reporte_clientes"
                />
                <span className="font-mono text-[11px] text-ink-500">.xlsx</span>
              </div>
              {mode === 'multiple' && (
                <p className="mt-1 text-[10.5px] text-ink-500">
                  Se agregará un sufijo distintivo por archivo.
                </p>
              )}
            </div>

            <div>
              <span className="text-xs font-medium text-ink-700">Se guardará en</span>
              <div className="mt-1 flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3">
                <FolderOpen className="size-3.5 shrink-0 text-ink-500" />
                <span className="truncate font-mono text-[11px] text-ink-600" title={exportPath}>
                  {exportPath || 'Sin carpeta configurada'}
                </span>
              </div>
            </div>

            <Button variant="primary" size="lg" disabled={!canProcess} className="gap-2">
              <Play className="fill-current" />
              Procesar y Exportar
              <ArrowRight className="opacity-70" />
            </Button>
          </div>
        </div>
      )}

      {cleaningTargetFile && (
        <CleaningConfigModal
          filePath={cleaningTargetFile.path}
          fileName={cleaningTargetFile.name}
          activeRules={rulesFor(cleaningTargetFile)}
          statuses={statuses}
          onApplyRules={(rules) =>
            setRulesByFile((prev) => ({ ...prev, [cleaningTargetFile.path]: rules }))
          }
          onResetRules={() =>
            setRulesByFile((prev) => {
              const next = { ...prev }
              delete next[cleaningTargetFile.path]
              return next
            })
          }
          onClose={() => setCleaningTargetFile(null)}
        />
      )}

      {previewTargetFile && (
        <CsvPreviewModal
          filePath={previewTargetFile.path}
          fileName={previewTargetFile.name}
          onClose={() => setPreviewTargetFile(null)}
        />
      )}

      {pendingMultipleFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/45 p-4">
          <div className="animate-rise w-full max-w-md space-y-4 rounded-xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Info className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink-900">
                  Selección múltiple en modo Individual
                </h3>
                <p className="mt-1 text-xs leading-5 text-ink-500">
                  Has seleccionado {pendingMultipleFiles.length} archivos CSV. El modo Individual
                  procesa exactamente uno a la vez.
                </p>
              </div>
            </div>

            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-line bg-paper p-3 text-xs text-ink-700">
              {pendingMultipleFiles.map((file, index) => (
                <div key={file.id} className="truncate">
                  <span className="mr-1.5 font-mono text-[10px] text-ink-500">{index + 1}.</span>
                  {file.name}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={handleKeepFirstOnly}>
                Conservar solo el primero
              </Button>
              <Button variant="primary" onClick={handleSwitchToMultiple}>
                Cambiar a modo Múltiple
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function describeWorkbenchState(
  mode: ProcessMode,
  configuredFilesCount: number,
  primaryFile: SelectedCsvFile | undefined,
  primaryRulesSummary: string[]
): React.ReactNode {
  if (mode === 'individual') {
    if (primaryRulesSummary.length === 0) {
      return 'Sin reglas aplicadas. Puedes filtrar fechas, duplicados y estatus antes de exportar.'
    }
    return (
      <span className="truncate">
        Limpieza activa en {primaryFile?.name}: {primaryRulesSummary.join(' · ')}
      </span>
    )
  }

  if (configuredFilesCount === 0) {
    return 'Cada archivo conserva sus propias reglas de limpieza. Configúralas por archivo.'
  }

  return `${configuredFilesCount} archivo(s) con reglas configuradas.`
}
