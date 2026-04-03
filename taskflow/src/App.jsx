import React, { useState } from 'react'
import { TaskProvider, useTaskContext, getStatus } from './TaskContext.jsx'
import FlowView from './FlowView.jsx'
import ListView from './ListView.jsx'
import TaskModal from './TaskModal.jsx'

function AppInner() {
  const { state, dispatch } = useTaskContext()
  const { tasks, view } = state
  // undefined = closed, null = add mode, string id = edit mode
  const [modalTask, setModalTask] = useState(undefined)

  const total = Object.values(tasks).length
  const done = Object.values(tasks).filter(t => t.completed).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="1" y="5" width="6" height="12" rx="2" fill="#6366f1"/>
              <rect x="8" y="8" width="6" height="6" rx="2" fill="#818cf8"/>
              <rect x="15" y="9" width="6" height="4" rx="2" fill="#a5b4fc"/>
              <path d="M7 11h1M14 11h1" stroke="#6366f1" strokeWidth="1.5"/>
            </svg>
            <span className="logo-text">TaskFlow</span>
          </div>
        </div>

        <div className="header-center">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${view === 'flow' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'flow' })}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0.5" y="1" width="4" height="12" rx="1.5" fill="currentColor" opacity={view === 'flow' ? 1 : 0.5}/>
                <rect x="5" y="3" width="4" height="8" rx="1.5" fill="currentColor" opacity={view === 'flow' ? 1 : 0.5}/>
                <rect x="9.5" y="5" width="4" height="4" rx="1.5" fill="currentColor" opacity={view === 'flow' ? 1 : 0.5}/>
              </svg>
              Flow
            </button>
            <button
              className={`toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'list' })}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="12" height="2" rx="1" fill="currentColor" opacity={view === 'list' ? 1 : 0.5}/>
                <rect x="1" y="6" width="12" height="2" rx="1" fill="currentColor" opacity={view === 'list' ? 1 : 0.5}/>
                <rect x="1" y="10" width="8" height="2" rx="1" fill="currentColor" opacity={view === 'list' ? 1 : 0.5}/>
              </svg>
              List
            </button>
          </div>
        </div>

        <div className="header-right">
          {total > 0 && (
            <div className="header-progress">
              <div className="header-progress-bar">
                <div className="header-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="header-progress-text">{pct}%</span>
            </div>
          )}
          <button className="add-btn" onClick={() => setModalTask(null)}>
            <span className="add-btn-icon">+</span>
            <span className="add-btn-text">Add Task</span>
          </button>
        </div>
      </header>

      <main className="main">
        {view === 'flow' ? (
          <FlowView onNodeClick={id => setModalTask(id)} />
        ) : (
          <ListView onTaskClick={id => setModalTask(id)} />
        )}
      </main>

      {modalTask !== undefined && (
        <TaskModal taskId={modalTask} onClose={() => setModalTask(undefined)} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <TaskProvider>
      <AppInner />
    </TaskProvider>
  )
}
