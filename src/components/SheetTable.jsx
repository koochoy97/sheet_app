import React from 'react'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { STATUS_OPTIONS } from '../constants/sheet'
import LineaNegocioDropdown, { sanitizeLineaValues } from './LineaNegocioDropdown'
import IcpDropdown from './IcpDropdown'
import { normalizeTextArray } from '../services/nocodb'
import CommentPreview from './CommentPreview'
import EmailTagInput from './EmailTagInput'

const sanitizeMailValues = (value) => {
  if (Array.isArray(value)) return normalizeTextArray(value)
  if (typeof value === 'string') return normalizeTextArray(value)
  if (value == null) return []
  return normalizeTextArray([value])
}

const toMailDraftArray = (value) => {
  if (typeof value === 'string') {
    const text = value.replace(/\r/g, '')
    return text.split('\n').map(item => item.trim())
  }
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item.trim()
      if (item == null) return ''
      return String(item).trim()
    })
  }
  if (value == null) return []
  return [String(value)]
}

export default function SheetTable({
  columns,
  rows,
  loading,
  onCellChange,
  onCellBlur,
  onCellClick,
  selectedIds = new Set(),
  onToggleRow,
  onToggleAll,
  disableSelection = false,
  sort,
  onToggleSort,
  pending = new Set(),
  clientLineMap = new Map(),
  lineLabelLookup = new Map(),
  knownEmails = [],
  icpOptions = [],
}) {
  // Track value at focus-time per cell to decide if blur should trigger save
  const focusValuesRef = React.useRef(new Map())
  const serializeValue = React.useCallback((key, val) => {
    if (Array.isArray(val)) {
      if (key === 'lineaNegocio') return JSON.stringify(sanitizeLineaValues(val))
      if (key === 'AE_mails') return JSON.stringify(sanitizeMailValues(val))
      return JSON.stringify(val)
    }
    if (val === null || val === undefined) return ''
    return String(val)
  }, [])
  const setFocusVal = (rowId, key, val) => {
    focusValuesRef.current.set(`${rowId}:${key}`, serializeValue(key, val))
  }
  const changedSinceFocus = (rowId, key, val) => {
    const start = focusValuesRef.current.get(`${rowId}:${key}`)
    return (start ?? '') !== serializeValue(key, val)
  }
  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.id))
  return (
    <div className="table-wrap">
      <table className="sheet-table">
        <colgroup>
          <col className="col-select" />
          {columns.map(c => (<col key={c.key} className={`col-${c.key}`} />))}
        </colgroup>
        <thead>
          <tr>
            <th>
              <div className="select-cell" onClick={() => !disableSelection && onToggleAll && onToggleAll()}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => !disableSelection && onToggleAll && onToggleAll()}
                  onClick={e => e.stopPropagation()}
                  disabled={disableSelection}
                />
              </div>
            </th>
            {columns.map(c => {
              const is = sort?.key === c.key
              const dir = is ? sort?.dir : null
              return (
                <th key={c.key}>
                  <button type="button" className="th-sort" onClick={() => onToggleSort && onToggleSort(c.key)}>
                    <span>{c.label}</span>
                    <span className={`sort-icon ${is ? `is-sorted ${dir}` : ''}`} aria-hidden>
                      <span className="up">▲</span>
                      <span className="down">▼</span>
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={`sk${i}`}>
                <td className="select-cell"><div className="skeleton skeleton-box" style={{ width: 20, height: 20, margin: '0 auto' }} /></td>
                {columns.map(c => (
                  <td key={c.key}><div className={c.key === 'status' ? 'skeleton skeleton-pill' : 'skeleton skeleton-line'} /></td>
                ))}
              </tr>
            ))
          ) : (
            rows.map(row => (
              <tr key={row.id} className={selectedIds.has(row.id) ? 'row-selected' : ''}>
                <td className="select-cell" onClick={() => !disableSelection && onToggleRow && onToggleRow(row.id)}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => !disableSelection && onToggleRow && onToggleRow(row.id)}
                    onClick={e => e.stopPropagation()}
                    disabled={disableSelection}
                  />
                </td>
                {columns.map(col => (
                  <td key={col.key}>
                    {renderCell(row, col, onCellChange, onCellBlur, onCellClick, pending, setFocusVal, changedSinceFocus, clientLineMap, lineLabelLookup, disableSelection, knownEmails, icpOptions)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function renderCell(row, col, onCellChange, onCellBlur, onCellClick, pending, setFocusVal, changedSinceFocus, clientLineMap, lineLabelLookup, disableSelection, knownEmails, icpOptions) {
  const change = (val) => onCellChange(row.id, col.key, val)
  const isPending = pending.has(`${row.id}:${col.key}`)
  const wrap = (child) => (
    <div className="field-wrap">
      {child}
      {isPending && <div className="field-spinner" />}
    </div>
  )
  const statusSlug = (value) => {
    const slug = (value || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    return slug || 'empty'
  }
  const triggerBlur = (value) => {
    const changed = changedSinceFocus(row.id, col.key, value)
    if (changed && onCellBlur) onCellBlur(row, col.key, value)
    if (onCellClick) onCellClick(row)
  }
  switch (col.key) {
    case 'fecha':
      return wrap(
        <input
          type="date"
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
          value={row.fecha || ''}
          onChange={e => {
            const v = e.target.value
            change(v)
            triggerBlur(v)
            setFocusVal(row.id, col.key, v)
          }}
          onFocus={e => { setFocusVal(row.id, col.key, e.target.value); if (e.target.showPicker) e.target.showPicker() }}
          onBlur={e => { const v = e.target.value; triggerBlur(v) }}
          onClick={e => { if (e.target.showPicker) e.target.showPicker() }}
          data-colkey="fecha"
        />
      )
    case 'status':
      const slug = statusSlug(row.status)
      return wrap(
        <select
          className={`status-select status-tag status-${slug}`}
          value={row.status || ''}
          onChange={e => {
            const v = e.target.value
            change(v)
            triggerBlur(v)
            setFocusVal(row.id, col.key, v)
          }}
          onFocus={e => { setFocusVal(row.id, col.key, e.target.value) }}
          onBlur={e => { const v = e.target.value; triggerBlur(v) }}
        >
          <option value="">Seleccionar</option>
          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    case 'lineaNegocio': {
      const optionMap = new Map()
      const collectOptions = (key) => {
        if (!(clientLineMap instanceof Map)) return
        const rawOptions = clientLineMap.get(key)
        if (!rawOptions) return
        if (Array.isArray(rawOptions)) {
          rawOptions.forEach(opt => {
            if (!opt) return
            const optionId = opt.id
            if (optionId === null || optionId === undefined) return
            const keyId = String(optionId)
            if (!optionMap.has(keyId)) optionMap.set(keyId, { id: optionId, label: opt.label })
          })
        }
      }
      if (row.clientId !== null && row.clientId !== undefined) {
        collectOptions(row.clientId)
        const numericKey = Number(row.clientId)
        if (Number.isFinite(numericKey)) collectOptions(numericKey)
        if (typeof row.clientId === 'string') collectOptions(row.clientId.trim())
      }
      const selectedValues = Array.isArray(row.lineaNegocio) ? row.lineaNegocio : []
      for (const val of selectedValues) {
        const keyId = String(val)
        if (optionMap.has(keyId)) continue
        const label = lineLabelLookup instanceof Map ? (lineLabelLookup.get(val) ?? lineLabelLookup.get(keyId)) : undefined
        optionMap.set(keyId, { id: Number.isFinite(Number(val)) ? Number(val) : val, label: label || `ID ${keyId}` })
      }
      const options = Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
      const sanitizedSelected = sanitizeLineaValues(selectedValues)
      return wrap(
        <LineaNegocioDropdown
          source="table"
          values={sanitizedSelected}
          options={options}
          disabled={disableSelection}
          onOpen={() => {
            setFocusVal(row.id, col.key, sanitizedSelected)
          }}
          onSelectionChange={(next) => {
            const sanitized = sanitizeLineaValues(next)
            change(sanitized)
          }}
          onCommit={(next) => {
            const sanitized = sanitizeLineaValues(next)
            triggerBlur(sanitized)
          }}
        />
      )
    }
    case 'icp_id': {
      return wrap(
        <IcpDropdown
          value={row.icp_id ?? null}
          options={icpOptions}
          disabled={disableSelection}
          onChange={(id) => {
            change(id)
            triggerBlur(id)
          }}
        />
      )
    }
    case 'kdm_mail': {
      const value = row.kdm_mail || ''
      return wrap(
        <Input
          type="email"
          value={value}
          onChange={e => change(e.target.value)}
          onFocus={e => {
            setFocusVal(row.id, col.key, e.target.value)
            onCellClick && onCellClick(row)
          }}
          onBlur={e => {
            const v = e.target.value
            triggerBlur(v)
          }}
          placeholder=""
          disabled={disableSelection}
        />
      )
    }
    case 'telefono_cliente': {
      const value = row.telefono_cliente || ''
      return wrap(
        <Input
          type="tel"
          value={value}
          onChange={e => change(e.target.value)}
          onFocus={e => {
            setFocusVal(row.id, col.key, e.target.value)
            onCellClick && onCellClick(row)
          }}
          onBlur={e => {
            const v = e.target.value
            triggerBlur(v)
          }}
          placeholder=""
          disabled={disableSelection}
        />
      )
    }
    case 'feedback':
      return wrap(
        <Textarea
          value={row.feedback || ''}
          onChange={e => change(e.target.value)}
          onFocus={e => setFocusVal(row.id, col.key, e.target.value)}
          onBlur={e => { const v = e.target.value; triggerBlur(v) }}
          placeholder="Notas / comentarios"
          rows={1}
        />
      )
    case 'industria':
      return wrap(
        <Textarea
          value={row.industria || ''}
          onChange={e => change(e.target.value)}
          onFocus={e => setFocusVal(row.id, col.key, e.target.value)}
          onBlur={e => { const v = e.target.value; triggerBlur(v) }}
          placeholder="Industria"
          rows={1}
        />
      )
    case 'cliente':
      return wrap(<Input value={row.cliente || ''} disabled onBlur={() => triggerBlur(row.cliente || '')} />)
    case 'score':
      return wrap(
        <Input
          type="number"
          value={row.score === 0 ? 0 : (row.score || '')}
          onChange={e => change(e.target.value)}
          onFocus={e => setFocusVal(row.id, col.key, e.target.value)}
          onBlur={e => { const v = e.target.value; triggerBlur(v) }}
          data-colkey="score"
        />
      )
    case 'AE_mails': {
      const mailValues = sanitizeMailValues(row.AE_mails)
      return wrap(
        <EmailTagInput
          values={mailValues}
          suggestions={knownEmails}
          disabled={disableSelection}
          onChange={(next) => {
            change(next)
            if (onCellBlur) onCellBlur(row, col.key, next)
          }}
          onBlur={() => {
            const sanitized = sanitizeMailValues(row.AE_mails)
            triggerBlur(sanitized)
          }}
        />
      )
    }
    case 'comments':
      return wrap(
        <CommentPreview
          value={row.comments || ''}
          onChange={e => change(e.target.value)}
          onFocus={e => setFocusVal(row.id, col.key, e.target.value)}
          onBlur={e => {
            const v = e.target.value
            triggerBlur(v)
          }}
          disabled={disableSelection}
          placeholder=""
        />
      )
    default:
      return wrap(
        <Input
          value={row[col.key] || ''}
          onChange={e => change(e.target.value)}
          onFocus={e => setFocusVal(row.id, col.key, e.target.value)}
          onBlur={e => { const v = e.target.value; triggerBlur(v) }}
          placeholder=""
        />
      )
  }
}
