import { useEffect, useState, useCallback } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Copy,
  Trash2,
  Palette,
  Type,
  Layers
} from 'lucide-react';

export function ContextualFormatBar() {
  const { editor } = useEditor();
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [componentType, setComponentType] = useState('');
  const [tagName, setTagName] = useState('');
  const [fontSize, setFontSize] = useState('16');
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textAlign, setTextAlign] = useState('left');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  const updateStateFromComponent = useCallback((cmp) => {
    if (!cmp) {
      setSelectedComponent(null);
      return;
    }
    setSelectedComponent(cmp);
    const tag = (cmp.get('tagName') || '').toLowerCase();
    setTagName(tag);
    setComponentType(cmp.get('type') || 'default');

    const style = cmp.getStyle() || {};
    if (style['font-size']) {
      setFontSize(parseInt(style['font-size']) || 16);
    }
    if (style['color']) {
      setColor(style['color']);
    }
    if (style['background-color']) {
      setBgColor(style['background-color']);
    }
    if (style['text-align']) {
      setTextAlign(style['text-align']);
    }
    setIsBold(style['font-weight'] === 'bold' || parseInt(style['font-weight']) >= 700);
    setIsItalic(style['font-style'] === 'italic');
  }, []);

  useEffect(() => {
    if (!editor) return;

    const onSelect = () => {
      const cmp = editor.getSelected();
      updateStateFromComponent(cmp);
    };

    const onDeselect = () => {
      setSelectedComponent(null);
    };

    const onUpdate = () => {
      const cmp = editor.getSelected();
      if (cmp) updateStateFromComponent(cmp);
    };

    editor.on('component:selected', onSelect);
    editor.on('component:deselected', onDeselect);
    editor.on('component:update', onUpdate);

    // Initial check
    const current = editor.getSelected();
    if (current) updateStateFromComponent(current);

    return () => {
      editor.off('component:selected', onSelect);
      editor.off('component:deselected', onDeselect);
      editor.off('component:update', onUpdate);
    };
  }, [editor, updateStateFromComponent]);

  if (!selectedComponent) return null;

  const setStyleProperty = (prop, val) => {
    if (!selectedComponent) return;
    const currentStyle = selectedComponent.getStyle() || {};
    selectedComponent.setStyle({
      ...currentStyle,
      [prop]: val,
    });
    updateStateFromComponent(selectedComponent);
  };

  const handleFontSizeChange = (delta) => {
    const next = Math.max(8, Math.min(120, (parseInt(fontSize) || 16) + delta));
    setFontSize(next.toString());
    setStyleProperty('font-size', `${next}px`);
  };

  const toggleBold = () => {
    const next = !isBold;
    setIsBold(next);
    setStyleProperty('font-weight', next ? '700' : '400');
  };

  const toggleItalic = () => {
    const next = !isItalic;
    setIsItalic(next);
    setStyleProperty('font-style', next ? 'italic' : 'normal');
  };

  const handleDuplicate = () => {
    if (!editor || !selectedComponent) return;
    const parent = selectedComponent.parent();
    if (parent) {
      const clone = selectedComponent.clone();
      parent.append(clone);
      editor.select(clone);
    }
  };

  const handleDelete = () => {
    if (!editor || !selectedComponent) return;
    selectedComponent.remove();
    setSelectedComponent(null);
  };

  const isTextElement = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'button', 'label', 'b', 'strong', 'i', 'em'].includes(tagName) || componentType === 'text';

  return (
    <div className="canva-format-bar sticky top-2 z-40 self-center mx-auto my-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl shadow-slate-900/10 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
      {/* Component Tag Badge */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
        <Layers className="w-3 h-3 text-indigo-600" />
        <span>{tagName || componentType}</span>
      </div>

      <div className="h-4 w-px bg-slate-200 shrink-0" />

      {/* Text formatting options */}
      {isTextElement && (
        <>
          {/* Font Size controls */}
          <div className="flex items-center gap-0.5 bg-slate-100/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleFontSizeChange(-1)}
              className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
              title="Decrease font size"
            >
              -
            </button>
            <span className="w-8 text-center text-xs font-semibold font-mono text-slate-700">
              {fontSize}
            </span>
            <button
              type="button"
              onClick={() => handleFontSizeChange(1)}
              className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
              title="Increase font size"
            >
              +
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          {/* Bold & Italic */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleBold}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                isBold ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleItalic}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                isItalic ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          {/* Text Alignment */}
          <div className="flex items-center gap-0.5">
            {[
              { id: 'left', icon: AlignLeft },
              { id: 'center', icon: AlignCenter },
              { id: 'right', icon: AlignRight },
              { id: 'justify', icon: AlignJustify },
            ].map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setStyleProperty('text-align', id)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  textAlign === id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title={`Align ${id}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 shrink-0" />
        </>
      )}

      {/* Colors */}
      <div className="flex items-center gap-1.5">
        <label className="flex items-center gap-1 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors" title="Text Color">
          <Type className="w-3.5 h-3.5 text-slate-600" />
          <input
            type="color"
            value={color.length === 7 ? color : '#000000'}
            onChange={(e) => setStyleProperty('color', e.target.value)}
            className="w-5 h-5 rounded-full border border-slate-300 cursor-pointer"
          />
        </label>

        <label className="flex items-center gap-1 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors" title="Background Color">
          <Palette className="w-3.5 h-3.5 text-slate-600" />
          <input
            type="color"
            value={bgColor.length === 7 ? bgColor : '#ffffff'}
            onChange={(e) => setStyleProperty('background-color', e.target.value)}
            className="w-5 h-5 rounded-full border border-slate-300 cursor-pointer"
          />
        </label>
      </div>

      <div className="h-4 w-px bg-slate-200 shrink-0" />

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleDuplicate}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Duplicate Element"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
          title="Delete Element"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default ContextualFormatBar;
