export interface SourceFileItem {
  id: string
  sourceRoute: string
  originalFileName: string
  alias?: string | null
  addedAt: string
  lastSeenAt?: string | null
  fileSize?: number | null
  modifiedAt?: string | null
  isAvailable: boolean
}
