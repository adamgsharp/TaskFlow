import React, { useCallback, useMemo, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { useTaskContext, getStatus } from './TaskContext.jsx'
import TaskNode from './TaskNode.jsx'

const NODE_WIDTH = 220
const NODE_HEIGHT = 64

function computeLayout(tasks) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 110, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  Object.values(tasks).forEach(t => g.setNode(t.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  Object.values(tasks).forEach(t => {
    t.prereqs.forEach(prereqId => {
      if (tasks[prereqId]) g.setEdge(prereqId, t.id)
    })
  })

  dagre.layout(g)

  const positions = {}
  Object.keys(tasks).forEach(id => {
    const n = g.node(id)
    if (n) positions[id] = { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 }
  })
  return positions
}

const nodeTypes = { taskNode: TaskNode }

export default function FlowView({ onNodeClick }) {
  const { state, dispatch } = useTaskContext()
  const { tasks } = state
  const initialLayoutDone = useRef(false)

  const buildFlowData = useCallback((tasks, positions) => {
    const nodes = Object.values(tasks).map(t => ({
      id: t.id,
      type: 'taskNode',
      position: positions?.[t.id] ?? t.position ?? { x: 0, y: 0 },
      data: { task: t, status: getStatus(t, tasks), onNodeClick },
      draggable: true,
    }))

    const edges = []
    const seen = new Set()
    Object.values(tasks).forEach(t => {
      t.prereqs.forEach(prereqId => {
        if (!tasks[prereqId]) return
        const edgeId = `${prereqId}->${t.id}`
        if (seen.has(edgeId)) return
        seen.add(edgeId)
        const sourceCompleted = tasks[prereqId].completed
        edges.push({
          id: edgeId,
          source: prereqId,
          target: t.id,
          type: 'smoothstep',
          animated: sourceCompleted,
          style: { stroke: sourceCompleted ? '#22c55e' : '#94a3b8', strokeWidth: 2 },
        })
      })
    })

    return { nodes, edges }
  }, [onNodeClick])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Initial layout run
  useEffect(() => {
    if (!initialLayoutDone.current) {
      const needsLayout = Object.values(tasks).some(t => !t.position)
      if (needsLayout) {
        const positions = computeLayout(tasks)
        dispatch({ type: 'SET_POSITIONS', payload: positions })
        const { nodes: n, edges: e } = buildFlowData(tasks, positions)
        setNodes(n)
        setEdges(e)
      } else {
        const { nodes: n, edges: e } = buildFlowData(tasks)
        setNodes(n)
        setEdges(e)
      }
      initialLayoutDone.current = true
    }
  }, []) // eslint-disable-line

  // Update on task changes (after initial layout)
  useEffect(() => {
    if (!initialLayoutDone.current) return
    const { nodes: n, edges: e } = buildFlowData(tasks)
    setNodes(n)
    setEdges(e)
  }, [tasks, buildFlowData]) // eslint-disable-line

  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes)
    const posChanges = changes.filter(c => c.type === 'position' && c.dragging === false && c.position)
    if (posChanges.length) {
      const positions = {}
      posChanges.forEach(c => { positions[c.id] = c.position })
      dispatch({ type: 'SET_POSITIONS', payload: positions })
    }
  }, [onNodesChange, dispatch])

  const handleAutoArrange = useCallback(() => {
    const positions = computeLayout(tasks)
    dispatch({ type: 'SET_POSITIONS', payload: positions })
    setNodes(prev => prev.map(n => ({ ...n, position: positions[n.id] ?? n.position })))
  }, [tasks, dispatch, setNodes])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={n => {
            const s = n.data?.status
            if (s === 'completed') return '#22c55e'
            if (s === 'available') return '#3b82f6'
            return '#94a3b8'
          }}
          maskColor="rgba(248,250,252,0.7)"
          style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
        />
        <Panel position="top-right">
          <button className="arrange-btn" onClick={handleAutoArrange}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}>
              <rect x="1" y="2" width="3" height="10" rx="1" fill="currentColor"/>
              <rect x="5.5" y="4" width="3" height="6" rx="1" fill="currentColor"/>
              <rect x="10" y="5" width="3" height="4" rx="1" fill="currentColor"/>
            </svg>
            Auto Arrange
          </button>
        </Panel>
      </ReactFlow>
    </div>
  )
}
