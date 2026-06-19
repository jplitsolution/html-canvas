import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { NavBarContent } from './shared/BlockPrimitives'

function NavbarBlock({ block }) {
  const style = useBlockStyles(block)
  return <NavBarContent content={block.content} style={style} blockId={block.id} />
}

export default memo(NavbarBlock)
