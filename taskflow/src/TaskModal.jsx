import React, { useState, useRef, useEffect } from 'react'
import { useTaskContext, wouldCreateCycle } from './TaskContext.jsx'

function MultiSelect({ label, sublabel, selectedIds, onChange, tasks, excludeIds, fieldType, allSelected }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef()
  const dropdownRef = useRef()

  const available = Object.values(tasks).filter(t =>
    !excludeIds.includes(t.id) &&
    !selectedIds.includes(t.id) &&
    t.title.toLowerCase().includes(query.toLowerCase())
  )

  const add = (id) => {
    onChange([...selectedIds, id])
    setQuery('')
    inputRef.current?.focus()
  }

  const remove = (id) => onChange(selectedIds.filter(s => s !== id))

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="multiselect-field" ref={dropdownRef}>
      <label className="field-label">{label}</label>
      {sublabel && <p className="field-sublabel">{sublabel}</p>}

      {selectedIds.length > 0 && (
        <div className="chip-list">
          {selectedIds.map(id => (
            <span key={id} className={`chip chip-${fieldType}`}>
              {tasks[id]?.title ?? id}
              <button
                type="button"
                className="chip-remove"
                onClick={() => remove(id)}
                aria-label={`Remove ${tasks[id]?.title}`}
              >×</button>
            </span>
          ))}
        </div>
      )}

      <div className="multiselect-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="multiselect-input"
          placeholder={selectedIds.length > 0 ? 'Add another...' : 'Search tasks...'}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setQuery('') }
            if (e.key === 'Enter' && available.length > 0) { e.preventDefault(); add(available[0].id) }
          }}
        />
      </div>

      {open && available.length > 0 && (
        <ul className="multiselect-dropdown">
          {available.slice(0, 8).map(t => (
            <li
              key={t.id}
              className="multiselect-option"
              onMouseDown={e => { e.preventDefault(); add(t.id) }}
            >
              <span className="option-dot" style={{ background: t.completed ? '#22c55e' : allSelected[t.id]?.prereqs?.length === 0 ? '#3b82f6' : '#94a3b8' }} />
              {t.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function TaskModal({ taskId, onClose }) {
  const { state, dispatch } = useTaskContext()
  const { tasks } = state
  const isEdit = taskId !== null

  const existing = isEdit ? tasks[taskId] : null

  const [title, setTitle] = useState(existing?.title ?? '')
  const [prereqs, setPrereqs] = useState(existing?.prereqs ?? [])
  const [dependents, setDependents] = useState(existing?.dependents ?? [])
  const [titleError, setTitleError] = useState('')
  const titleRef = useRef()

  useEffect(() => { titleRef.current?.focus() }, [])

  const handlePrereqChange = (ids) => {
    // Filter out any that would create a cycle (prereq -> this task -> ... -> prereq)
    const safe = ids.filter(id => !taskId || !wouldCreateCycle(tasks, id, taskId))
    setPrereqs(safe)
  }

  const handleDependentChange = (ids) => {
    const safe = ids.filter(id => !taskId || !wouldCreateCycle(tasks, taskId, id))
    setDependents(safe)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) { setTitleError('Task name is required'); titleRef.current?.focus(); return }
    if (isEdit) {
      dispatch({ type: 'EDIT_TASK', payload: { id: taskId, title: title.trim(), prereqs, dependents } })
    } else {
      dispatch({ type: 'ADD_TASK', payload: { title: title.trim(), prereqs, dependents } })
    }
    onClose()
  }

  const handleDelete = () => {
    if (confirm(`Delete "${existing?.title}"? This cannot be undone.`)) {
      dispatch({ type: 'DELETE_TASK', payload: { id: taskId } })
      onClose()
    }
  }

  // Exclude self from both selectors
  const excludeSelf = taskId ? [taskId] : []
  // Exclude current dependents from prereq picker (can't be both)
  const excludeFromPrereqs = [...excludeSelf, ...dependents]
  // Exclude current prereqs from dependent picker
  const excludeFromDependents = [...excludeSelf, ...prereqs]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit task' : 'Add task'}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="field-group">
            <label className="field-label" htmlFor="task-title">Task name</label>
            <input
              id="task-title"
              ref={titleRef}
              type="text"
              className={`text-input ${titleError ? 'input-error' : ''}`}
              value={title}
              onChange={e => { setTitle(e.target.value); if (titleError) setTitleError('') }}
              placeholder="What needs to be done?"
            />
            {titleError && <p className="error-msg">{titleError}</p>}
          </div>

          <MultiSelect
            label="Prerequisites"
            sublabel="These other tasks must be completed beforehand"
            fieldType="prereq"
            selectedIds={prereqs}
            onChange={handlePrereqChange}
            tasks={tasks}
            excludeIds={excludeFromPrereqs}
            allSelected={tasks}
          />

          <MultiSelect
            label="Dependents"
            sublabel="This task must be completed before I can start these"
            fieldType="dependent"
            selectedIds={dependents}
            onChange={handleDependentChange}
            tasks={tasks}
            excludeIds={excludeFromDependents}
            allSelected={tasks}
          />

          <div className="modal-footer">
            {isEdit && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}
            <div className="modal-footer-right">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                {isEdit ? 'Save changes' : 'Add task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
