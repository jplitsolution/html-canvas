import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { HeroContent } from './shared/BlockPrimitives'

function HeroBlock({ block }) {
  const style = useBlockStyles(block)
  return <HeroContent content={block.content} style={style} />
}

export default memo(HeroBlock)
