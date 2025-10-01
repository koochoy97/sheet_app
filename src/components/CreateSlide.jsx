import React from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { STATUS_OPTIONS } from '../constants/sheet'
import LineaNegocioDropdown from './LineaNegocioDropdown'

const errorClasses = 'border-rose-500 focus-visible:ring-rose-500 focus-visible:ring-offset-0'

export default function CreateSlide({
  values,
  onChange,
  onCancel,
  onSave,
  saving,
  errors = {},
  requiredFields = [],
  lineaOptions = [],
}) {
  const requiredSet = React.useMemo(() => new Set(requiredFields), [requiredFields])

  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onEsc)
    const t = requestAnimationFrame(() => setOpen(true))
    return () => { document.removeEventListener('keydown', onEsc); cancelAnimationFrame(t) }
  }, [onCancel])
  const handleClose = () => {
    setOpen(false)
    // Espera a que termine la transición CSS (.28s)
    setTimeout(() => onCancel(), 300)
  }

  const renderLabel = (label, key) => (
    <span className="flex items-center gap-1">
      {label}
      {requiredSet.has(key) && <span className="text-rose-600">*</span>}
    </span>
  )

  return (
    <>
      <div className={`slide-panel ${open ? 'open' : ''}`}>
        <div className="slide-header">
          <h3>Nuevo registro</h3>
          <button type="button" className="slide-close" aria-label="Cerrar" onClick={handleClose}>×</button>
        </div>
        <div className="slide-body">
          <label className={errors.company ? 'text-rose-700' : undefined}>
            {renderLabel('Company', 'company')}
            <Input
              value={values.company}
              onChange={e => onChange('company', e.target.value)}
              aria-invalid={Boolean(errors.company)}
              className={errors.company ? errorClasses : undefined}
            />
            {errors.company && <FieldError message={errors.company} />}
          </label>
          <div className={`field-group ${errors.fecha ? 'text-rose-700' : ''}`}>
            <span className="flex items-center gap-1">
              {renderLabel('Fecha de celebración', 'fecha')}
            </span>
            <input
              type="date"
              className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ${errors.fecha ? errorClasses : ''}`.trim()}
              value={values.fecha}
              onChange={e => onChange('fecha', e.target.value)}
              onFocus={e => { if (e.target.showPicker) e.target.showPicker() }}
              onClick={e => { if (e.target.showPicker) e.target.showPicker() }}
              aria-invalid={Boolean(errors.fecha)}
            />
            {errors.fecha && <FieldError message={errors.fecha} />}
          </div>
          <label className={errors.status ? 'text-rose-700' : undefined}>
            {renderLabel('Status', 'status')}
            <select
              className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ${errors.status ? errorClasses : ''}`.trim()}
              value={values.status}
              onChange={e => onChange('status', e.target.value)}
              aria-invalid={Boolean(errors.status)}
            >
              <option value="">Seleccionar</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.status && <FieldError message={errors.status} />}
          </label>
          <label className={errors.kdm ? 'text-rose-700' : undefined}>
            {renderLabel('KDM', 'kdm')}
            <Input
              value={values.kdm}
              onChange={e => onChange('kdm', e.target.value)}
              aria-invalid={Boolean(errors.kdm)}
              className={errors.kdm ? errorClasses : undefined}
            />
            {errors.kdm && <FieldError message={errors.kdm} />}
          </label>
          <label className={errors.tituloKdm ? 'text-rose-700' : undefined}>
            {renderLabel('Título del KDM', 'tituloKdm')}
            <Input
              value={values.tituloKdm}
              onChange={e => onChange('tituloKdm', e.target.value)}
              aria-invalid={Boolean(errors.tituloKdm)}
              className={errors.tituloKdm ? errorClasses : undefined}
            />
            {errors.tituloKdm && <FieldError message={errors.tituloKdm} />}
          </label>
          <label className={errors.industria ? 'text-rose-700' : undefined}>
            {renderLabel('Industria', 'industria')}
            <Textarea
              value={values.industria}
              onChange={e => onChange('industria', e.target.value)}
              rows={1}
              aria-invalid={Boolean(errors.industria)}
              className={errors.industria ? errorClasses : undefined}
            />
            {errors.industria && <FieldError message={errors.industria} />}
          </label>
          <label className={errors.empleados ? 'text-rose-700' : undefined}>
            {renderLabel('# Empleados', 'empleados')}
            <Input
              value={values.empleados}
              onChange={e => onChange('empleados', e.target.value)}
              aria-invalid={Boolean(errors.empleados)}
              className={errors.empleados ? errorClasses : undefined}
            />
            {errors.empleados && <FieldError message={errors.empleados} />}
          </label>
          <label className={errors.score ? 'text-rose-700' : undefined}>
            {renderLabel('Score', 'score')}
            <Input
              type="number"
              value={values.score}
              onChange={e => onChange('score', e.target.value)}
              data-colkey="score"
              aria-invalid={Boolean(errors.score)}
              className={errors.score ? errorClasses : undefined}
            />
            {errors.score && <FieldError message={errors.score} />}
          </label>
          <label className={errors.feedback ? 'text-rose-700' : undefined}>
            {renderLabel('Feedback', 'feedback')}
            <Textarea
              value={values.feedback}
              onChange={e => onChange('feedback', e.target.value)}
              rows={3}
              aria-invalid={Boolean(errors.feedback)}
              className={errors.feedback ? errorClasses : undefined}
            />
            {errors.feedback && <FieldError message={errors.feedback} />}
          </label>
          <div className={`field-group ${errors.lineaNegocio ? 'text-rose-700' : ''}`}>
            <span className="flex items-center gap-1">
              {renderLabel('Línea de negocio', 'lineaNegocio')}
            </span>
            <LineaNegocioDropdown
              source="create-form"
              values={values.lineaNegocio || []}
              options={lineaOptions}
              disabled={saving}
              onOpen={() => {
                try {
                  console.log('[CreateSlide] dropdown open', { options: lineaOptions.length, cliente: values.cliente })
                } catch {}
              }}
              onSelectionChange={(next) => onChange('lineaNegocio', next)}
              onCommit={(next) => {
                onChange('lineaNegocio', next)
                try {
                  console.log('[CreateSlide] dropdown commit', { values: next })
                } catch {}
              }}
            />
            {errors.lineaNegocio && <FieldError message={errors.lineaNegocio} />}
          </div>
        </div>
        <div className="slide-footer">
          <Button
            variant="default"
            className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/80"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button
            variant="default"
            className="bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-100/80"
            onClick={handleClose}
            disabled={saving}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </>
  )
}

function FieldError({ message }) {
  return <p className="text-xs font-medium text-rose-600">{message}</p>
}
