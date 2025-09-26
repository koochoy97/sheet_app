import React from 'react'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { STATUS_OPTIONS } from '../constants/sheet'

export default function SheetTable({ columns, rows, loading, onCellChange, onCellBlur, selectedIds = new Set(), onToggleRow, onToggleAll, disableSelection = false, sort, onToggleSort, pending = new Set() }) {
  // Track value at focus-time per cell to decide if blur should trigger save
  const focusValuesRef = React.useRef(new Map())
  const setFocusVal = (rowId, key, val) => {
    focusValuesRef.current.set(`${rowId}:${key}`, val ?? '')
  }
  const changedSinceFocus = (rowId, key, val) => {
    const start = focusValuesRef.current.get(`${rowId}:${key}`)
    return (start ?? '') !== (val ?? '')
  }
  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.id))
  return (
    <div className="table-wrap">
      <table className="sheet-table">
        <colgroup>
          <col className={`col-select`} />
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
                  onClick={(e)=>{ e.stopPropagation() }}
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
            Array.from({length: 8}).map((_,i)=> (
              <tr key={`sk${i}`}>
                <td className="select-cell"><div className="skeleton skeleton-box" style={{width: 20, height: 20, margin: '0 auto'}} /></td>
                {columns.map(c => (
                  <td key={c.key}><div className={c.key==='status' ? 'skeleton skeleton-pill' : 'skeleton skeleton-line'} /></td>
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
                    onClick={(e)=>{ e.stopPropagation() }}
                    disabled={disableSelection}
                  />
                </td>
                {columns.map(col => (
                    <td key={col.key}>
                    {renderCell(row, col, onCellChange, onCellBlur, pending, setFocusVal, changedSinceFocus)}
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

function renderCell(row, col, onCellChange, onCellBlur, pending, setFocusVal, changedSinceFocus) {
  const change = (val) => onCellChange(row.id, col.key, val)
  const isPending = pending.has(`${row.id}:${col.key}`)
  const wrap = (child) => (
    <div className="field-wrap">
      {child}
      {isPending && <div className="field-spinner" />}
    </div>
  )
  switch (col.key) {
    case 'fecha':
      return wrap(
        <input
          type="date"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          value={row.fecha || ''}
          onChange={e => { const v = e.target.value; change(v); if (onCellBlur && v !== (row.fecha || '')) { onCellBlur(row.id, col.key, v); setFocusVal(row.id, col.key, v) } }}
          onFocus={e => { setFocusVal(row.id, col.key, e.target.value); if (e.target.showPicker) e.target.showPicker() }}
          onBlur={e => { const v = e.target.value; if (onCellBlur && changedSinceFocus(row.id, col.key, v)) onCellBlur(row.id, col.key, v) }}
          onClick={e => { if (e.target.showPicker) e.target.showPicker() }}
          data-colkey="fecha"
        />
      )
    case 'status':
      return wrap(
        <select
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          value={row.status || ''}
          onChange={e => { const v = e.target.value; change(v); if (onCellBlur && v !== (row.status || '')) { onCellBlur(row.id, col.key, v); setFocusVal(row.id, col.key, v) } }}
          onFocus={e => { setFocusVal(row.id, col.key, e.target.value) }}
          onBlur={e => { const v = e.target.value; if (onCellBlur && changedSinceFocus(row.id, col.key, v)) onCellBlur(row.id, col.key, v) }}
        >
          <option value="">Seleccionar</option>
          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    case 'feedback':
      return wrap(
        <Textarea
          value={row.feedback || ''}
          onChange={e => change(e.target.value)}
          onFocus={e => setFocusVal(row.id, col.key, e.target.value)}
          onBlur={e => { const v = e.target.value; if (onCellBlur && changedSinceFocus(row.id, col.key, v)) onCellBlur(row.id, col.key, v) }}
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
          onBlur={e => { const v = e.target.value; if (onCellBlur && changedSinceFocus(row.id, col.key, v)) onCellBlur(row.id, col.key, v) }}
          placeholder="Industria"
          rows={1}
        />
      )
    case 'cliente':
      return wrap(<Input value={row.cliente || ''} disabled />)
    case 'score':
      return wrap(
        <Input
          type="number"
          value={row.score === 0 ? 0 : (row.score || '')}
          onChange={e => change(e.target.value)}
          onFocus={e => setFocusVal(row.id, col.key, e.target.value)}
          onBlur={e => { const v = e.target.value; if (onCellBlur && changedSinceFocus(row.id, col.key, v)) onCellBlur(row.id, col.key, v) }}
          data-colkey="score"
        />
      )
    default:
      return wrap(
        <Input
          value={row[col.key] || ''}
          onChange={e => change(e.target.value)}
          onFocus={e => setFocusVal(row.id, col.key, e.target.value)}
          onBlur={e => { const v = e.target.value; if (onCellBlur && changedSinceFocus(row.id, col.key, v)) onCellBlur(row.id, col.key, v) }}
          placeholder=""
        />
      )
  }
}
