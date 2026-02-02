'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProjectActivity {
  project_key: string
  events: number
  users: number
}

interface ProjectActivityChartProps {
  accountId: string
}

export default function ProjectActivityChart({ accountId }: ProjectActivityChartProps) {
  const [projects, setProjects] = useState<ProjectActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProjectActivity() {
      const supabase = createClient()
      
      // Fetch project data (only ACC/BIM360 has project_key)
      const { data, error } = await supabase
        .from('usage_facts')
        .select('project_key, metric_events, user_key')
        .eq('account_id', accountId)
        .not('project_key', 'is', null)

      if (error) {
        console.error('Error fetching project activity:', error)
        setLoading(false)
        return
      }

      // Aggregate by project
      const projectMap = new Map<string, ProjectActivity>()
      const userSet = new Set<string>()
      
      data?.forEach((row) => {
        if (!row.project_key) return
        
        const existing = projectMap.get(row.project_key) || {
          project_key: row.project_key,
          events: 0,
          users: 0,
        }
        
        existing.events += Number(row.metric_events) || 0
        if (row.user_key) {
          userSet.add(`${row.project_key}-${row.user_key}`)
        }
        
        projectMap.set(row.project_key, existing)
      })

      // Count unique users per project
      const userCounts = new Map<string, Set<string>>()
      data?.forEach((row) => {
        if (row.project_key && row.user_key) {
          if (!userCounts.has(row.project_key)) {
            userCounts.set(row.project_key, new Set())
          }
          userCounts.get(row.project_key)!.add(row.user_key)
        }
      })

      // Update user counts
      const projectsList = Array.from(projectMap.values()).map((proj) => ({
        ...proj,
        users: userCounts.get(proj.project_key)?.size || 0,
      }))

      // Sort by events descending
      projectsList.sort((a, b) => b.events - a.events)

      setProjects(projectsList.slice(0, 20)) // Top 20 projects
      setLoading(false)
    }

    loadProjectActivity()
  }, [accountId])

  if (loading) {
    return (
      <div className="text-slate-400 text-sm">Loading project activity...</div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-slate-400 text-sm">No project data available</div>
    )
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toLocaleString()
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div key={project.project_key} className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800">
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{project.project_key}</div>
            <div className="text-slate-400 text-xs mt-1">
              {project.users} {project.users === 1 ? 'user' : 'users'}
            </div>
          </div>
          <div className="text-right ml-4">
            <div className="text-white text-sm font-semibold">{formatNumber(project.events)}</div>
            <div className="text-slate-400 text-xs">events</div>
          </div>
        </div>
      ))}
    </div>
  )
}
