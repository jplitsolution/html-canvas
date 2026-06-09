import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { FormContent } from './shared/BlockPrimitives'

function FormBlock({ block }) {
  const style = useBlockStyles(block)
  return <FormContent content={block.content} style={style} />
}

export default memo(FormBlock)
