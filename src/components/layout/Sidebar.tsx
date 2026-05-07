import type React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, User, FileText, Wand2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profiles', label: 'Profiles', icon: User },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/generate', label: 'Generate', icon: Wand2 },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export default function Sidebar() {
  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* pt-8 clears macOS traffic lights (hiddenInset ~28px) */}
      <div className="px-4 pt-8 pb-4 border-b border-sidebar-border" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <h1 className="text-sidebar-foreground font-semibold text-[15px] leading-tight" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          Calibrate
        </h1>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-sidebar-foreground/40 text-xs">v0.1.0</p>
      </div>
    </aside>
  )
}
