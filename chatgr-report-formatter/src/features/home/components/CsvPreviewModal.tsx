import React, { useState, useEffect } from 'react'
import type { CsvPreviewData } from '../../../types/csv'
import { getCsvPreviewApi } from '../../../lib/tauri'
import {
  X,
  FileSpreadsheet,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'

interface CsvPreviewModalProps {
  filePath: string
  fileName: string
  onClose: () => void
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

  const loadPreview = async (delim?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCsvPreviewApi(filePath, delim, 100)
      setPreviewData(data)
      setCurrentDelimiter(data.delimiter)
      setPage(1)
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err?.message || 'Error al generar vista previa.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreview()
  }, [filePath])

  const handleDelimiterChange = (newDelim: string) => {
    setCurrentDelimiter(newDelim)
    loadPreview(newDelim)
  }

  const delimiterLabels: Record<string, string> = {
    ',': 'Coma (,)',
    ';': 'Punto y coma (;)',
    '\t': 'Tabulador (\\t)',
    '|': 'Barra (|)',
  }

  const rows = previewData?.rows || []
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 font-sans text-slate-900">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                Vista previa: <span className="font-mono text-emerald-700">{fileName}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {previewData
                  ? `${previewData.totalRows} filas detectadas en total (mostrando muestra de ${rows.length})`
                  : 'Cargando archivo...'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Cerrar vista previa"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Toolbar: Delimiter Selector & Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-2.5 bg-white text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Delimitador:
            </span>
            <div className="flex items-center gap-1">
              {Object.entries(delimiterLabels).map(([delim, label]) => (
                <button
                  key={delim}
                  type="button"
                  onClick={() => handleDelimiterChange(delim)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    currentDelimiter === delim
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {previewData && (
            <span className="text-xs text-slate-500 font-mono">
              {previewData.headers.length} columnas reconocidas
            </span>
          )}
        </div>

        {/* Warnings Banner if any */}
        {previewData && previewData.warnings.length > 0 && (
          <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Avisos de procesamiento:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 pl-1">
              {previewData.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          {loading && (
            <div className="flex h-full items-center justify-center text-xs text-slate-500 font-medium">
              Procesando y extrayendo vista previa...
            </div>
          )}

          {error && (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
              <p className="text-sm font-semibold text-red-800">No se pudo leer el archivo CSV</p>
              <p className="text-xs text-red-600 max-w-md mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && previewData && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 select-none">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold text-slate-400 w-12 text-center">
                        #
                      </th>
                      {previewData.headers.map((h, i) => (
                        <th
                          key={i}
                          className="py-2.5 px-3 font-semibold whitespace-nowrap border-r border-slate-200/60 last:border-r-0"
                        >
                          {h || <span className="italic text-slate-400">Sin encabezado</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {paginatedRows.map((row, rowIdx) => {
                      const actualIndex = (page - 1) * pageSize + rowIdx + 1
                      return (
                        <tr key={rowIdx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-center text-slate-400 select-none bg-slate-50/30">
                            {actualIndex}
                          </td>
                          {previewData.headers.map((_, colIdx) => (
                            <td
                              key={colIdx}
                              className="py-2 px-3 whitespace-nowrap border-r border-slate-100 last:border-r-0 text-slate-700 truncate max-w-xs"
                              title={row[colIdx] || ''}
                            >
                              {row[colIdx] ?? (
                                <span className="italic text-slate-300">vacío</span>
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
                          className="py-8 text-center text-slate-400 font-sans"
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

        {/* Footer with Pagination Controls */}
        <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-white text-xs">
          <span className="text-slate-500">
            Página {page} de {totalPages} ({rows.length} filas en muestra)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
