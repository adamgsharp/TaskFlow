import React from 'react'
import { useTaskContext, getStatus } from './TaskContext.jsx'

function computeLayers(tasks) {
  const depth = {}
  // BFS from roots
  const queue = Object.values(tasks)
    .filter(t => t.prereqs.length === 0)
    .map(t => ({ id: t.id, d: 0 }))

  while (queue.length) {
    const { id, d } = queue.shift()
    if (depth[id] === undefined || d > depth[id]) {
      depth[id] = d
      tasks[id]?.dependents.forEach(depId => queue.push({ id: depId, d: d + 1 }))
    }
  }
  // Catch orphaned tasks
  Object.keys(tasks).forEach(id => {
    if (depth[id] === undefined) depth[id] = 0
  })

  const layers = {}
  Object.entries(depth).forEach(([id, d]) => {
    if (!layers[d]) layers[d] = []
    layers[d].push(tasks[id])
  })
  return layers
}

const STATUS_CONFIG = {
  completed: { label: 'Done', dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  available: { label: 'Ready', dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  blocked:   { label: 'Waiting', dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' },
}

export default function ListView({ onTaskClick }) {
  const { state, dispatch } = useTaskContext()
  const { tasks } = state
  const layers = computeLayers(tasks)
  const layerKeys = Object.keys(layers).map(Number).sort((a, b) => a - b)

  const completedCount = Object.values(tasks).filter(t => t.completed).length
  const total = Object.values(tasks).length
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return (
    <div className="list-view">
      <div className="list-progress-bar-wrap">
        <div className="list-progress-bar">
          <div className="list-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="list-progress-label">{completedCount} / {total} complete</span>
      </div>

      {layerKeys.map(layer => (
        <div key={layer} className="list-layer">
          <div className="list-layer-header">
            <span className="list-layer-label">
              {layer === 0 ? 'Starting tasks' : layer === Math.max(...layerKeys) ? 'Final tasks' : `Step ${layer + 1}`}
            </span>
            <span className="list-layer-count">{layers[layer].length} task{layers[layer].length !== 1 ? 's' : ''}</span>
          </div>
          <div className="list-layer-tasks">
            {layers[layer].map(task => {
              const status = getStatus(task, tasks)
              const cfg = STATUS_CONFIG[status]
              const prereqTitles = task.prereqs.map(id => tasks[id]?.title).filter(Boolean)
              const dependentTitles = task.dependents.map(id => tasks[id]?.title).filter(Boolean)

              return (
                <div
                  key={task.id}
                  className="list-task-card"
                  style={{ background: cfg.bg, borderColor: cfg.border }}
                  onClick={() => onTaskClick(task.id)}
                >
                  <div
                    className={`list-task-checkbox ${task.completed ? 'checked' : ''}`}
                    onClick={e => {
                      e.stopPropagation()
                      dispatch({ type: 'TOGGLE_DONE', payload: { id: task.id } })
                    }}
                    role="checkbox"
                    aria-checked={task.completed}
                  >
                    {task.completed && (
                      <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  <div className="list-task-body">
                    <div className="list-task-title-row">
                      <span className={`list-task-title ${task.completed ? 'done' : ''}`}>{task.title}</span>
                      <span className="list-task-status-badge" style={{ color: cfg.text, background: 'transparent' }}>
                        <span style={{ background: cfg.dot, display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginRight: 4 }} />
                        {cfg.label}
                      </span>
                    </div>

                    {prereqTitles.length > 0 && (
                      <div className="list-task-deps">
                        <span className="dep-label">Needs:</span>
                        {prereqTitles.map((t, i) => (
                          <span key={i} className="dep-chip dep-chip-in">{t}</span>
                        ))}
                      </div>
                    )}
                    {dependentTitles.length > 0 && (
                      <div className="list-task-deps">
                        <span className="dep-label">Unlocks:</span>
                        {dependentTitles.map((t, i) => (
                          <span key={i} className="dep-chip dep-chip-out">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {total === 0 && (
        <div className="list-empty">
          <p>No tasks yet. Press <strong>+ Add Task</strong> to get started.</p>
        </div>
      )}
    </div>
  )
}
