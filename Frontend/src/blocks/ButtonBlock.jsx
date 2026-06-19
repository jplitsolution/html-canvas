import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { ButtonContent } from './shared/BlockPrimitives'

function ButtonBlock({ block }) {
  const style = useBlockStyles(block)
  return <ButtonContent content={block.content} style={style} blockId={block.id} />
}

export default memo(ButtonBlock)
