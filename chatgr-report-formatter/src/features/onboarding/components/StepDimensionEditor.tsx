import React, { useState } from 'react'
import type { DimensionCategory, DimensionType } from '../../../types/dimensions'
import { Plus, Trash2, CheckCircle2, RotateCcw } from 'lucide-react'

interface StepDimensionEditorProps {
  title: string
  description: string
  dimension: DimensionType
  categories: DimensionCategory[]
  onChangeCategories: (updated: DimensionCategory[]) => void
  onResetDefaults: () => void
  supportsConversion?: boolean
}

const PRESET_COLORS = [
  '#38BDF8', // Sky
  '#A855F7', // Purple
  '#F97316', // Orange
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#EAB308', // Yellow
  '#9CA3AF', // Gray
  '#1877F2', // Blue
  '#E1306C', // Pink
  '#111827', // Black
]

export const StepDimensionEditor: React.FC<StepDimensionEditorProps> = ({
  title,
  description,
  dimension,
  categories,
  onChangeCategories,
  onResetDefaults,
  supportsConversion = false,
}) => {
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#22C55E')
  const [newIsConversion, setNewIsConversion] = useState(false)

  const handleAdd = () => {
    const trimmed = newLabel.trim()
    if (!trimmed) return

    const matchVal = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (categories.some((c) => c.matchValue === matchVal)) {
      alert('Ya existe una categoría con este nombre o coincidencia.')
      return
    }

    const newCategory: DimensionCategory = {
      id: `${dimension}-${Date.now()}`,
      dimension,
      matchValue: matchVal,
      displayName: trimmed,
      colorHex: newColor,
      isConversion: supportsConversion ? newIsConversion : false,
      sortOrder: categories.length + 1,
      isSystemDefault: false,
    }

    onChangeCategories([...categories, newCategory])
    setNewLabel('')
    setNewIsConversion(false)
  }

  const handleRemove = (id: string) => {
    onChangeCategories(categories.filter((c) => c.id !== id))
  }

  const handleToggleConversion = (id: string) => {
    onChangeCategories(
      categories.map((c) =>
        c.id === id ? { ...c, isConversion: !c.isConversion } : c
      )
    )
  }

  const handleUpdateColor = (id: string, colorHex: string) => {
    onChangeCategories(
      categories.map((c) => (c.id === id ? { ...c, colorHex } : c))
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 self-start md:self-auto hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restablecer predeterminados
        </button>
      </div>

      {/* Categories Table / List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Color</th>
                <th className="py-2.5 px-4 font-semibold">Etiqueta visible</th>
                <th className="py-2.5 px-4 font-semibold">Valor normalizado</th>
                {supportsConversion && (
                  <th className="py-2.5 px-4 font-semibold text-center">
                    ¿Es venta/conversión?
                  </th>
                )}
                <th className="py-2.5 px-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/50">
                  {/* Color picker thumbnail */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={cat.colorHex}
                        onChange={(e) => handleUpdateColor(cat.id, e.target.value)}
                        className="h-6 w-6 rounded-md border border-slate-300 cursor-pointer p-0.5 bg-white"
                        title="Cambiar color"
                      />
                      <span className="font-mono text-[11px] text-slate-500">
                        {cat.colorHex}
                      </span>
                    </div>
                  </td>

                  {/* Display Name Badge */}
                  <td className="py-2.5 px-4">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${cat.colorHex}22`,
                        color: cat.colorHex,
                        border: `1px solid ${cat.colorHex}55`,
                      }}
                    >
                      {cat.displayName}
                    </span>
                  </td>

                  {/* Normalized key */}
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                    {cat.matchValue}
                  </td>

                  {/* Conversion Toggle */}
                  {supportsConversion && (
                    <td className="py-2.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleConversion(cat.id)}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          cat.isConversion
                            ? 'bg-emerald-100 text-emerald-800 font-semibold'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2
                          className={`h-3.5 w-3.5 ${
                            cat.isConversion ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        />
                        {cat.isConversion ? 'Sí (Conversión)' : 'No'}
                      </button>
                    </td>
                  )}

                  {/* Remove Button */}
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(cat.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {categories.length === 0 && (
                <tr>
                  <td
                    colSpan={supportsConversion ? 5 : 4}
                    className="py-8 text-center text-slate-400"
                  >
                    No hay categorías activas. Añade una para continuar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Category Form */}
        <div className="bg-slate-50 p-4 border-t border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Agregar nueva categoría a {title.toLowerCase()}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nombre de la categoría (ej. Cotizado especial)"
              className="flex-1 min-w-[200px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-hidden"
            />

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Color:</span>
              <div className="flex items-center gap-1">
                {PRESET_COLORS.slice(0, 5).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      newColor === color ? 'scale-110 border-slate-900 ring-2 ring-emerald-500' : 'border-transparent'
                    }`}
                    title={color}
                  />
                ))}
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-7 w-7 rounded-md border border-slate-300 cursor-pointer p-0.5 bg-white ml-1"
                />
              </div>
            </div>

            {supportsConversion && (
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIsConversion}
                  onChange={(e) => setNewIsConversion(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Cuenta como venta/conversión
              </label>
            )}

            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
