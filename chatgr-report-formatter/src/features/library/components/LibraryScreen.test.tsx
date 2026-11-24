import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LibraryScreen } from './LibraryScreen'
import { registerMockCommand, clearMockCommands } from '../../../lib/tauri'

describe('LibraryScreen', () => {
  beforeEach(() => {
    clearMockCommands()
  })

  it('renders registered files with availability status', async () => {
    registerMockCommand('list_source_files', () => [
      {
        id: 'src-1',
        sourceRoute: 'C:/Ventas/crm_activo.csv',
        originalFileName: 'crm_activo.csv',
        alias: 'Leads Noviembre',
        addedAt: '2026-11-20',
        fileSize: 204800,
        isAvailable: true,
      },
      {
        id: 'src-2',
        sourceRoute: 'C:/Ventas/movido.csv',
        originalFileName: 'movido.csv',
        alias: null,
        addedAt: '2026-11-15',
        fileSize: 10240,
        isAvailable: false,
      },
    ])

    render(<LibraryScreen />)

    await waitFor(() => {
      expect(screen.getByText('Leads Noviembre')).toBeInTheDocument()
    })

    expect(screen.getByText('Archivo: crm_activo.csv')).toBeInTheDocument()
    expect(screen.getByText('movido.csv')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Archivo no encontrado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Localizar archivo/i })).toBeInTheDocument()
  })

  it('allows searching and filtering source files', async () => {
    let queriedString: string | undefined = undefined

    registerMockCommand('list_source_files', (args: any) => {
      queriedString = args?.query
      return [
        {
          id: 'src-1',
          sourceRoute: 'C:/Ventas/crm_activo.csv',
          originalFileName: 'crm_activo.csv',
          alias: 'Leads Noviembre',
          addedAt: '2026-11-20',
          fileSize: 204800,
          isAvailable: true,
        },
      ]
    })

    render(<LibraryScreen />)

    await waitFor(() => {
      expect(screen.getByText('Leads Noviembre')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre o alias/i)
    fireEvent.change(searchInput, { target: { value: 'Noviembre' } })

    await waitFor(() => {
      expect(queriedString).toBe('Noviembre')
    })
  })

  it('allows editing an alias inline', async () => {
    let savedAlias: string | undefined = undefined

    registerMockCommand('list_source_files', () => [
      {
        id: 'src-1',
        sourceRoute: 'C:/Ventas/crm_activo.csv',
        originalFileName: 'crm_activo.csv',
        alias: 'Original Alias',
        addedAt: '2026-11-20',
        fileSize: 204800,
        isAvailable: true,
      },
    ])

    registerMockCommand('update_source_alias', (args: any) => {
      savedAlias = args?.alias
      return undefined
    })

    render(<LibraryScreen />)

    await waitFor(() => {
      expect(screen.getByText('Original Alias')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Editar alias'))

    const editInput = screen.getByPlaceholderText('Escribe un alias...')
    fireEvent.change(editInput, { target: { value: 'Nuevo Alias VIP' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => {
      expect(savedAlias).toBe('Nuevo Alias VIP')
    })
  })

  it('allows relinking an unavailable file', async () => {
    let relinkedNewRoute: string | undefined = undefined

    registerMockCommand('list_source_files', () => [
      {
        id: 'src-missing',
        sourceRoute: 'C:/Antigua/desaparecido.csv',
        originalFileName: 'desaparecido.csv',
        alias: null,
        addedAt: '2026-11-10',
        fileSize: 500,
        isAvailable: false,
      },
    ])

    registerMockCommand('pick_csv_files_dialog', () => [
      'D:/NuevaUbicacion/encontrado.csv',
    ])

    registerMockCommand('validate_csv_file', (args: any) => ({
      path: args.path,
      fileName: 'encontrado.csv',
      fileSize: 1024,
    }))

    registerMockCommand('relink_source_file', (args: any) => {
      relinkedNewRoute = args?.newRoute
      return undefined
    })

    render(<LibraryScreen />)

    await waitFor(() => {
      expect(screen.getByText('Archivo no encontrado')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Localizar archivo/i }))

    await waitFor(() => {
      expect(relinkedNewRoute).toBe('D:/NuevaUbicacion/encontrado.csv')
    })
  })

  it('allows loading a file directly into Home', async () => {
    const handleLoadToHome = vi.fn()

    registerMockCommand('list_source_files', () => [
      {
        id: 'src-1',
        sourceRoute: 'C:/Ventas/crm_activo.csv',
        originalFileName: 'crm_activo.csv',
        alias: 'Leads Noviembre',
        addedAt: '2026-11-20',
        fileSize: 204800,
        isAvailable: true,
      },
    ])

    render(<LibraryScreen onLoadFileToHome={handleLoadToHome} />)

    await waitFor(() => {
      expect(screen.getByText('Leads Noviembre')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Cargar a Inicio/i }))

    expect(handleLoadToHome).toHaveBeenCalledWith({
      path: 'C:/Ventas/crm_activo.csv',
      name: 'crm_activo.csv',
      size: 204800,
    })
  })
})
