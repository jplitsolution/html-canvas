import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { FooterContent } from './shared/BlockPrimitives'

function FooterBlock({ block }) {
  const style = useBlockStyles(block)
  return <FooterContent content={block.content} style={style} blockId={block.id} />
}

export default memo(FooterBlock)
