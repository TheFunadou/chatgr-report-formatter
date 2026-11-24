import React, { useEffect, useState } from 'react'
import type { CsvPreviewData } from '../../../types/csv'
import { getCsvPreviewApi } from '../../../lib/tauri'
import {
  X,
  FileSpreadsheet,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { cn } from '../../../lib/utils'

interface CsvPreviewModalProps {
  filePath: string
  fileName: string
  onClose: () => void
}

const DELIMITER_LABELS: Record<string, string> = {
  ',': 'Coma (,)',
  ';': 'Punto y coma (;)',
  '\t': 'Tabulador (\\t)',
  '|': 'Barra (|)',
}

export const CsvPreviewModal: React.FC<CsvPreviewModalProps> = ({
  filePath,
  fileName,
  onClose,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<CsvPreviewData | null>(null)
  const [currentDelimiter, setCurrentDelimiter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadPreview = async (delimiter?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCsvPreviewApi(filePath, delimiter, 100)
      setPreviewData(data)
      setCurrentDelimiter(data.delimiter)
      setPage(1)
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Error al generar la vista previa.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreview()
    // The preview only reloads when the source file changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath])

  const rows = previewData?.rows ?? []
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="full" hideClose className="h-[calc(100vh-3rem)]">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-signal-50 text-signal-700">
              <FileSpreadsheet className="size-[18px]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                Vista previa:
                <span className="truncate font-mono text-[13px] text-signal-700">{fileName}</span>
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {previewData
                  ? `${previewData.totalRows} filas detectadas en total (mostrando muestra de ${rows.length})`
                  : 'Cargando archivo…'}
              </DialogDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Cerrar vista previa"
            aria-label="Cerrar vista previa"
          >
            <X />
          </Button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/50 px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
              <SlidersHorizontal className="size-3.5 text-ink-500" />
              Delimitador
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {Object.entries(DELIMITER_LABELS).map(([delimiter, label]) => (
                <button
                  key={delimiter}
                  type="button"
                  onClick={() => {
                    setCurrentDelimiter(delimiter)
                    loadPreview(delimiter)
                  }}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                    currentDelimiter === delimiter
                      ? 'border-signal-600 bg-signal-600 text-white'
                      : 'border-line bg-surface text-ink-600 hover:border-line-strong'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {previewData && (
            <Badge tone="neutral">{previewData.headers.length} columnas reconocidas</Badge>
          )}
        </div>

        {previewData && previewData.warnings.length > 0 && (
          <div className="space-y-1 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-[11px] leading-4 text-amber-900">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800">
              <AlertTriangle className="size-3.5 shrink-0" />
              Avisos de procesamiento:
            </div>
            <ul className="list-inside list-disc space-y-0.5 pl-1">
              {previewData.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto bg-paper/40 p-5">
          {loading && (
            <div className="flex h-full items-center justify-center gap-2 text-xs font-medium text-ink-500">
              <span className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-signal-600" />
              Extrayendo vista previa…
            </div>
          )}

          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
              <AlertTriangle className="size-8 text-red-500" />
              <p className="text-sm font-semibold text-red-800">No se pudo leer el archivo CSV</p>
              <p className="max-w-md text-xs text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && previewData && (
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 select-none bg-paper">
                    <tr>
                      <th className="w-12 border-b border-line px-3 py-2 text-center text-[10px] font-semibold text-ink-500">
                        #
                      </th>
                      {previewData.headers.map((header, index) => (
                        <th
                          key={index}
                          className="whitespace-nowrap border-b border-l border-line px-3 py-2 text-[11px] font-semibold text-ink-700"
                        >
                          {header || <span className="italic text-ink-500">Sin encabezado</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paginatedRows.map((row, rowIndex) => {
                      const rowNumber = (page - 1) * pageSize + rowIndex + 1
                      return (
                        <tr key={rowIndex} className="transition-colors hover:bg-paper/50">
                          <td className="select-none bg-paper/30 px-3 py-1.5 text-center font-mono text-[10px] text-ink-500">
                            {rowNumber}
                          </td>
                          {previewData.headers.map((_, columnIndex) => (
                            <td
                              key={columnIndex}
                              className="max-w-64 truncate whitespace-nowrap border-l border-line/70 px-3 py-1.5 font-mono text-[11px] text-ink-700"
                              title={row[columnIndex] || ''}
                            >
                              {row[columnIndex] || (
                                <span className="italic text-ink-500/50">vacío</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}

                    {paginatedRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={previewData.headers.length + 1}
                          className="px-3 py-10 text-center text-xs text-ink-500"
                        >
                          No hay filas de datos disponibles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-line bg-surface px-5 py-3 text-[11px] text-ink-500">
          <span className="tnum">
            Página {page} de {totalPages} ({rows.length} filas en muestra)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft />
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Siguiente
              <ChevronRight />
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
