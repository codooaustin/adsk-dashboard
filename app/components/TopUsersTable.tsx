'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchTopUsersData, TopUserData } from '@/lib/dashboard/topUsers'

interface TopUsersTableProps {
  accountId: string
  limit?: number
}

export default function TopUsersTable({ accountId, limit = 20 }: TopUsersTableProps) {
  const [users, setUsers] = useState<TopUserData[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'tokens' | 'events' | 'hours'>('tokens')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    async function loadTopUsers() {
      const supabase = createClient()
      
      try {
        // Fetch aggregated user data from raw tables
        const data = await fetchTopUsersData(accountId, limit * 2, supabase) // Fetch more for sorting

        // Sort by selected column
        const sorted = [...data].sort((a, b) => {
          let aVal: number, bVal: number
          switch (sortBy) {
            case 'events':
              aVal = a.events
              bVal = b.events
              break
            case 'hours':
              aVal = a.usage_hours || 0
              bVal = b.usage_hours || 0
              break
            default:
              aVal = a.tokens
              bVal = b.tokens
          }
          
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
        })

        setUsers(sorted.slice(0, limit))
      } catch (error) {
        console.error('Error fetching top users:', error)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    loadTopUsers()
  }, [accountId, limit, sortBy, sortOrder])

  const handleSort = (column: 'tokens' | 'events' | 'hours') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toLocaleString()
  }

  if (loading) {
    return (
      <div className="text-slate-400 text-sm">Loading users...</div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-slate-400 text-sm">No user data available</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-2 px-3 text-slate-300 font-semibold">User</th>
            <th 
              className="text-right py-2 px-3 text-slate-300 font-semibold cursor-pointer hover:text-white"
              onClick={() => handleSort('tokens')}
            >
              Tokens {sortBy === 'tokens' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="text-right py-2 px-3 text-slate-300 font-semibold cursor-pointer hover:text-white"
              onClick={() => handleSort('events')}
            >
              Events {sortBy === 'events' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="text-right py-2 px-3 text-slate-300 font-semibold cursor-pointer hover:text-white"
              onClick={() => handleSort('hours')}
            >
              Hours {sortBy === 'hours' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.user_key} className="border-b border-slate-800 hover:bg-slate-900">
              <td className="py-2 px-3 text-white">{user.user_key}</td>
              <td className="py-2 px-3 text-slate-300 text-right">{formatNumber(user.tokens)}</td>
              <td className="py-2 px-3 text-slate-300 text-right">{formatNumber(user.events)}</td>
              <td className="py-2 px-3 text-slate-300 text-right">
                {user.usage_hours > 0 ? formatNumber(user.usage_hours) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
