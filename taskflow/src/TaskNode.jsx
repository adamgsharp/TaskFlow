import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTaskContext } from './TaskContext.jsx'

const STATUS_STYLE = {
  completed: { background: '#f0fdf4', border: '2px solid #22c55e', color: '#15803d' },
  available: { background: '#eff6ff', border: '2px solid #3b82f6', color: '#1d4ed8' },
  blocked:   { background: '#f8fafc', border: '2px solid #cbd5e1', color: '#64748b' },
}

const STATUS_DOT = {
  completed: '#22c55e',
  available: '#3b82f6',
  blocked:   '#94a3b8',
}

function TaskNode({ data }) {
  const { task, status, onNodeClick } = data
  const { dispatch } = useTaskContext()

  const handleCheck = (e) => {
    e.stopPropagation()
    dispatch({ type: 'TOGGLE_DONE', payload: { id: task.id } })
  }

  return (
    <div
      className="task-node"
      style={STATUS_STYLE[status]}
      onClick={() => onNodeClick(task.id)}
      title={task.title}
    >
      <Handle type="target" position={Position.Left} style={{ background: STATUS_DOT[status] }} />

      <div className="task-node-inner">
        <div
          className={`task-checkbox ${task.completed ? 'checked' : ''}`}
          onClick={handleCheck}
          role="checkbox"
          aria-checked={task.completed}
        >
          {task.completed && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span className={`task-node-title ${task.completed ? 'done' : ''}`}>
          {task.title}
        </span>
      </div>

      <div className="task-node-status-dot" style={{ background: STATUS_DOT[status] }} />

      <Handle type="source" position={Position.Right} style={{ background: STATUS_DOT[status] }} />
    </div>
  )
}

export default memo(TaskNode)
