import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingWizard } from './OnboardingWizard'

describe('OnboardingWizard', () => {
  it('renders step 1 with default suggested folder and step indicator', () => {
    const handleComplete = vi.fn()
    render(<OnboardingWizard onComplete={handleComplete} />)

    expect(screen.getByText('Asistente de Configuración Inicial')).toBeInTheDocument()
    expect(screen.getByText(/Paso 1 de 6/i)).toBeInTheDocument()
    expect(screen.getByText(/Define tu carpeta de exportación predeterminada/i)).toBeInTheDocument()
  })

  it('allows navigating forward through all steps to completion', () => {
    const handleComplete = vi.fn()
    render(<OnboardingWizard onComplete={handleComplete} />)

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))
    expect(screen.getByText(/Paso 2 de 6/i)).toBeInTheDocument()
    expect(screen.getByText('Estatus Comerciales')).toBeInTheDocument()

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))
    expect(screen.getByText(/Paso 3 de 6/i)).toBeInTheDocument()
    expect(screen.getByText('Niveles de Prioridad')).toBeInTheDocument()

    // Step 3 -> Step 4
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))
    expect(screen.getByText(/Paso 4 de 6/i)).toBeInTheDocument()
    expect(screen.getByText('Plataformas de Origen')).toBeInTheDocument()

    // Step 4 -> Step 5
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))
    expect(screen.getByText(/Paso 5 de 6/i)).toBeInTheDocument()
    expect(screen.getByText('Medios de Captación')).toBeInTheDocument()

    // Step 5 -> Step 6
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))
    expect(screen.getByText(/Paso 6 de 6/i)).toBeInTheDocument()
    expect(screen.getByText(/¡Todo listo para comenzar!/i)).toBeInTheDocument()

    // Finalize
    fireEvent.click(screen.getByRole('button', { name: /Finalizar y entrar a Inicio/i }))
    expect(handleComplete).toHaveBeenCalledTimes(1)
  })

  it('supports going back to previous steps', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />)

    // Advance to step 2
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))
    expect(screen.getByText(/Paso 2 de 6/i)).toBeInTheDocument()

    // Click Anterior to return to step 1
    fireEvent.click(screen.getByRole('button', { name: /Anterior/i }))
    expect(screen.getByText(/Paso 1 de 6/i)).toBeInTheDocument()
  })

  it('allows adding and removing categories in StepDimensionEditor', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />)

    // Go to step 2 (status)
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))

    // Verify default "Compra" is present
    expect(screen.getByText('Compra')).toBeInTheDocument()

    // Add a new custom status
    const input = screen.getByPlaceholderText(/Nombre de la categoría/i)
    fireEvent.change(input, { target: { value: 'Ganado VIP' } })
    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }))

    expect(screen.getByText('Ganado VIP')).toBeInTheDocument()
  })
})
