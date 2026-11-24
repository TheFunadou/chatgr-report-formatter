import React, { useState, useEffect } from 'react'
import type { CleaningRules, CleaningSummary } from '../../../types/cleaning'
import { applyCleaningRulesApi, getCsvPreviewApi } from '../../../lib/tauri'
import {
  X,
  Sparkles,
  Calendar,
  CopyX,
  Filter,
  CheckCircle2,
  RotateCcw,
  Play,
} from 'lucide-react'

interface CleaningConfigModalProps {
  filePath: string
  fileName: string
  activeRules: CleaningRules
  onApplyRules: (rules: CleaningRules) => void
  onClose: () => void
}

export const CleaningConfigModal: React.FC<CleaningConfigModalProps> = ({
  filePath,
  fileName,
  activeRules,
  onApplyRules,
  onClose,
}) => {
  const [rules, setRules] = useState<CleaningRules>(activeRules)
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<CleaningSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch available headers from CSV
  useEffect(() => {
    async function fetchHeaders() {
      try {
        const preview = await getCsvPreviewApi(filePath, undefined, 5)
        setHeaders(preview.headers)
        // If no date column selected yet, try to auto-select one containing 'fecha' or 'date'
        if (!rules.dateFilter?.column) {
          const dateCol = preview.headers.find((h) =>
            /fecha|date|creado|created/i.test(h)
          )
          if (dateCol) {
            setRules((prev) => ({
              ...prev,
              dateFilter: {
                column: dateCol,
                startDate: prev.dateFilter?.startDate,
                endDate: prev.dateFilter?.endDate,
              },
            }))
          }
        }
      } catch (err) {
        console.warn('Could not read headers for cleaning modal:', err)
      }
    }
    fetchHeaders()
  }, [filePath])

  const handleSimulate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await applyCleaningRulesApi(filePath, rules)
      setSummary(result)
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err?.message || 'Error al simular reglas de limpieza.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDedupColumn = (col: string) => {
    const current = rules.deduplication?.columns || []
    const updated = current.includes(col)
      ? current.filter((c) => c !== col)
      : [...current, col]

    setRules((prev) => ({
      ...prev,
      deduplication:
        updated.length > 0
          ? { columns: updated, keep: prev.deduplication?.keep || 'first' }
          : undefined,
    }))
  }

  const handleToggleExcludedStatus = (status: string) => {
    const current = rules.excludedStatuses || []
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]

    setRules((prev) => ({
      ...prev,
      excludedStatuses: updated,
    }))
  }

  const handleResetToDefaults = () => {
    const blankRules: CleaningRules = {
      excludeEmptyRows: true,
      normalizeWhitespace: true,
      excludedStatuses: [],
      dateFilter: undefined,
      deduplication: undefined,
    }
    setRules(blankRules)
    setSummary(null)
  }

  const commonStatuses = [
    'sin respuesta',
    'en espera',
    'sin estatus',
    'contactado',
    'cotizado',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 font-sans text-slate-900">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                Limpieza Configurable: <span className="font-mono text-emerald-700">{fileName}</span>
              </h2>
              <p className="text-xs text-slate-500">
                Reglas aplicadas en memoria antes de generar el reporte Excel (el archivo CSV original no se modifica).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Date Filter Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>Filtro por rango de fechas</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Incluye únicamente registros dentro del periodo seleccionado.
              </p>

              <div className="space-y-2 pt-1 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Columna de fecha
                  </label>
                  <select
                    value={rules.dateFilter?.column || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setRules((prev) => ({
                        ...prev,
                        dateFilter: val
                          ? {
                              column: val,
                              startDate: prev.dateFilter?.startDate,
                              endDate: prev.dateFilter?.endDate,
                            }
                          : undefined,
                      }))
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                  >
                    <option value="">Sin filtro de fecha</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {rules.dateFilter?.column && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Desde</label>
                      <input
                        type="date"
                        value={rules.dateFilter?.startDate || ''}
                        onChange={(e) =>
                          setRules((prev) => ({
                            ...prev,
                            dateFilter: {
                              column: prev.dateFilter!.column,
                              startDate: e.target.value || undefined,
                              endDate: prev.dateFilter?.endDate,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Hasta</label>
                      <input
                        type="date"
                        value={rules.dateFilter?.endDate || ''}
                        onChange={(e) =>
                          setRules((prev) => ({
                            ...prev,
                            dateFilter: {
                              column: prev.dateFilter!.column,
                              startDate: prev.dateFilter?.startDate,
                              endDate: e.target.value || undefined,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Deduplication Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                <CopyX className="h-4 w-4 text-emerald-600" />
                <span>Detección y eliminación de duplicados</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Selecciona las columnas para identificar registros repetidos.
              </p>

              <div className="space-y-2 pt-1 text-xs">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Columnas clave
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-slate-100 rounded-lg">
                  {headers.map((h) => {
                    const isSelected = rules.deduplication?.columns.includes(h)
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleToggleDedupColumn(h)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {h}
                      </button>
                    )
                  })}
                </div>

                {rules.deduplication && rules.deduplication.columns.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500">Conservar:</span>
                    <select
                      value={rules.deduplication.keep}
                      onChange={(e) =>
                        setRules((prev) => ({
                          ...prev,
                          deduplication: {
                            columns: prev.deduplication!.columns,
                            keep: e.target.value as 'first' | 'last',
                          },
                        }))
                      }
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 bg-white"
                    >
                      <option value="first">El primer registro</option>
                      <option value="last">El último registro</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Exclude Statuses Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                <Filter className="h-4 w-4 text-emerald-600" />
                <span>Excluir por estatus</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Omite registros que tengan estatus que no aporten valor comercial al reporte.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {commonStatuses.map((st) => {
                  const isExcluded = rules.excludedStatuses.includes(st)
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleToggleExcludedStatus(st)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        isExcluded
                          ? 'bg-red-100 text-red-800 border-red-300 font-semibold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isExcluded ? `✕ Excluir "${st}"` : `+ Excluir "${st}"`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 4. Sanitation and White space */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Saneamiento y formato</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Normalización automática de celdas para evitar errores de cálculo.
              </p>

              <div className="space-y-2 pt-1 text-xs">
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rules.excludeEmptyRows}
                    onChange={(e) =>
                      setRules((prev) => ({
                        ...prev,
                        excludeEmptyRows: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Excluir filas totalmente vacías o en blanco</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rules.normalizeWhitespace}
                    onChange={(e) =>
                      setRules((prev) => ({
                        ...prev,
                        normalizeWhitespace: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Normalizar espacios múltiples y recortar márgenes</span>
                </label>
              </div>
            </div>
          </div>

          {/* Simulation and Summary Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">
                  Simulación de impacto de limpieza
                </h3>
                <p className="text-[11px] text-slate-500">
                  Prueba las reglas en memoria para conocer exactamente cuántas filas se conservarán.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSimulate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                {loading ? 'Calculando...' : 'Simular limpieza'}
              </button>
            </div>

            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[11px] text-slate-500 block">Total original</span>
                  <span className="text-base font-bold text-slate-800">
                    {summary.totalRows}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                  <span className="text-[11px] text-emerald-700 block">Conservadas</span>
                  <span className="text-base font-bold text-emerald-800">
                    {summary.keptRows}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-center">
                  <span className="text-[11px] text-red-700 block">Total excluidas</span>
                  <span className="text-base font-bold text-red-800">
                    {summary.excludedTotal}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[11px] text-slate-500 block">Por fecha/status</span>
                  <span className="text-xs font-bold text-slate-700">
                    {summary.excludedByDate + summary.excludedByStatus}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[11px] text-slate-500 block">Duplicados/vacías</span>
                  <span className="text-xs font-bold text-slate-700">
                    {summary.excludedByDuplicates + summary.excludedByEmpty}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-white text-xs">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-800 font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer reglas originales
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyRules(rules)
                onClose()
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow-xs"
            >
              Aplicar reglas a exportación
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
