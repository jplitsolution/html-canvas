import { memo } from 'react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { DividerContent } from './shared/BlockPrimitives'

function DividerBlock({ block }) {
  const style = useBlockStyles(block)
  return <DividerContent style={style} />
}

export default memo(DividerBlock)
