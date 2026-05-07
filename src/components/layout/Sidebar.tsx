import type React from 'react'
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, User, FileText, Wand2, MessageSquareText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profiles', label: 'Profiles', icon: User },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/generate', label: 'Generate', icon: Wand2 },
  { to: '/prompts', label: 'Prompts', icon: MessageSquareText },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export default function Sidebar() {
  const [version, setVersion] = useState<string>('...')

  useEffect(() => {
    window.api.updatesGetVersion().then(setVersion)
  }, [])

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* pt-8 clears macOS traffic lights (hiddenInset ~28px) */}
      <div className="px-4 pt-8 pb-3" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <h1 className="text-sidebar-foreground font-semibold text-[15px] leading-tight" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          Calibrate
        </h1>
      </div>

      <nav className="flex-1 py-2 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )
            }
          >
            <Icon size={15} strokeWidth={1.7} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3">
        <p className="text-sidebar-foreground/30 text-xs">v{version}</p>
      </div>
    </aside>
  )
}
