export type DimensionType = 'status' | 'priority' | 'source' | 'medium'

export interface DimensionCategory {
  id: string
  dimension: DimensionType
  matchValue: string
  displayName: string
  colorHex: string
  isConversion?: boolean
  sortOrder: number
  isSystemDefault?: boolean
}

export interface AppSettings {
  defaultExportPath: string
  onboardingCompleted: boolean
}
