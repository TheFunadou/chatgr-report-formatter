import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HomeScreen } from './HomeScreen'
import { registerMockCommand, clearMockCommands } from '../../../lib/tauri'

describe('HomeScreen (Phase 4 Import and Modes)', () => {
  beforeEach(() => {
    clearMockCommands()
  })

  it('renders default Individual mode and dropzone', () => {
    render(<HomeScreen exportPath="C:/Reportes_CRM" onOpenSettings={vi.fn()} />)

    expect(screen.getByText(/Individual \(Predeterminado\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Múltiple en lote/i)).toBeInTheDocument()
    expect(screen.getByText(/Arrastra tu archivo CSV aquí/i)).toBeInTheDocument()
    expect(screen.getByText('C:/Reportes_CRM')).toBeInTheDocument()
  })

  it('selects a valid CSV file via dialog and derives output name', async () => {
    registerMockCommand('pick_csv_files_dialog', () => [
      'C:/Datos/ventas_noviembre.csv',
    ])

    registerMockCommand('validate_csv_file', (args: any) => ({
      path: args.path,
      fileName: 'ventas_noviembre.csv',
      fileSize: 1048576, // 1 MB
    }))

    render(<HomeScreen exportPath="C:/Reportes_CRM" onOpenSettings={vi.fn()} />)

    const selectBtn = screen.getByRole('button', { name: /Seleccionar archivo CSV/i })
    fireEvent.click(selectBtn)

    await waitFor(() => {
      expect(screen.getByText('ventas_noviembre.csv')).toBeInTheDocument()
    })

    expect(screen.getByText(/1.0 MB/i)).toBeInTheDocument()
    // Derived name input check
    const nameInput = screen.getByDisplayValue('reporte_ventas_noviembre')
    expect(nameInput).toBeInTheDocument()

    // Process button enabled
    const processBtn = screen.getByRole('button', { name: /Procesar y Exportar/i })
    expect(processBtn).not.toBeDisabled()
  })

  it('shows resolution dialog when multiple files are selected in Individual mode', async () => {
    registerMockCommand('pick_csv_files_dialog', () => [
      'C:/Datos/leads_1.csv',
      'C:/Datos/leads_2.csv',
    ])

    registerMockCommand('validate_csv_file', (args: any) => ({
      path: args.path,
      fileName: args.path.split('/').pop(),
      fileSize: 2048,
    }))

    render(<HomeScreen exportPath="C:/Reportes_CRM" onOpenSettings={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Seleccionar archivo CSV/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Selección múltiple en modo Individual/i)
      ).toBeInTheDocument()
    })

    // Test choice: "Conservar solo el primero"
    fireEvent.click(screen.getByRole('button', { name: /Conservar solo el primero/i }))

    expect(
      screen.queryByText(/Selección múltiple en modo Individual/i)
    ).not.toBeInTheDocument()
    expect(screen.getByText('leads_1.csv')).toBeInTheDocument()
    expect(screen.queryByText('leads_2.csv')).not.toBeInTheDocument()
  })

  it('switches to Multiple mode from the resolution dialog', async () => {
    registerMockCommand('pick_csv_files_dialog', () => [
      'C:/Datos/leads_1.csv',
      'C:/Datos/leads_2.csv',
    ])

    registerMockCommand('validate_csv_file', (args: any) => ({
      path: args.path,
      fileName: args.path.split('/').pop(),
      fileSize: 2048,
    }))

    render(<HomeScreen exportPath="C:/Reportes_CRM" onOpenSettings={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Seleccionar archivo CSV/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Selección múltiple en modo Individual/i)
      ).toBeInTheDocument()
    })

    // Click "Cambiar a modo Múltiple"
    fireEvent.click(screen.getByRole('button', { name: /Cambiar a modo Múltiple/i }))

    expect(screen.getByText('leads_1.csv')).toBeInTheDocument()
    expect(screen.getByText('leads_2.csv')).toBeInTheDocument()
    expect(screen.getByText(/Modo múltiple en lote/i)).toBeInTheDocument()
  })

  it('removes files individually and allows clearing all', async () => {
    registerMockCommand('pick_csv_files_dialog', () => [
      'C:/Datos/archivo_a.csv',
      'C:/Datos/archivo_b.csv',
    ])

    registerMockCommand('validate_csv_file', (args: any) => ({
      path: args.path,
      fileName: args.path.split('/').pop(),
      fileSize: 1024,
    }))

    render(<HomeScreen exportPath="C:/Reportes_CRM" onOpenSettings={vi.fn()} />)

    // Switch to multiple mode first
    fireEvent.click(screen.getByRole('button', { name: /Múltiple en lote/i }))

    fireEvent.click(screen.getByRole('button', { name: /Seleccionar archivos CSV/i }))

    await waitFor(() => {
      expect(screen.getByText('archivo_a.csv')).toBeInTheDocument()
      expect(screen.getByText('archivo_b.csv')).toBeInTheDocument()
    })

    // Remove first file
    const removeButtons = screen.getAllByTitle('Quitar archivo')
    fireEvent.click(removeButtons[0])

    expect(screen.queryByText('archivo_a.csv')).not.toBeInTheDocument()
    expect(screen.getByText('archivo_b.csv')).toBeInTheDocument()

    // Clear all
    fireEvent.click(screen.getByRole('button', { name: /Quitar todos/i }))
    expect(screen.queryByText('archivo_b.csv')).not.toBeInTheDocument()
  })

  it('configures cleaning rules per file and keeps them in session', async () => {
    registerMockCommand('pick_csv_files_dialog', () => ['C:/Datos/leads.csv'])
    registerMockCommand('validate_csv_file', (args: any) => ({
      path: args.path,
      fileName: 'leads.csv',
      fileSize: 2048,
    }))
    registerMockCommand('get_csv_preview', () => ({
      path: 'C:/Datos/leads.csv',
      fileName: 'leads.csv',
      delimiter: ',',
      headers: ['nombre', 'estatus'],
      rows: [['Juan', 'nuevo']],
      totalRows: 1,
      warnings: [],
    }))
    registerMockCommand('apply_cleaning_rules', () => ({
      totalRows: 1,
      keptRows: 1,
      excludedTotal: 0,
      excludedByDate: 0,
      excludedByInvalidDate: 0,
      excludedByDuplicates: 0,
      excludedByEmpty: 0,
      excludedByInvalid: 0,
      excludedByStatus: 0,
      invalidDates: 0,
      sampleCleanedRows: [['Juan', 'nuevo']],
      excludedSamples: [],
      warnings: [],
      headers: ['nombre', 'estatus'],
    }))

    render(
      <HomeScreen
        exportPath="C:/Reportes_CRM"
        onOpenSettings={vi.fn()}
        statuses={[
          {
            id: 'status-nuevo',
            dimension: 'status',
            matchValue: 'nuevo',
            displayName: 'Nuevo',
            colorHex: '#38BDF8',
            sortOrder: 1,
          },
        ]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Seleccionar archivo CSV/i }))
    await waitFor(() => expect(screen.getByText('leads.csv')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Reglas de limpieza de leads.csv/i }))
    await waitFor(() => expect(screen.getByText('Reglas de limpieza')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Aplicar reglas/i }))

    await waitFor(() => {
      expect(screen.getByText(/Limpieza activa en leads.csv/i)).toBeInTheDocument()
    })
  })

  it('displays error message when validation fails', async () => {
    registerMockCommand('pick_csv_files_dialog', () => ['C:/Datos/corrupt.csv'])
    registerMockCommand('validate_csv_file', () => {
      throw new Error('El archivo CSV está vacío (0 bytes).')
    })

    render(<HomeScreen exportPath="C:/Reportes_CRM" onOpenSettings={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Seleccionar archivo CSV/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/El archivo CSV está vacío \(0 bytes\)\./i)
      ).toBeInTheDocument()
    })
  })
})
