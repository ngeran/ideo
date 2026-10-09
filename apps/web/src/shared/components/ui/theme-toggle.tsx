// =============================================================================
// FILE:    apps/web/src/shared/components/ui/theme-toggle.tsx
// PURPOSE: Dropdown letting the user pick Light, Dark, or System theme; the
//          choice is remembered per device by theme-storage.
// USED BY: app sidebar (desktop), app top bar (mobile)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Monitor, Moon, Sun } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTheme } from '../../hooks/use-theme'
import { mergeComponentClasses } from '../../lib/merge-component-classes'
import type { ThemeChoice } from '../../lib/theme-storage'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './dropdown-menu'

// ---- Types ------------------------------------------------------------------
export type ThemeToggleProps = ComponentProps<typeof Button>

// ---- Constants --------------------------------------------------------------

/** The three choices with their icon and label, in menu order. */
const THEME_OPTIONS: ReadonlyArray<{ choice: ThemeChoice; label: string; Icon: typeof Sun }> = [
  { choice: 'light', label: 'Light', Icon: Sun },
  { choice: 'dark', label: 'Dark', Icon: Moon },
  { choice: 'system', label: 'System', Icon: Monitor },
]

// ---- Component --------------------------------------------------------------

/**
 * Icon button showing the currently resolved theme (sun or moon); opens the
 * choice menu. `system` shows the monitor icon on the button.
 */
export function ThemeToggle({ className, ...buttonProps }: ThemeToggleProps) {
  const { themeChoice, resolvedTheme, setThemeChoice } = useTheme()

  const ResolvedThemeIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Theme: ${themeChoice}. Open theme menu`}
          className={mergeComponentClasses('text-muted hover:text-primary', className)}
          {...buttonProps}
        >
          <ResolvedThemeIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {THEME_OPTIONS.map(({ choice, label, Icon }) => (
          <DropdownMenuItem
            key={choice}
            aria-label={`Use the ${label} theme`}
            onSelect={() => setThemeChoice(choice)}
            className={mergeComponentClasses(themeChoice === choice && 'text-accent')}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
