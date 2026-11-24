export type InvalidDatePolicy = 'keep' | 'exclude'

export interface DateFilterRule {
  column: string
  startDate?: string
  endDate?: string
}

export interface DeduplicationRule {
  columns: string[]
  keep: 'first' | 'last'
  ignoreEmptyKeys?: boolean
}

export interface CleaningRules {
  dateFilter?: DateFilterRule
  deduplication?: DeduplicationRule
  excludeEmptyRows: boolean
  excludeInvalidRows?: boolean
  excludedStatuses: string[]
  normalizeWhitespace: boolean
  invalidDatePolicy?: InvalidDatePolicy
}

export interface ExcludedRow {
  rowNumber: number
  values: string[]
  reason: string
}

export interface CleaningSummary {
  totalRows: number
  keptRows: number
  excludedTotal: number
  excludedByDate: number
  excludedByInvalidDate: number
  excludedByDuplicates: number
  excludedByEmpty: number
  excludedByInvalid: number
  excludedByStatus: number
  invalidDates: number
  sampleCleanedRows: string[][]
  excludedSamples: ExcludedRow[]
  warnings: string[]
  headers: string[]
}

export const DEFAULT_CLEANING_RULES: CleaningRules = {
  excludeEmptyRows: true,
  excludeInvalidRows: true,
  excludedStatuses: [],
  normalizeWhitespace: true,
  invalidDatePolicy: 'keep',
}

export function countActiveCleaningRules(rules: CleaningRules): number {
  let count = 0
  if (rules.dateFilter?.column) count += 1
  if (rules.deduplication && rules.deduplication.columns.length > 0) count += 1
  if (rules.excludedStatuses.length > 0) count += 1
  if (rules.excludeEmptyRows) count += 1
  if (rules.excludeInvalidRows) count += 1
  if (rules.normalizeWhitespace) count += 1
  return count
}

export function describeCleaningRules(rules: CleaningRules): string[] {
  const parts: string[] = []
  if (rules.normalizeWhitespace) parts.push('Espacios normalizados')
  if (rules.excludeEmptyRows) parts.push('Filas vacías fuera')
  if (rules.excludeInvalidRows) parts.push('Filas incompletas fuera')
  if (rules.dateFilter?.column) {
    const { startDate, endDate } = rules.dateFilter
    if (startDate && endDate) parts.push(`Fechas ${startDate} a ${endDate}`)
    else if (startDate) parts.push(`Desde ${startDate}`)
    else if (endDate) parts.push(`Hasta ${endDate}`)
    else parts.push(`Filtro en «${rules.dateFilter.column}»`)
  }
  if (rules.deduplication && rules.deduplication.columns.length > 0) {
    parts.push(`Duplicados por ${rules.deduplication.columns.join(', ')}`)
  }
  if (rules.excludedStatuses.length > 0) {
    parts.push(`${rules.excludedStatuses.length} estatus excluido(s)`)
  }
  return parts
}
