import React, { useState } from 'react'
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
} from 'lucide-react'
import type { SelectedCsvFile } from '../../../types/csv'
import type { CleaningRules } from '../../../types/cleaning'
import { pickCsvFilesDialog, validateCsvFileApi } from '../../../lib/tauri'
import { CsvPreviewModal } from './CsvPreviewModal'
import { CleaningConfigModal } from './CleaningConfigModal'

export type ProcessMode = 'individual' | 'multiple'

interface HomeScreenProps {
  exportPath: string
  onOpenSettings: () => void
  initialFile?: {
    path: string
    name: string
    size: number
  } | null
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  exportPath,
  onOpenSettings,
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

  // Pending multiple files resolution dialog when in individual mode
  const [pendingMultipleFiles, setPendingMultipleFiles] = useState<SelectedCsvFile[] | null>(null)
  const [previewTargetFile, setPreviewTargetFile] = useState<SelectedCsvFile | null>(null)

  // Cleaning rules state
  const [isCleaningModalOpen, setIsCleaningModalOpen] = useState(false)
  const [cleaningRules, setCleaningRules] = useState<CleaningRules>({
    excludeEmptyRows: true,
    normalizeWhitespace: true,
    excludedStatuses: [],
  })

  const processAndAddFilePaths = async (paths: string[]) => {
    setErrorMessage(null)
    const validatedFiles: SelectedCsvFile[] = []

    for (const path of paths) {
      try {
        const meta = await validateCsvFileApi(path)
        validatedFiles.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          path: meta.path,
          name: meta.fileName,
          size: meta.fileSize,
        })
      } catch (err: any) {
        setErrorMessage(typeof err === 'string' ? err : err?.message || 'Error al validar el archivo CSV.')
      }
    }

    if (validatedFiles.length === 0) return

    // Auto-derive output filename if single file
    if (validatedFiles.length > 0) {
      const base = validatedFiles[0].name.replace(/\.csv$/i, '')
      setOutputFileName(`reporte_${base}`)
    }

    if (mode === 'individual') {
      if (validatedFiles.length === 1 && selectedFiles.length === 0) {
        setSelectedFiles(validatedFiles)
      } else {
        // More than 1 file dropped/selected while in Individual mode
        const allCandidates = [...selectedFiles, ...validatedFiles]
        setPendingMultipleFiles(allCandidates)
      }
    } else {
      // Multiple mode: append unique by path
      setSelectedFiles((prev) => {
        const existingPaths = new Set(prev.map((f) => f.path))
        const newOnes = validatedFiles.filter((f) => !existingPaths.has(f.path))
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
      // In web/desktop, file objects may have path (Electron/Tauri) or name
      const paths = files.map((f: any) => f.path || f.name)
      await processAndAddFilePaths(paths)
    }
  }

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id))
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

  // Conflict resolution handlers for multiple files in individual mode
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
  const canProcess = selectedFiles.length > 0 && !isIndividualModeOvercrowded && outputFileName.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Mode Selector and Folder Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mode Card */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <label className="text-xs font-semibold text-slate-600 block mb-2">
            Modo de procesamiento
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('individual')
                if (selectedFiles.length > 1) {
                  setPendingMultipleFiles(selectedFiles)
                }
              }}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                mode === 'individual'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-md ${
                  mode === 'individual' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Individual (Predeterminado)</p>
                <p className="text-xs text-slate-500">Un CSV a la vez con reporte detallado</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('multiple')}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                mode === 'multiple'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-md ${
                  mode === 'multiple' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Múltiple en lote</p>
                <p className="text-xs text-slate-500">Un XLSX independiente por cada CSV</p>
              </div>
            </button>
          </div>
        </div>

        {/* Export Folder Summary Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-600 block mb-1">
              Carpeta de destino activa
            </span>
            <p className="text-xs text-slate-500 break-all leading-relaxed">
              {exportPath || 'No definida'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Cambiar carpeta en Configuración
          </button>
        </div>
      </div>

      {/* Error Message Toast / Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Drag & Drop Import Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
          <UploadCloud className="h-7 w-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          Arrastra tu archivo CSV aquí
        </h3>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
          Acepta archivos exportados desde CRM en formato .csv con codificación UTF-8.
        </p>

        <button
          type="button"
          onClick={handlePickFiles}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <FolderOpen className="h-4 w-4" />
          {mode === 'individual' ? 'Seleccionar archivo CSV' : 'Seleccionar archivos CSV'}
        </button>
      </div>

      {/* Selected Files List and Export Form */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-800">
                Archivos listos para procesar ({selectedFiles.length})
              </h4>
              <span className="text-xs text-slate-500">
                • {mode === 'individual' ? 'Modo individual (1 archivo requerido)' : 'Modo múltiple en lote'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-slate-400 hover:text-red-600 transition-colors"
            >
              Quitar todos
            </button>
          </div>

          {/* Cleaning Rules Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {cleaningRules.dateFilter || cleaningRules.deduplication || cleaningRules.excludedStatuses.length > 0
                  ? 'Limpieza activa: ' +
                    [
                      cleaningRules.dateFilter ? 'Filtro de fecha' : '',
                      cleaningRules.deduplication ? 'Deduplicación' : '',
                      cleaningRules.excludedStatuses.length > 0 ? `${cleaningRules.excludedStatuses.length} estatus excluidos` : '',
                    ]
                      .filter(Boolean)
                      .join(', ')
                  : 'Saneamiento predeterminado: recortar espacios y descartar filas vacías.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCleaningModalOpen(true)}
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Configurar reglas de limpieza
            </button>
          </div>

          {/* Warning if individual mode has multiple files */}
          {isIndividualModeOvercrowded && (
            <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  El modo Individual procesa exactamente un CSV a la vez. Conserva solo uno o cambia a modo Múltiple.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedFiles([selectedFiles[0]])}
                  className="px-2.5 py-1 bg-white border border-amber-300 rounded-md font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Conservar primero
                </button>
                <button
                  type="button"
                  onClick={() => setMode('multiple')}
                  className="px-2.5 py-1 bg-amber-600 text-white rounded-md font-semibold hover:bg-amber-700"
                >
                  Cambiar a Múltiple
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {selectedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-slate-800 truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {formatFileSize(file.size)} • {file.path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewTargetFile(file)}
                    className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                    title="Ver vista previa del CSV"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Quitar archivo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Export File Name Configuration */}
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
            <div className="w-full md:w-96">
              <label
                htmlFor="output-filename"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {mode === 'individual'
                  ? 'Nombre del archivo Excel de salida (sin ruta)'
                  : 'Nombre base de los archivos Excel (se agregará sufijo distintivo)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="output-filename"
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-hidden"
                  placeholder="ej. reporte_clientes"
                />
                <span className="text-xs font-medium text-slate-500">.xlsx</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!canProcess}
              className={`w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors ${
                canProcess
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
              }`}
            >
              <Play className="h-4 w-4 fill-white" />
              Procesar y Exportar
            </button>
          </div>
        </div>
      )}

      {/* Cleaning Config Modal */}
      {isCleaningModalOpen && selectedFiles.length > 0 && (
        <CleaningConfigModal
          filePath={selectedFiles[0].path}
          fileName={selectedFiles[0].name}
          activeRules={cleaningRules}
          onApplyRules={setCleaningRules}
          onClose={() => setIsCleaningModalOpen(false)}
        />
      )}

      {/* Preview Modal */}
      {previewTargetFile && (
        <CsvPreviewModal
          filePath={previewTargetFile.path}
          fileName={previewTargetFile.name}
          onClose={() => setPreviewTargetFile(null)}
        />
      )}

      {/* Multiple Files Resolution Modal */}
      {pendingMultipleFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 shrink-0">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Selección múltiple en modo Individual
                </h3>
                <p className="text-xs text-slate-500">
                  Has seleccionado {pendingMultipleFiles.length} archivos CSV. El modo Individual procesa exactamente uno a la vez.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 max-h-36 overflow-y-auto space-y-1 border border-slate-100">
              {pendingMultipleFiles.map((f, i) => (
                <div key={f.id} className="truncate">
                  {i + 1}. {f.name}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleKeepFirstOnly}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Conservar solo el primero
              </button>
              <button
                type="button"
                onClick={handleSwitchToMultiple}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Cambiar a modo Múltiple
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
