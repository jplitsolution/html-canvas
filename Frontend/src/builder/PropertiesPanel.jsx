import { memo, useState, useCallback, useMemo } from 'react'
import useStore from '../store/useStore'
import { getBlock } from '../registry/index'
import { getBlockById } from '../utils/blockUtils'
import { isStyleInherited } from '../utils/responsiveStyles'
import Panel from '../components/ui/Panel'
import EmptyState from '../components/ui/EmptyState'
import FormField from '../components/ui/FormField'
import ColorField from '../components/ui/ColorField'
import SliderField from '../components/ui/SliderField'
import LinksEditor from '../components/ui/LinksEditor'
import UrlsEditor from '../components/ui/UrlsEditor'
import { getButtonLinks } from '../utils/buttonLinks'

function RegistryField({ field, block, updateBlock, previewMode }) {
  const updateContent = useCallback((key, value) => {
    updateBlock(block.id, { content: { [key]: value } })
  }, [block.id, updateBlock])

  const updateStyle = useCallback((key, value) => {
    updateBlock(block.id, { styles: { [key]: value } })
  }, [block.id, updateBlock])

  const s = block.styles?.desktop ? block.styles : { desktop: block.styles || {}, tablet: {}, mobile: {} }
  const resolved = { ...s.desktop, ...s[previewMode] }

  if (field.scope === 'content') {
    const value = block.content?.[field.key]
    if (field.type === 'links') {
      return (
        <LinksEditor
          label={field.label}
          links={value || []}
          onChange={(v) => updateContent(field.key, v)}
        />
      )
    }
    if (field.type === 'urls') {
      const urls = field.key === 'buttonLinks' ? getButtonLinks(block.content) : (value || [])
      return (
        <UrlsEditor
          label={field.label}
          urls={urls}
          onChange={(v) => updateContent(field.key, v)}
        />
      )
    }
    if (field.type === 'textarea') {
      return (
        <FormField
          label={field.label}
          type="textarea"
          value={value}
          onChange={(v) => updateContent(field.key, v)}
          rows={field.key === 'text' ? 5 : 3}
        />
      )
    }
    return (
      <FormField
        label={field.label}
        type={field.type === 'number' ? 'number' : 'text'}
        value={field.type === 'number' ? String(value ?? '') : value}
        onChange={(v) => updateContent(field.key, field.type === 'number' ? Number(v) : v)}
      />
    )
  }

  if (field.scope === 'styles') {
    if (field.type === 'color') {
      return (
        <ColorField
          label={field.label}
          value={resolved[field.key]}
          onChange={(v) => updateStyle(field.key, v)}
          inherited={isStyleInherited(block.styles, previewMode, field.key)}
        />
      )
    }
    if (field.type === 'slider') {
      return (
        <SliderField
          label={field.label}
          value={resolved[field.key] ?? 0}
          onChange={(v) => updateStyle(field.key, v)}
          min={field.min ?? 0}
          max={field.max ?? 100}
          inherited={isStyleInherited(block.styles, previewMode, field.key)}
        />
      )
    }
    if (field.type === 'image') {
      const imageUrl = resolved[field.key] || ''
      return (
        <div className="space-y-2">
          <FormField
            label={field.label}
            value={imageUrl}
            onChange={(v) => updateStyle(field.key, v)}
            placeholder="https://example.com/background.jpg"
          />
          {imageUrl && (
            <div
              className="h-20 rounded-lg border border-border overflow-hidden bg-bg-muted"
              style={{
                backgroundImage: `url("${imageUrl.replace(/"/g, '%22')}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}
        </div>
      )
    }
    return (
      <FormField
        label={field.label}
        value={resolved[field.key]}
        onChange={(v) => updateStyle(field.key, v)}
      />
    )
  }

  return null
}

function ContentTab({ block, updateBlock }) {
  const def = getBlock(block.type)
  const contentFields = (def?.propertyPanel || []).filter((f) => f.scope === 'content')

  if (!contentFields.length) {
    return <p className="text-sm text-fg-muted">No content properties.</p>
  }

  return (
    <div className="space-y-4">
      {contentFields.map((field) => (
        <RegistryField key={field.key} field={field} block={block} updateBlock={updateBlock} />
      ))}
    </div>
  )
}

function DesignTab({ block, updateBlock }) {
  const previewMode = useStore((s) => s.previewMode)
  const def = getBlock(block.type)
  const styleFields = (def?.propertyPanel || []).filter((f) => f.scope === 'styles')

  return (
    <div className="space-y-5">
      <p className="text-xs text-fg-subtle capitalize">Editing: {previewMode} styles</p>
      {styleFields.map((field) => (
        <RegistryField
          key={field.key}
          field={field}
          block={block}
          updateBlock={updateBlock}
          previewMode={previewMode}
        />
      ))}
      {block.type === 'text' && (
        <div className="space-y-3 pt-2 border-t border-border">
          <h4 className="text-xs font-semibold text-fg-muted uppercase">Typography</h4>
          <RegistryField
            field={{ key: 'fontWeight', label: 'Font Weight', type: 'slider', scope: 'styles', min: 300, max: 700 }}
            block={block}
            updateBlock={updateBlock}
            previewMode={previewMode}
          />
        </div>
      )}
      <div className="space-y-3 pt-2 border-t border-border">
        <h4 className="text-xs font-semibold text-fg-muted uppercase">Layout Spacing</h4>
        {['paddingLeft', 'paddingRight', 'marginTop', 'marginBottom'].map((key) => (
          <RegistryField
            key={key}
            field={{
              key,
              label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
              type: 'slider',
              scope: 'styles',
              min: 0,
              max: key.includes('margin') ? 80 : 120,
            }}
            block={block}
            updateBlock={updateBlock}
            previewMode={previewMode}
          />
        ))}
      </div>
      <div className="space-y-3 pt-2 border-t border-border">
        <h4 className="text-xs font-semibold text-fg-muted uppercase">Borders & Radius</h4>
        {['borderRadius', 'borderWidth'].map((key) => (
          <RegistryField
            key={key}
            field={{
              key,
              label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
              type: 'slider',
              scope: 'styles',
              min: 0,
              max: key === 'borderRadius' ? 48 : 10,
            }}
            block={block}
            updateBlock={updateBlock}
            previewMode={previewMode}
          />
        ))}
      </div>
    </div>
  )
}

function PropertiesPanel() {
  const [tab, setTab] = useState('content')
  const selectedBlockId = useStore((s) => s.selectedBlockId)
  const layout = useStore((s) => s.layout)
  const updateBlock = useStore((s) => s.updateBlock)
  const block = useMemo(
    () => (selectedBlockId ? getBlockById(layout, selectedBlockId) : null),
    [selectedBlockId, layout]
  )

  return (
    <Panel title="Properties" className="w-[280px] border-l">
      {!block ? (
        <EmptyState
          title="No block selected"
          description="Click a block on the canvas to edit its properties"
        />
      ) : (
        <>
          <div className="flex border-b border-border" role="tablist">
            {['content', 'design'].map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4" role="tabpanel">
            {tab === 'content'
              ? <ContentTab block={block} updateBlock={updateBlock} />
              : <DesignTab block={block} updateBlock={updateBlock} />}
          </div>
        </>
      )}
    </Panel>
  )
}

export default memo(PropertiesPanel)
