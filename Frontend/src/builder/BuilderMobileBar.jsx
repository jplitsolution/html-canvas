import { memo } from 'react'
import { Blocks, Settings2 } from 'lucide-react'
import Button from '../components/ui/Button'

function BuilderMobileBar({ activePanel, onToggleToolbox, onToggleProperties }) {
  return (
    <nav
      className="lg:hidden shrink-0 border-t border-border glass safe-bottom flex items-center gap-2 px-3 py-2"
      aria-label="Builder panels"
    >
      <Button
        variant={activePanel === 'toolbox' ? 'primary' : 'outline'}
        size="sm"
        className="flex-1"
        onClick={onToggleToolbox}
        aria-pressed={activePanel === 'toolbox'}
      >
        <Blocks className="w-4 h-4" />
        Components
      </Button>
      <Button
        variant={activePanel === 'properties' ? 'primary' : 'outline'}
        size="sm"
        className="flex-1"
        onClick={onToggleProperties}
        aria-pressed={activePanel === 'properties'}
      >
        <Settings2 className="w-4 h-4" />
        Properties
      </Button>
    </nav>
  )
}

export default memo(BuilderMobileBar)
