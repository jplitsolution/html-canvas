import { z } from 'zod'
import { normalizeButtonContent } from '../utils/buttonLinks'

const VALID_TYPES = [
  'navbar', 'header', 'hero', 'text', 'typography', 'button', 'image',
  'card', 'form', 'divider', 'container', 'footer',
]

export const styleSchema = z.object({
  color: z.string().default('#1e293b'),
  backgroundColor: z.string().default('transparent'),
  backgroundImage: z.string().default(''),
  fontSize: z.string().default('16px'),
  fontWeight: z.string().default('400'),
  fontStyle: z.string().default('normal'),
  fontFamily: z.string().default('Inter'),
  lineHeight: z.string().default('1.5'),
  letterSpacing: z.string().default('0px'),
  textAlign: z.enum(['left', 'center', 'right']).default('left'),
  paddingTop: z.number().default(16),
  paddingBottom: z.number().default(16),
  paddingLeft: z.number().default(16),
  paddingRight: z.number().default(16),
  marginTop: z.number().default(0),
  marginBottom: z.number().default(0),
  borderRadius: z.number().default(0),
  borderWidth: z.number().default(0),
  borderStyle: z.enum(['solid', 'dashed', 'dotted', 'none']).default('solid'),
  borderColor: z.string().default('#e2e8f0'),
  width: z.string().default('100%'),
  height: z.string().default('auto'),
}).passthrough()

export const responsiveStylesSchema = z.object({
  desktop: styleSchema.default({}),
  tablet: styleSchema.partial().default({}),
  mobile: styleSchema.partial().default({}),
})

export const blockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(VALID_TYPES),
  parentId: z.string().nullable().default(null),
  content: z.record(z.unknown()).default({}),
  styles: z.union([styleSchema, responsiveStylesSchema]).default({}),
  style: z.union([styleSchema, responsiveStylesSchema]).optional(),
  children: z.array(z.string()).optional(),
})

export const VALID_BLOCK_TYPES = VALID_TYPES

export function normalizeStyles(styles) {
  const defaults = styleSchema.parse({})
  if (!styles) return { desktop: defaults, tablet: {}, mobile: {} }
  if (styles.desktop) {
    return {
      desktop: { ...defaults, ...styles.desktop },
      tablet: styles.tablet || {},
      mobile: styles.mobile || {},
    }
  }
  return { desktop: { ...defaults, ...styles }, tablet: {}, mobile: {} }
}

export function repairBlock(block) {
  let type = block.type
  if (type === 'text') type = 'typography'
  if (!VALID_TYPES.includes(type)) return null
  const content = type === 'button'
    ? normalizeButtonContent(block.content || {})
    : (block.content || {})

  const normStyles = normalizeStyles(block.styles || block.style)

  const repaired = {
    id: block.id || crypto.randomUUID(),
    type,
    parentId: block.parentId ?? null,
    content,
    styles: normStyles,
    style: normStyles,
    children: type === 'container' ? (block.children || []) : undefined,
  }
  const result = blockSchema.safeParse(repaired)
  return result.success ? result.data : null
}

export function validateBlock(block) {
  return blockSchema.safeParse(block)
}
