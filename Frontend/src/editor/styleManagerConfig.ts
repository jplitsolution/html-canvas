import type { SectorProperties } from 'grapesjs'

/** GrapesJS default style sectors — width, flex, typography, etc. */
export const STYLE_MANAGER_SECTORS: SectorProperties[] = [
  {
    id: 'dimension',
    name: 'Size & Spacing',
    open: true,
    properties: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
  },
  {
    id: 'layout',
    name: 'Layout',
    open: true,
    properties: ['display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'gap'],
  },
  {
    id: 'position',
    name: 'Position',
    open: false,
    properties: ['position', 'top', 'right', 'bottom', 'left', 'z-index'],
  },
  {
    id: 'typography',
    name: 'Typography',
    open: false,
    properties: [
      'font-family',
      'font-size',
      'font-weight',
      'letter-spacing',
      'color',
      'line-height',
      'text-align',
      'text-decoration',
      'text-shadow',
    ],
  },
  {
    id: 'decorations',
    name: 'Background & Border',
    open: false,
    properties: ['background-color', 'background', 'border-radius', 'border', 'box-shadow'],
  },
  {
    id: 'extra',
    name: 'Effects',
    open: false,
    properties: ['opacity', 'transition', 'transform', 'overflow'],
  },
]
