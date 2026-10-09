// =============================================================================
// FILE:    apps/web/src/shared/components/ui/command-menu.tsx
// PURPOSE: The Ctrl/⌘ + K command palette: jump to any section, switch theme.
//          Built on cmdk inside our Radix dialog for focus and accessibility.
// USED BY: app shell (owns open state, the shortcut, and the nav commands)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Command } from 'cmdk'
import { Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { ThemeChoice } from '../../lib/theme-storage'
import { Dialog, DialogContent, DialogTitle } from './dialog'
import { useTheme } from '../../hooks/use-theme'

// ---- Types ------------------------------------------------------------------

/** One "go to" entry; the shell passes its real navigation items. */
export type CommandMenuNavigation = {
  label: string
  path: string
  Icon: LucideIcon
}

export type CommandMenuProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  navigationCommands: ReadonlyArray<CommandMenuNavigation>
}

// ---- Constants --------------------------------------------------------------

/** Commands that change the theme. */
const THEME_COMMANDS: ReadonlyArray<{ label: string; choice: ThemeChoice; Icon: LucideIcon }> = [
  { label: 'Theme: Light', choice: 'light', Icon: Sun },
  { label: 'Theme: Dark', choice: 'dark', Icon: Moon },
  { label: 'Theme: System', choice: 'system', Icon: Monitor },
]

/** Shared classes for one command row, so both groups render identically. */
const commandItemClasses =
  'flex cursor-pointer items-center gap-2.5 rounded-control px-3 py-2 text-sm text-primary outline-none data-[selected=true]:bg-sunken'

// ---- Component --------------------------------------------------------------

/**
 * The command palette dialog. Mount once inside the router context; the shell
 * toggles `isOpen` from its Ctrl/⌘ + K listener.
 */
export function CommandMenu({ isOpen, onOpenChange, navigationCommands }: CommandMenuProps) {
  const navigate = useNavigate()
  const { setThemeChoice } = useTheme()

  function runNavigationCommand(path: string) {
    onOpenChange(false)
    void navigate({ to: path })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="p-0 overflow-hidden sm:top-[20%] sm:translate-y-0">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <Command
          label="Command menu"
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-muted"
        >
          <Command.Input
            placeholder="Type a command or search…"
            className="w-full border-b border-subtle bg-transparent px-4 py-3.5 text-sm text-primary outline-none placeholder:text-muted"
          />
          <Command.List className="max-h-72 overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted">No matching command.</Command.Empty>

            <Command.Group heading="Navigate">
              {navigationCommands.map(({ label, path, Icon }) => (
                <Command.Item
                  key={path}
                  value={label}
                  onSelect={() => runNavigationCommand(path)}
                  className={commandItemClasses}
                >
                  <Icon className="size-4 text-muted" aria-hidden />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Theme">
              {THEME_COMMANDS.map(({ label, choice, Icon }) => (
                <Command.Item
                  key={choice}
                  value={label}
                  onSelect={() => {
                    setThemeChoice(choice)
                    onOpenChange(false)
                  }}
                  className={commandItemClasses}
                >
                  <Icon className="size-4 text-muted" aria-hidden />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
