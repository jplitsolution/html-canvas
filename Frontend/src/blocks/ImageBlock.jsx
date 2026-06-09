import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { ImageContent } from './shared/BlockPrimitives'

function ImageBlock({ block }) {
  const style = useBlockStyles(block)
  return <ImageContent content={block.content} style={style} />
}

export default memo(ImageBlock)
