import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { HeaderContent } from './shared/BlockPrimitives'

function HeaderBlock({ block }) {
  const style = useBlockStyles(block)
  return <HeaderContent content={block.content} style={style} blockId={block.id} />
}

export default memo(HeaderBlock)
