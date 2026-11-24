import React, { useEffect, useMemo, useState } from 'react'
import type { DimensionCategory } from '../../../types/dimensions'
import {
  DEFAULT_CLEANING_RULES,
  describeCleaningRules,
  type CleaningRules,
  type CleaningSummary,
} from '../../../types/cleaning'
import { applyCleaningRulesApi, getCsvPreviewApi } from '../../../lib/tauri'
import {
  CalendarDays,
  CopyX,
  Filter,
  Sparkles,
  RotateCcw,
  Play,
  AlertTriangle,
  TableProperties,
  CheckCircle2,
  CircleSlash,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Checkbox } from '../../../components/ui/checkbox'
import { Input, Label, Select } from '../../../components/ui/input'
import { cn } from '../../../lib/utils'

interface CleaningConfigModalProps {
  filePath: string
  fileName: string
  activeRules: CleaningRules
  statuses: DimensionCategory[]
  onApplyRules: (rules: CleaningRules) => void
  onResetRules: () => void
  onClose: () => void
}

export const CleaningConfigModal: React.FC<CleaningConfigModalProps> = ({
  filePath,
  fileName,
  activeRules,
  statuses,
  onApplyRules,
  onResetRules,
  onClose,
}) => {
  const [rules, setRules] = useState<CleaningRules>({ ...DEFAULT_CLEANING_RULES, ...activeRules })
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<CleaningSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchHeaders() {
      try {
        const preview = await getCsvPreviewApi(filePath, undefined, 5)
        if (cancelled) return
        setHeaders(preview.headers)
        if (!activeRules.dateFilter?.column) {
          const dateColumn = preview.headers.find((header) =>
            /fecha|date|creado|created|alta/i.test(header)
          )
          if (dateColumn) {
            setRules((prev) => ({
              ...prev,
              dateFilter: {
                column: dateColumn,
                startDate: prev.dateFilter?.startDate,
                endDate: prev.dateFilter?.endDate,
              },
            }))
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron leer las columnas del archivo CSV.'
          )
        }
      }
    }

    fetchHeaders()
    return () => {
      cancelled = true
    }
  }, [filePath, activeRules.dateFilter?.column])

  const activeStatuses = useMemo(
    () => statuses.filter((status) => status.matchValue?.trim().length > 0),
    [statuses]
  )

  const handleSimulate = async () => {
    if (rules.dateFilter?.startDate && rules.dateFilter?.endDate) {
      if (rules.dateFilter.startDate > rules.dateFilter.endDate) {
        setError('La fecha inicial no puede ser posterior a la fecha final.')
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const result = await applyCleaningRulesApi(filePath, rules)
      setSummary(result)
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Error al simular las reglas de limpieza.'
      )
    } finally {
      setLoading(false)
    }
  }

  const toggleDedupColumn = (column: string) => {
    setRules((prev) => {
      const current = prev.deduplication?.columns ?? []
      const columns = current.includes(column)
        ? current.filter((item) => item !== column)
        : [...current, column]

      return {
        ...prev,
        deduplication:
          columns.length > 0
            ? {
                columns,
                keep: prev.deduplication?.keep ?? 'first',
                ignoreEmptyKeys: prev.deduplication?.ignoreEmptyKeys ?? true,
              }
            : undefined,
      }
    })
  }

  const toggleExcludedStatus = (matchValue: string) => {
    setRules((prev) => {
      const current = prev.excludedStatuses ?? []
      const excludedStatuses = current.includes(matchValue)
        ? current.filter((item) => item !== matchValue)
        : [...current, matchValue]
      return { ...prev, excludedStatuses }
    })
  }

  const handleRestore = () => {
    setRules(DEFAULT_CLEANING_RULES)
    setSummary(null)
    setError(null)
  }

  const activeRuleCount = describeCleaningRules(rules).length
  const statusColumnMissing =
    rules.excludedStatuses.length > 0 &&
    headers.length > 0 &&
    !headers.some((header) => /^(estatus|status)$/i.test(header.trim()))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="full" className="h-[calc(100vh-3rem)]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-signal-50 text-signal-700">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Reglas de limpieza</DialogTitle>
              <DialogDescription className="truncate font-mono">{fileName}</DialogDescription>
            </div>
            <Badge tone={activeRuleCount > 0 ? 'signal' : 'neutral'} className="ml-2">
              {activeRuleCount} regla{activeRuleCount === 1 ? '' : 's'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1.08fr_0.92fr]">
          {/* Rules */}
          <div className="space-y-5 border-line p-5 lg:border-r">
            <p className="text-xs leading-5 text-ink-500">
              Las reglas se aplican en memoria antes de exportar. El archivo CSV original nunca se
              modifica y puedes restaurar los datos originales en cualquier momento.
            </p>

            <section className="space-y-3 rounded-lg border border-line p-3.5">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-signal-600" />
                <h3 className="text-[13px] font-semibold text-ink-900">Rango de fechas</h3>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="cleaning-date-column">Columna de fecha</Label>
                  <Select
                    id="cleaning-date-column"
                    value={rules.dateFilter?.column ?? ''}
                    onChange={(event) => {
                      const column = event.target.value
                      setRules((prev) => ({
                        ...prev,
                        dateFilter: column
                          ? {
                              column,
                              startDate: prev.dateFilter?.startDate,
                              endDate: prev.dateFilter?.endDate,
                            }
                          : undefined,
                      }))
                      setSummary(null)
                    }}
                    className="mt-1"
                  >
                    <option value="">Sin filtro de fecha</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </Select>
                </div>

                {rules.dateFilter?.column && (
                  <>
                    <div>
                      <Label htmlFor="cleaning-start-date">Desde</Label>
                      <Input
                        id="cleaning-start-date"
                        type="date"
                        value={rules.dateFilter.startDate ?? ''}
                        onChange={(event) =>
                          setRules((prev) => ({
                            ...prev,
                            dateFilter: {
                              column: prev.dateFilter!.column,
                              startDate: event.target.value || undefined,
                              endDate: prev.dateFilter?.endDate,
                            },
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cleaning-end-date">Hasta</Label>
                      <Input
                        id="cleaning-end-date"
                        type="date"
                        value={rules.dateFilter.endDate ?? ''}
                        onChange={(event) =>
                          setRules((prev) => ({
                            ...prev,
                            dateFilter: {
                              column: prev.dateFilter!.column,
                              startDate: prev.dateFilter?.startDate,
                              endDate: event.target.value || undefined,
                            },
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="cleaning-invalid-dates">Fechas vacías o no reconocidas</Label>
                      <Select
                        id="cleaning-invalid-dates"
                        value={rules.invalidDatePolicy ?? 'keep'}
                        onChange={(event) =>
                          setRules((prev) => ({
                            ...prev,
                            invalidDatePolicy: event.target.value as 'keep' | 'exclude',
                          }))
                        }
                        className="mt-1"
                      >
                        <option value="keep">Conservar el registro</option>
                        <option value="exclude">Excluir el registro</option>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-line p-3.5">
              <div className="flex items-center gap-2">
                <CopyX className="size-4 text-signal-600" />
                <h3 className="text-[13px] font-semibold text-ink-900">Registros duplicados</h3>
              </div>
              <p className="text-[11px] leading-4 text-ink-500">
                Elige las columnas que identifican un registro único. La comparación ignora
                mayúsculas, espacios y acentos.
              </p>

              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-line p-2">
                {headers.length === 0 && (
                  <span className="text-[11px] text-ink-500">Leyendo columnas…</span>
                )}
                {headers.map((header) => {
                  const isSelected = rules.deduplication?.columns.includes(header) ?? false
                  return (
                    <button
                      key={header}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        toggleDedupColumn(header)
                        setSummary(null)
                      }}
                      className={cn(
                        'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                        isSelected
                          ? 'border-signal-300 bg-signal-50 text-signal-700'
                          : 'border-line bg-surface text-ink-600 hover:border-line-strong'
                      )}
                    >
                      {header}
                    </button>
                  )
                })}
              </div>

              {rules.deduplication && rules.deduplication.columns.length > 0 && (
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <Label htmlFor="dedup-keep">Conservar</Label>
                    <Select
                      id="dedup-keep"
                      value={rules.deduplication.keep}
                      onChange={(event) =>
                        setRules((prev) => ({
                          ...prev,
                          deduplication: {
                            ...prev.deduplication!,
                            keep: event.target.value as 'first' | 'last',
                          },
                        }))
                      }
                      className="mt-1 w-48"
                    >
                      <option value="first">El primer registro</option>
                      <option value="last">El último registro</option>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-ink-600">
                    <Checkbox
                      checked={rules.deduplication.ignoreEmptyKeys ?? true}
                      onCheckedChange={(checked) =>
                        setRules((prev) => ({
                          ...prev,
                          deduplication: {
                            ...prev.deduplication!,
                            ignoreEmptyKeys: checked === true,
                          },
                        }))
                      }
                    />
                    No agrupar claves vacías
                  </label>
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-lg border border-line p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="size-4 text-signal-600" />
                  <h3 className="text-[13px] font-semibold text-ink-900">Excluir por estatus</h3>
                </div>
                {rules.excludedStatuses.length > 0 && (
                  <Badge tone="danger">{rules.excludedStatuses.length} excluidos</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {activeStatuses.map((status) => {
                  const isExcluded = rules.excludedStatuses.includes(status.matchValue)
                  return (
                    <button
                      key={status.id}
                      type="button"
                      aria-pressed={isExcluded}
                      onClick={() => {
                        toggleExcludedStatus(status.matchValue)
                        setSummary(null)
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                        isExcluded
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : 'border-line bg-surface text-ink-600 hover:border-line-strong'
                      )}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: status.colorHex }}
                        aria-hidden="true"
                      />
                      {status.displayName}
                      <span className="font-mono text-[9px] opacity-60">
                        {isExcluded ? '−' : '+'}
                      </span>
                    </button>
                  )
                })}
                {activeStatuses.length === 0 && (
                  <span className="text-[11px] text-ink-500">
                    Configura tus estatus comerciales para filtrarlos aquí.
                  </span>
                )}
              </div>

              {statusColumnMissing && (
                <p className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] leading-4 text-amber-800">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  Este archivo no tiene una columna «estatus». La regla se guardará, pero no se
                  aplicará a este CSV.
                </p>
              )}
            </section>

            <section className="space-y-2.5 rounded-lg border border-line p-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-signal-600" />
                <h3 className="text-[13px] font-semibold text-ink-900">Saneamiento</h3>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-ink-700">
                <Checkbox
                  className="mt-0.5"
                  checked={rules.normalizeWhitespace}
                  onCheckedChange={(checked) => {
                    setRules((prev) => ({ ...prev, normalizeWhitespace: checked === true }))
                    setSummary(null)
                  }}
                />
                <span>
                  Normalizar espacios
                  <span className="block text-[11px] text-ink-500">
                    Recorta márgenes y colapsa espacios repetidos.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-ink-700">
                <Checkbox
                  className="mt-0.5"
                  checked={rules.excludeEmptyRows}
                  onCheckedChange={(checked) => {
                    setRules((prev) => ({ ...prev, excludeEmptyRows: checked === true }))
                    setSummary(null)
                  }}
                />
                <span>
                  Excluir filas vacías
                  <span className="block text-[11px] text-ink-500">
                    Descarta registros sin ningún valor.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-ink-700">
                <Checkbox
                  className="mt-0.5"
                  checked={rules.excludeInvalidRows ?? false}
                  onCheckedChange={(checked) => {
                    setRules((prev) => ({ ...prev, excludeInvalidRows: checked === true }))
                    setSummary(null)
                  }}
                />
                <span>
                  Excluir filas incompletas
                  <span className="block text-[11px] text-ink-500">
                    Filas con menos columnas que el encabezado.
                  </span>
                </span>
              </label>
            </section>
          </div>

          {/* Simulation */}
          <div className="flex min-h-0 flex-col bg-paper/50">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div>
                <h3 className="text-[13px] font-semibold text-ink-900">Impacto de la limpieza</h3>
                <p className="text-[11px] text-ink-500">Simula antes de aplicar los cambios.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleSimulate} disabled={loading}>
                <Play className={loading ? 'animate-pulse' : ''} />
                {loading ? 'Calculando…' : 'Simular'}
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] leading-4 text-red-800">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {!summary && !error && (
                <div className="rounded-lg border border-dashed border-line-strong bg-surface p-6 text-center">
                  <TableProperties className="mx-auto mb-2 size-5 text-ink-500" />
                  <p className="text-xs font-medium text-ink-700">Aún no hay resultados</p>
                  <p className="mt-1 text-[11px] leading-4 text-ink-500">
                    Ejecuta una simulación para conocer cuántas filas se conservan y por qué se
                    excluyen las demás.
                  </p>
                </div>
              )}

              {summary && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="Originales" value={summary.totalRows} />
                    <Stat label="Conservadas" value={summary.keptRows} tone="signal" />
                    <Stat label="Excluidas" value={summary.excludedTotal} tone="danger" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <ReasonRow
                      label="Fechas fuera de rango"
                      value={summary.excludedByDate + summary.excludedByInvalidDate}
                    />
                    <ReasonRow label="Duplicados" value={summary.excludedByDuplicates} />
                    <ReasonRow
                      label="Vacías"
                      value={summary.excludedByEmpty + summary.excludedByInvalid}
                    />
                    <ReasonRow label="Estatus excluido" value={summary.excludedByStatus} />
                  </div>

                  {summary.warnings.length > 0 && (
                    <div className="space-y-1.5">
                      {summary.warnings.map((warning) => (
                        <p
                          key={warning}
                          className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] leading-4 text-amber-800"
                        >
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-[11px] font-semibold text-ink-700">Filas excluidas</h4>
                    {summary.excludedSamples.length === 0 ? (
                      <p className="flex items-center gap-1.5 text-[11px] text-ink-500">
                        <CircleSlash className="size-3.5" />
                        Ninguna fila fue excluida.
                      </p>
                    ) : (
                      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                        {summary.excludedSamples.slice(0, 6).map((row) => (
                          <li key={row.rowNumber} className="flex items-start gap-2 px-2.5 py-2">
                            <span className="font-mono text-[10px] text-ink-500">
                              #{row.rowNumber}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-ink-700">{row.reason}</p>
                              <p className="truncate font-mono text-[10px] text-ink-500">
                                {row.values.filter(Boolean).slice(0, 3).join(' · ') || '—'}
                              </p>
                            </div>
                          </li>
                        ))}
                        {summary.excludedSamples.length > 6 && (
                          <li className="px-2.5 py-1.5 text-[10px] text-ink-500">
                            +{summary.excludedSamples.length - 6} fila(s) más
                          </li>
                        )}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[11px] font-semibold text-ink-700">
                      Vista previa de filas conservadas
                    </h4>
                    <div className="max-h-56 overflow-auto rounded-lg border border-line bg-surface">
                      <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 bg-paper">
                          <tr>
                            {summary.headers.map((header) => (
                              <th
                                key={header}
                                className="whitespace-nowrap border-b border-line px-2 py-1.5 text-[10px] font-semibold text-ink-600"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {summary.sampleCleanedRows.slice(0, 8).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-line/60 last:border-0">
                              {summary.headers.map((_, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="max-w-40 truncate px-2 py-1.5 text-[10.5px] text-ink-700"
                                >
                                  {row[cellIndex] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {summary.sampleCleanedRows.length === 0 && (
                        <p className="px-2.5 py-3 text-[11px] text-ink-500">
                          No quedaron filas con las reglas actuales.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRestore}>
              <RotateCcw />
              Restablecer reglas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onResetRules()
                onClose()
              }}
            >
              <CircleSlash />
              Restaurar datos originales
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onApplyRules(rules)
                onClose()
              }}
            >
              <CheckCircle2 />
              Aplicar reglas
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const Stat: React.FC<{ label: string; value: number; tone?: 'signal' | 'danger' }> = ({
  label,
  value,
  tone,
}) => (
  <div
    className={cn(
      'rounded-lg border px-2.5 py-2',
      tone === 'signal'
        ? 'border-signal-200 bg-signal-50'
        : tone === 'danger'
          ? 'border-red-200 bg-red-50'
          : 'border-line bg-surface'
    )}
  >
    <span className="block text-[10px] font-medium text-ink-500">{label}</span>
    <span
      className={cn(
        'tnum block text-lg font-semibold leading-6',
        tone === 'signal'
          ? 'text-signal-700'
          : tone === 'danger'
            ? 'text-red-700'
            : 'text-ink-900'
      )}
    >
      {value}
    </span>
  </div>
)

const ReasonRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-md border border-line bg-surface px-2.5 py-1.5">
    <span className="text-[10.5px] text-ink-600">{label}</span>
    <span className="tnum text-[11px] font-semibold text-ink-800">{value}</span>
  </div>
)
