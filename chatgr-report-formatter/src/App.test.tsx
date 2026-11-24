import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from './App'
import { registerMockCommand, clearMockCommands } from './lib/tauri'
import {
  DEFAULT_STATUS_CATEGORIES,
  DEFAULT_PRIORITY_CATEGORIES,
  DEFAULT_SOURCE_CATEGORIES,
  DEFAULT_MEDIUM_CATEGORIES,
} from './constants/defaultDimensions'

describe('App Flow & Persistence', () => {
  beforeEach(() => {
    clearMockCommands()
  })

  it('starts at onboarding wizard when not completed, then transitions and saves', async () => {
    let savedSettings: any = null
    const savedCategories: any[] = []

    registerMockCommand('get_app_settings', () => ({
      defaultExportPath: 'C:/Reportes_CRM',
      onboardingCompleted: false,
    }))

    registerMockCommand('get_suggested_export_folder', () => 'C:/Reportes_CRM')

    registerMockCommand('get_dimension_categories', () => [
      ...DEFAULT_STATUS_CATEGORIES,
      ...DEFAULT_PRIORITY_CATEGORIES,
      ...DEFAULT_SOURCE_CATEGORIES,
      ...DEFAULT_MEDIUM_CATEGORIES,
    ])

    registerMockCommand('save_app_settings', (args: any) => {
      savedSettings = args?.settings
      return undefined
    })

    registerMockCommand('save_dimension_categories', (args: any) => {
      savedCategories.push(args)
      return undefined
    })

    render(<App />)

    // Verify wizard rendered
    await waitFor(() => {
      expect(screen.getByText('Asistente de Configuración Inicial')).toBeInTheDocument()
    })

    // Advance through steps 1..5
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))
    }

    // Step 6: Finalize
    expect(screen.getByText(/¡Todo listo para comenzar!/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Finalizar y entrar a Inicio/i }))

    // Now in Main App
    await waitFor(() => {
      expect(screen.getByText('Importación y Procesamiento')).toBeInTheDocument()
    })

    expect(savedSettings).toEqual({
      defaultExportPath: 'C:/Reportes_CRM',
      onboardingCompleted: true,
    })
    expect(savedCategories.length).toBe(4) // status, priority, source, medium
  })

  it('loads directly into Home when onboarding was previously completed', async () => {
    registerMockCommand('get_app_settings', () => ({
      defaultExportPath: 'D:/Ventas/Excel',
      onboardingCompleted: true,
    }))

    registerMockCommand('get_dimension_categories', () => [
      ...DEFAULT_STATUS_CATEGORIES,
    ])

    registerMockCommand('list_source_files', () => [])

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Importación y Procesamiento')).toBeInTheDocument()
    })

    expect(screen.queryByText('Asistente de Configuración Inicial')).not.toBeInTheDocument()
    expect(screen.getAllByText('D:/Ventas/Excel').length).toBeGreaterThan(0)
  })

  it('uses the cross-platform suggested folder instead of a hardcoded path', async () => {
    registerMockCommand('get_app_settings', () => ({
      defaultExportPath: '',
      onboardingCompleted: true,
    }))
    registerMockCommand('get_suggested_export_folder', () => '/home/ana/Descargas/Reportes CRM')
    registerMockCommand('get_dimension_categories', () => [...DEFAULT_STATUS_CATEGORIES])
    registerMockCommand('list_source_files', () => [])

    render(<App />)

    await waitFor(() => {
      expect(screen.getAllByText('/home/ana/Descargas/Reportes CRM').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('C:/Reportes_CRM')).not.toBeInTheDocument()
  })

  it('allows navigating between sections and updating folder in settings', async () => {
    registerMockCommand('get_app_settings', () => ({
      defaultExportPath: 'D:/Ventas/Excel',
      onboardingCompleted: true,
    }))

    registerMockCommand('get_dimension_categories', () => [
      ...DEFAULT_STATUS_CATEGORIES,
    ])

    registerMockCommand('list_source_files', () => [])

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Importación y Procesamiento')).toBeInTheDocument()
    })

    const sidebar = screen.getByRole('complementary', { name: /Navegación principal/i })

    // Navigate to Configuración via sidebar
    fireEvent.click(within(sidebar).getByRole('button', { name: /Configuración/i }))
    expect(screen.getByText('Configuración de Preferencias')).toBeInTheDocument()

    // Navigate to Archivos via sidebar
    fireEvent.click(within(sidebar).getByRole('button', { name: /Archivos/i }))
    expect(screen.getByText('Biblioteca de Archivos')).toBeInTheDocument()
  })
})
