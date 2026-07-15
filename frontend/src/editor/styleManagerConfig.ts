import type { SectorProperties } from 'grapesjs'

/** GrapesJS default style sectors — width, flex, typography, etc. */
export const STYLE_MANAGER_SECTORS: SectorProperties[] = [
  {
    id: 'dimension',
    name: 'Size & Spacing',
    open: true,
    properties: [
      { type: 'slider', property: 'width', units: ['px', '%', 'vw'], min: 0, max: 1200 },
      { type: 'slider', property: 'height', units: ['px', '%', 'vh'], min: 0, max: 1200 },
      { type: 'slider', property: 'max-width', units: ['px', '%', 'vw'], min: 0, max: 1200 },
      { type: 'slider', property: 'min-height', units: ['px', '%', 'vh'], min: 0, max: 1200 },
      {
        type: 'composite',
        property: 'margin',
        properties: [
          { type: 'slider', property: 'margin-top', min: -500, max: 500, units: ['px', '%'] },
          { type: 'slider', property: 'margin-right', min: -500, max: 500, units: ['px', '%'] },
          { type: 'slider', property: 'margin-bottom', min: -500, max: 500, units: ['px', '%'] },
          { type: 'slider', property: 'margin-left', min: -500, max: 500, units: ['px', '%'] },
        ]
      },
      {
        type: 'composite',
        property: 'padding',
        properties: [
          { type: 'slider', property: 'padding-top', min: 0, max: 500, units: ['px', '%'] },
          { type: 'slider', property: 'padding-right', min: 0, max: 500, units: ['px', '%'] },
          { type: 'slider', property: 'padding-bottom', min: 0, max: 500, units: ['px', '%'] },
          { type: 'slider', property: 'padding-left', min: 0, max: 500, units: ['px', '%'] },
        ]
      }
    ],
  },
  {
    id: 'layout',
    name: 'Layout',
    open: true,
    properties: [
      'display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 
      { type: 'slider', property: 'gap', units: ['px', 'rem', 'em'], min: 0, max: 100 }
    ],
  },
  {
    id: 'position',
    name: 'Position',
    open: false,
    properties: [
      'position', 
      { type: 'slider', property: 'top', units: ['px', '%', 'vh'], min: -1000, max: 1000 },
      { type: 'slider', property: 'right', units: ['px', '%', 'vw'], min: -1000, max: 1000 },
      { type: 'slider', property: 'bottom', units: ['px', '%', 'vh'], min: -1000, max: 1000 },
      { type: 'slider', property: 'left', units: ['px', '%', 'vw'], min: -1000, max: 1000 },
      { type: 'slider', property: 'z-index', min: 0, max: 9999 }
    ],
  },
  {
    id: 'typography',
    name: 'Typography',
    open: false,
    properties: [
      'font-family',
      { type: 'slider', property: 'font-size', units: ['px', 'rem', 'em'], min: 0, max: 100 },
      'font-weight',
      { type: 'slider', property: 'letter-spacing', units: ['px', 'em'], min: -10, max: 20 },
      'color',
      { type: 'slider', property: 'line-height', units: ['px', 'em', '-'], min: 0, max: 100 },
      'text-align',
      'text-decoration',
      'text-shadow',
    ],
  },
  {
    id: 'decorations',
    name: 'Background & Border',
    open: false,
    properties: [
      'background-color', 
      'background', 
      { type: 'slider', property: 'border-radius', units: ['px', '%'], min: 0, max: 100 },
      'border', 
      'box-shadow'
    ],
  },
  {
    id: 'extra',
    name: 'Effects',
    open: false,
    properties: [
      { type: 'slider', property: 'opacity', min: 0, max: 1, step: 0.05 },
      'transition', 
      'transform', 
      'overflow'
    ],
  },
]
