import React, { createContext, useContext, useReducer, useEffect } from 'react'

const TaskContext = createContext()

// --- Sample Data ---
const SAMPLE_TASKS = {
  't1': { id: 't1', title: 'Research market', completed: false, prereqs: [], dependents: ['t2', 't3'], position: null },
  't2': { id: 't2', title: 'Define MVP features', completed: false, prereqs: ['t1'], dependents: ['t4', 't5'], position: null },
  't3': { id: 't3', title: 'Competitor analysis', completed: false, prereqs: ['t1'], dependents: ['t4'], position: null },
  't4': { id: 't4', title: 'Design UI mockups', completed: false, prereqs: ['t2', 't3'], dependents: ['t6'], position: null },
  't5': { id: 't5', title: 'Set up dev environment', completed: false, prereqs: ['t2'], dependents: ['t6', 't7'], position: null },
  't6': { id: 't6', title: 'Build frontend', completed: false, prereqs: ['t4', 't5'], dependents: ['t8'], position: null },
  't7': { id: 't7', title: 'Build backend API', completed: false, prereqs: ['t5'], dependents: ['t8'], position: null },
  't8': { id: 't8', title: 'QA & testing', completed: false, prereqs: ['t6', 't7'], dependents: ['t9'], position: null },
  't9': { id: 't9', title: 'Deploy & launch', completed: false, prereqs: ['t8'], dependents: [], position: null },
}

const getInitialState = () => {
  try {
    const stored = localStorage.getItem('taskflow-v1')
    if (stored) return JSON.parse(stored)
  } catch {}
  return { tasks: SAMPLE_TASKS, view: 'flow' }
}

// --- Derived Status ---
export function getStatus(task, tasks) {
  if (task.completed) return 'completed'
  const allDone = task.prereqs.every(id => tasks[id]?.completed)
  return allDone ? 'available' : 'blocked'
}

// --- Cycle Detection ---
export function wouldCreateCycle(tasks, fromId, toId) {
  // Would adding edge fromId -> toId create a cycle?
  // DFS from toId following dependents; if we hit fromId, it's a cycle
  const visited = new Set()
  const stack = [toId]
  while (stack.length) {
    const cur = stack.pop()
    if (cur === fromId) return true
    if (visited.has(cur)) continue
    visited.add(cur)
    tasks[cur]?.dependents.forEach(d => stack.push(d))
  }
  return false
}

// --- Bidirectional Sync Helper ---
function syncRelationships(tasks, taskId, newPrereqs, newDependents) {
  const updated = { ...tasks }
  const oldTask = tasks[taskId]
  const oldPrereqs = oldTask?.prereqs ?? []
  const oldDependents = oldTask?.dependents ?? []

  // Prereqs removed: remove taskId from their dependents
  oldPrereqs.filter(id => !newPrereqs.includes(id)).forEach(id => {
    if (updated[id]) updated[id] = { ...updated[id], dependents: updated[id].dependents.filter(d => d !== taskId) }
  })
  // Prereqs added: add taskId to their dependents
  newPrereqs.filter(id => !oldPrereqs.includes(id)).forEach(id => {
    if (updated[id] && !updated[id].dependents.includes(taskId))
      updated[id] = { ...updated[id], dependents: [...updated[id].dependents, taskId] }
  })

  // Dependents removed: remove taskId from their prereqs
  oldDependents.filter(id => !newDependents.includes(id)).forEach(id => {
    if (updated[id]) updated[id] = { ...updated[id], prereqs: updated[id].prereqs.filter(p => p !== taskId) }
  })
  // Dependents added: add taskId to their prereqs
  newDependents.filter(id => !oldDependents.includes(id)).forEach(id => {
    if (updated[id] && !updated[id].prereqs.includes(taskId))
      updated[id] = { ...updated[id], prereqs: [...updated[id].prereqs, taskId] }
  })

  return updated
}

// --- Reducer ---
function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TASK': {
      const { title, prereqs, dependents } = action.payload
      const id = `t${Date.now()}`
      const newTask = { id, title, completed: false, prereqs, dependents, position: null }
      let tasks = { ...state.tasks, [id]: newTask }
      tasks = syncRelationships(tasks, id, prereqs, dependents)
      return { ...state, tasks }
    }

    case 'EDIT_TASK': {
      const { id, title, prereqs, dependents } = action.payload
      let tasks = syncRelationships(state.tasks, id, prereqs, dependents)
      tasks[id] = { ...tasks[id], title, prereqs, dependents }
      return { ...state, tasks }
    }

    case 'TOGGLE_DONE': {
      const { id } = action.payload
      return {
        ...state,
        tasks: { ...state.tasks, [id]: { ...state.tasks[id], completed: !state.tasks[id].completed } }
      }
    }

    case 'DELETE_TASK': {
      const { id } = action.payload
      const tasks = { ...state.tasks }
      // Remove from other tasks' prereqs/dependents
      Object.keys(tasks).forEach(tid => {
        if (tid === id) return
        tasks[tid] = {
          ...tasks[tid],
          prereqs: tasks[tid].prereqs.filter(p => p !== id),
          dependents: tasks[tid].dependents.filter(d => d !== id),
        }
      })
      delete tasks[id]
      return { ...state, tasks }
    }

    case 'SET_POSITIONS': {
      const tasks = { ...state.tasks }
      Object.entries(action.payload).forEach(([id, pos]) => {
        if (tasks[id]) tasks[id] = { ...tasks[id], position: pos }
      })
      return { ...state, tasks }
    }

    case 'SET_VIEW':
      return { ...state, view: action.payload }

    case 'LOAD':
      return action.payload

    default:
      return state
  }
}

// --- Provider ---
export function TaskProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState)

  useEffect(() => {
    localStorage.setItem('taskflow-v1', JSON.stringify(state))
  }, [state])

  return (
    <TaskContext.Provider value={{ state, dispatch }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTaskContext() {
  return useContext(TaskContext)
}
