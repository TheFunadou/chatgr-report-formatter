import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CleaningConfigModal } from './CleaningConfigModal'
import { registerMockCommand, clearMockCommands } from '../../../lib/tauri'
import type { CleaningRules } from '../../../types/cleaning'
import type { DimensionCategory } from '../../../types/dimensions'

const statuses: DimensionCategory[] = [
  {
    id: 'status-compra',
    dimension: 'status',
    matchValue: 'compra',
    displayName: 'Compra',
    colorHex: '#22C55E',
    isConversion: true,
    sortOrder: 1,
  },
  {
    id: 'status-nuevo',
    dimension: 'status',
    matchValue: 'nuevo',
    displayName: 'Nuevo',
    colorHex: '#38BDF8',
    isConversion: false,
    sortOrder: 2,
  },
]

const baseRules: CleaningRules = {
  excludeEmptyRows: true,
  normalizeWhitespace: true,
  excludedStatuses: [],
}

describe('CleaningConfigModal (Phase 7)', () => {
  beforeEach(() => {
    clearMockCommands()
    registerMockCommand('get_csv_preview', () => ({
      path: 'C:/Datos/leads.csv',
      fileName: 'leads.csv',
      delimiter: ',',
      headers: ['nombre', 'estatus', 'fecha'],
      rows: [['Juan', 'compra', '2026-11-20']],
      totalRows: 1,
      warnings: [],
    }))
  })

  it('lists the active commercial statuses from configuration', async () => {
    render(
      <CleaningConfigModal
        filePath="C:/Datos/leads.csv"
        fileName="leads.csv"
        activeRules={baseRules}
        statuses={statuses}
        onApplyRules={vi.fn()}
        onResetRules={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Reglas de limpieza')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Compra/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nuevo/ })).toBeInTheDocument()
  })

  it('sends selected statuses and shows the simulation summary', async () => {
    let receivedRules: CleaningRules | undefined
    registerMockCommand('apply_cleaning_rules', (args: any) => {
      receivedRules = args?.rules
      return {
        totalRows: 10,
        keptRows: 6,
        excludedTotal: 4,
        excludedByDate: 1,
        excludedByInvalidDate: 0,
        excludedByDuplicates: 1,
        excludedByEmpty: 1,
        excludedByInvalid: 0,
        excludedByStatus: 1,
        invalidDates: 0,
        sampleCleanedRows: [['Juan', 'compra', '2026-11-20']],
        excludedSamples: [
          { rowNumber: 3, values: ['', '', ''], reason: 'Fila vacía' },
        ],
        warnings: ['La columna «zona» no existe.'],
        headers: ['nombre', 'estatus', 'fecha'],
      }
    })

    render(
      <CleaningConfigModal
        filePath="C:/Datos/leads.csv"
        fileName="leads.csv"
        activeRules={baseRules}
        statuses={statuses}
        onApplyRules={vi.fn()}
        onResetRules={vi.fn()}
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /^Compra/ }))
    fireEvent.click(screen.getByRole('button', { name: /Simular/i }))

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    expect(receivedRules?.excludedStatuses).toEqual(['compra'])
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText(/La columna «zona» no existe/i)).toBeInTheDocument()
    expect(screen.getByText(/Fila vacía/i)).toBeInTheDocument()
    expect(screen.getByText('Juan')).toBeInTheDocument()
  })

  it('applies rules and restores the original data', async () => {
    const onApplyRules = vi.fn()
    const onResetRules = vi.fn()
    const onClose = vi.fn()

    const { rerender } = render(
      <CleaningConfigModal
        filePath="C:/Datos/leads.csv"
        fileName="leads.csv"
        activeRules={baseRules}
        statuses={statuses}
        onApplyRules={onApplyRules}
        onResetRules={onResetRules}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Aplicar reglas/i }))
    expect(onApplyRules).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <CleaningConfigModal
        filePath="C:/Datos/leads.csv"
        fileName="leads.csv"
        activeRules={baseRules}
        statuses={statuses}
        onApplyRules={onApplyRules}
        onResetRules={onResetRules}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Restaurar datos originales/i }))
    expect(onResetRules).toHaveBeenCalledTimes(1)
  })

  it('rejects an inverted date range before simulating', async () => {
    const applyMock = vi.fn()
    registerMockCommand('apply_cleaning_rules', applyMock)

    render(
      <CleaningConfigModal
        filePath="C:/Datos/leads.csv"
        fileName="leads.csv"
        activeRules={{
          ...baseRules,
          dateFilter: {
            column: 'fecha',
            startDate: '2026-12-01',
            endDate: '2026-11-01',
          },
        }}
        statuses={statuses}
        onApplyRules={vi.fn()}
        onResetRules={vi.fn()}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/^Desde/i)).toHaveValue('2026-12-01')
    })

    fireEvent.click(screen.getByRole('button', { name: /Simular/i }))

    expect(
      screen.getByText(/La fecha inicial no puede ser posterior a la fecha final/i)
    ).toBeInTheDocument()
    expect(applyMock).not.toHaveBeenCalled()
  })
})
