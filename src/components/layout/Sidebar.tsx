import type React from 'react'
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, User, Wand2, MessageSquareText, Settings, Menu, Briefcase, GitBranch, Building2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profiles', label: 'Profiles', icon: User },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/applications', label: 'Applications', icon: Send },
  { to: '/generate', label: 'Generate', icon: Wand2 },
  { to: '/prompts', label: 'Prompts', icon: MessageSquareText },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export default function Sidebar() {
  const [version, setVersion] = useState<string>('...')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    window.api.updatesGetVersion().then(setVersion)
  }, [])

  return (
    <aside
      className={cn(
        'flex-shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-[52px]' : 'w-[220px]'
      )}
    >
      {/* pt-8 clears macOS traffic lights (hiddenInset ~28px) */}
      <div
        className={cn('pt-8 pb-3 flex items-center justify-between', collapsed ? 'px-2' : 'px-4')}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {!collapsed && (
          <h1
            className="text-sidebar-foreground font-semibold text-[15px] leading-tight"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            Calibrate
          </h1>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className={cn(
            'text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md p-1 transition-colors',
            collapsed && 'mx-auto'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu size={15} strokeWidth={1.7} />
        </button>
      </div>

      <nav className="flex-1 py-2 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-md text-sm transition-colors',
                collapsed ? 'justify-center px-0 py-[9px]' : 'gap-2.5 px-2.5 py-[7px]',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )
            }
          >
            <Icon size={15} strokeWidth={1.7} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="px-4 py-3">
          <p className="text-sidebar-foreground/30 text-xs">v{version}</p>
        </div>
      )}
    </aside>
  )
}
