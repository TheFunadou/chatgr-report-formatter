export interface CsvFileMetadata {
  path: string
  fileName: string
  fileSize: number
}

export interface SelectedCsvFile {
  id: string
  path: string
  name: string
  size: number
}

export interface CsvPreviewData {
  path: string
  fileName: string
  delimiter: string
  headers: string[]
  rows: string[][]
  totalRows: number
  warnings: string[]
}
