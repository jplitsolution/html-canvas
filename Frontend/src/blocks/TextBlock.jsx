import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { TextContent } from './shared/BlockPrimitives'

function TextBlock({ block }) {
  const style = useBlockStyles(block)
  return <TextContent content={block.content} style={style} />
}

export default memo(TextBlock)
