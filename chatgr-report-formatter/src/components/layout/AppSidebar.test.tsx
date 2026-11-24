import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppSidebar } from './AppSidebar'

describe('AppSidebar', () => {
  it('renders navigation items with labels and descriptions in Mexican Spanish', () => {
    render(
      <AppSidebar
        activeSection="home"
        onSelectSection={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />
    )

    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.getByText('Importar y procesar CSV')).toBeInTheDocument()
    expect(screen.getByText('Archivos')).toBeInTheDocument()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
    expect(screen.getByText('Modo 100% offline')).toBeInTheDocument()
  })

  it('triggers onSelectSection when a section is clicked', () => {
    const handleSelect = vi.fn()
    render(
      <AppSidebar
        activeSection="home"
        onSelectSection={handleSelect}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Configuración/i }))
    expect(handleSelect).toHaveBeenCalledWith('settings')
  })

  it('toggles collapse state when button is clicked', () => {
    const handleToggle = vi.fn()
    render(
      <AppSidebar
        activeSection="home"
        onSelectSection={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={handleToggle}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Colapsar barra lateral/i }))
    expect(handleToggle).toHaveBeenCalledTimes(1)
  })
})
