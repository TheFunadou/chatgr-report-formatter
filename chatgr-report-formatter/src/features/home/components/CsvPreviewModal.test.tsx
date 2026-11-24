import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CsvPreviewModal } from './CsvPreviewModal'
import { registerMockCommand, clearMockCommands } from '../../../lib/tauri'

describe('CsvPreviewModal', () => {
  beforeEach(() => {
    clearMockCommands()
  })

  it('loads and displays CSV headers and rows', async () => {
    registerMockCommand('get_csv_preview', () => ({
      path: 'C:/Datos/leads.csv',
      fileName: 'leads.csv',
      delimiter: ',',
      headers: ['nombre', 'telefono', 'estatus'],
      rows: [
        ['Juan Perez', '+5215500000000', 'compra'],
        ['Maria Lopez', '018001234567', 'nuevo'],
      ],
      totalRows: 2,
      warnings: [],
    }))

    render(
      <CsvPreviewModal
        filePath="C:/Datos/leads.csv"
        fileName="leads.csv"
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('leads.csv')).toBeInTheDocument()
    })

    expect(screen.getByText('nombre')).toBeInTheDocument()
    expect(screen.getByText('telefono')).toBeInTheDocument()
    expect(screen.getByText('estatus')).toBeInTheDocument()
    expect(screen.getByText('Juan Perez')).toBeInTheDocument()
    expect(screen.getByText('+5215500000000')).toBeInTheDocument()
    expect(screen.getByText('018001234567')).toBeInTheDocument()
    expect(screen.getByText(/2 filas detectadas en total/i)).toBeInTheDocument()
  })

  it('allows switching delimiter and refetches preview', async () => {
    let invokedDelimiter: string | undefined = undefined

    registerMockCommand('get_csv_preview', (args: any) => {
      invokedDelimiter = args?.delimiter
      return {
        path: args.path,
        fileName: 'leads.csv',
        delimiter: args.delimiter || ';',
        headers: ['cliente', 'valor'],
        rows: [['Carlos', '1500']],
        totalRows: 1,
        warnings: [],
      }
    })

    render(
      <CsvPreviewModal
        filePath="C:/Datos/leads.csv"
        fileName="leads.csv"
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('cliente')).toBeInTheDocument()
    })

    // Click on Tabulador (\t)
    fireEvent.click(screen.getByRole('button', { name: /Tabulador/i }))

    await waitFor(() => {
      expect(invokedDelimiter).toBe('\t')
    })
  })

  it('displays processing warnings when present', async () => {
    registerMockCommand('get_csv_preview', () => ({
      path: 'C:/Datos/leads.csv',
      fileName: 'leads.csv',
      delimiter: ',',
      headers: ['id', 'valor'],
      rows: [['1', '100']],
      totalRows: 1,
      warnings: ['Delimitador detectado automáticamente: coma (,)', 'Fila 2 incompleta'],
    }))

    render(
      <CsvPreviewModal
        filePath="C:/Datos/leads.csv"
        fileName="leads.csv"
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Avisos de procesamiento:/i)).toBeInTheDocument()
      expect(screen.getByText(/Fila 2 incompleta/i)).toBeInTheDocument()
    })
  })

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn()

    registerMockCommand('get_csv_preview', () => ({
      path: 'C:/Datos/leads.csv',
      fileName: 'leads.csv',
      delimiter: ',',
      headers: ['col1'],
      rows: [],
      totalRows: 0,
      warnings: [],
    }))

    render(
      <CsvPreviewModal
        filePath="C:/Datos/leads.csv"
        fileName="leads.csv"
        onClose={handleClose}
      />
    )

    await waitFor(() => {
      expect(screen.getByTitle('Cerrar vista previa')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Cerrar vista previa'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
