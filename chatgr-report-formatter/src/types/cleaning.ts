export interface DateFilterRule {
  column: string
  startDate?: string
  endDate?: string
}

export interface DeduplicationRule {
  columns: string[]
  keep: 'first' | 'last'
}

export interface CleaningRules {
  dateFilter?: DateFilterRule
  deduplication?: DeduplicationRule
  excludeEmptyRows: boolean
  excludedStatuses: string[]
  normalizeWhitespace: boolean
}

export interface CleaningSummary {
  totalRows: number
  keptRows: number
  excludedTotal: number
  excludedByDate: number
  excludedByDuplicates: number
  excludedByEmpty: number
  excludedByStatus: number
  sampleCleanedRows: string[][]
  headers: string[]
}
