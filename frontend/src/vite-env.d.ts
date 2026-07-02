/// <reference types="vite/client" />

declare module '*.css' {
  const content: string
  export default content
}

declare module 'grapesjs-preset-webpage' {
  import type { Plugin } from 'grapesjs'
  const plugin: Plugin
  export default plugin
}
