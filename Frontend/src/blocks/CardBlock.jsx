import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { CardContent } from './shared/BlockPrimitives'

function CardBlock({ block }) {
  const style = useBlockStyles(block)
  return <CardContent content={block.content} style={style} />
}

export default memo(CardBlock)
