import React, { useState, useCallback, useMemo, useEffect } from 'react';
import './styles/globals.css';
import Topbar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import PropertiesPanel from './components/layout/PropertiesPanel';
import Canvas from './components/canvas/Canvas';
import { COMPONENT_GROUPS } from './data/components';

// Helper to get default properties for initial sections
const getInitialBlocks = () => {
  const navDefault = COMPONENT_GROUPS.find(g => g.id === 'NAVIGATION')?.items[0];
  const heroDefault = COMPONENT_GROUPS.find(g => g.id === 'HERO_SECTIONS')?.items[0];
  
  return [
    {
      id: 'navbar-section',
      title: navDefault?.title || 'Navbar Section',
      description: navDefault?.description || '',
      icon: navDefault?.icon || 'ti-layout-navbar',
      properties: { ...navDefault?.defaultProps }
    },
    {
      id: 'header-section',
      title: heroDefault?.title || 'Header Section',
      description: heroDefault?.description || '',
      icon: heroDefault?.icon || 'ti-layout-board-split',
      properties: { ...heroDefault?.defaultProps }
    }
  ];
};

export default function App() {
  const [blocks, setBlocks] = useState(getInitialBlocks());
  const [selectedBlockId, setSelectedBlockId] = useState('header-section');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [zoom, setZoom] = useState(100);
  
  // Modals & Preview States
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);

  // Undo / Redo History Stack State
  const [history, setHistory] = useState([getInitialBlocks()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  // Core callback to push state changes to history
  const updateBlocksState = useCallback((newBlocks, markDirty = true) => {
    setBlocks(newBlocks);
    
    // Manage history queue
    const updatedHistory = history.slice(0, historyIndex + 1);
    setHistory([...updatedHistory, newBlocks]);
    setHistoryIndex(updatedHistory.length);
    if (markDirty) {
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  // Keyboard Shortcuts listener (Undo: Ctrl+Z, Redo: Ctrl+Y, Save: Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setBlocks(history[targetIndex]);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setBlocks(history[targetIndex]);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  // Click handler to select elements
  const handleSelectBlock = useCallback((id) => {
    setSelectedBlockId(id);
  }, []);

  // Update properties of a specific block
  const handleUpdateBlockProperties = useCallback((id, updatedProperties) => {
    const newBlocks = blocks.map(block => {
      if (block.id === id) {
        return {
          ...block,
          properties: {
            ...block.properties,
            ...updatedProperties
          }
        };
      }
      return block;
    });
    updateBlocksState(newBlocks);
  }, [blocks, updateBlocksState]);

  // Add block to canvas from sidebar selector
  const handleAddComponent = useCallback((componentDef) => {
    const alreadyExists = blocks.some(b => b.id === componentDef.id);
    if (alreadyExists) {
      // Select it and blink outline
      setSelectedBlockId(componentDef.id);
      return;
    }

    const newBlock = {
      id: componentDef.id,
      title: componentDef.title,
      description: componentDef.description,
      icon: componentDef.icon,
      properties: { ...componentDef.defaultProps }
    };

    // Smart order: navbar goes to index 0, footer to end, others append
    let newBlocks = [...blocks];
    if (componentDef.id === 'navbar-section') {
      newBlocks.unshift(newBlock);
    } else {
      newBlocks.push(newBlock);
    }

    updateBlocksState(newBlocks);
    setSelectedBlockId(componentDef.id);
  }, [blocks, updateBlocksState]);

  // Get active selected block details
  const selectedBlock = useMemo(() => {
    return blocks.find(b => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  // List of ids currently on canvas
  const addedComponentIds = useMemo(() => {
    return blocks.map(b => b.id);
  }, [blocks]);

  // Save operation
  const handleSave = () => {
    setIsDirty(false);
    // Visual alert mock toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-[#6B5CE7] text-white px-4 py-2.5 rounded-xl border border-[#252525] text-xs font-bold uppercase tracking-wider shadow-2xl z-50 animate-bounce';
    toast.innerHTML = '<i class="ti ti-check-double text-sm mr-1.5"></i> Project Saved successfully!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  };

  const handleExport = () => {
    setIsExportOpen(true);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(JSON.stringify(blocks, null, 2));
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  return (
    <div className="h-screen w-screen bg-[#111111] text-[#e8e8e8] flex flex-col overflow-hidden relative">
      
      {/* 52px Fixed Topbar */}
      <Topbar
        previewMode={previewMode}
        onChangePreviewMode={setPreviewMode}
        zoom={zoom}
        onChangeZoom={setZoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isDirty={isDirty}
        onSave={handleSave}
        onPreview={() => setIsPreviewActive(!isPreviewActive)}
        onExport={handleExport}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* Left Library Panel - Hidden in Preview Mode */}
        {!isPreviewActive && (
          <Sidebar
            onAddComponent={handleAddComponent}
            addedComponentIds={addedComponentIds}
          />
        )}

        {/* Central Live Canvas Area */}
        <Canvas
          blocks={blocks}
          selectedBlockId={isPreviewActive ? null : selectedBlockId}
          onSelectBlock={handleSelectBlock}
          previewMode={previewMode}
          zoom={zoom}
        />

        {/* Right Properties Panel - Hidden in Preview Mode */}
        {!isPreviewActive && (
          <PropertiesPanel
            selectedBlock={selectedBlock}
            onUpdateBlockProperties={handleUpdateBlockProperties}
          />
        )}

        {/* Preview Mode Active Pill Indicator */}
        {isPreviewActive && (
          <button
            type="button"
            onClick={() => setIsPreviewActive(false)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#181818] hover:bg-[#1e1e1e] border border-[#252525] hover:border-[#6B5CE7] px-4 py-2 rounded-full text-xs font-bold text-[#e8e8e8] shadow-2xl flex items-center gap-2 transition-all uppercase tracking-wider z-50 animate-glow"
          >
            <span className="w-2 h-2 rounded-full bg-[#ff5555] animate-ping" />
            <span>Exit Live Preview</span>
          </button>
        )}
      </div>

      {/* Bento Export Code dialog Overlay */}
      {isExportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#181818] border border-[#252525] rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-scale-up">
            <div className="p-4 border-b border-[#252525] flex justify-between items-center bg-[#111111]/40">
              <span className="text-xs font-bold text-[#e8e8e8] uppercase tracking-wider flex items-center gap-1.5">
                <i className="ti ti-code text-base text-[#6B5CE7]" />
                <span>Export Layout JSON Schema</span>
              </span>
              <button
                type="button"
                onClick={() => setIsExportOpen(false)}
                className="text-[#666666] hover:text-[#e8e8e8] p-1 rounded-lg border border-[#252525]"
              >
                <i className="ti ti-x text-sm" />
              </button>
            </div>
            <div className="p-4 flex-1">
              <pre className="bg-[#111111] text-[10px] font-mono text-[#aaaaaa] p-3 rounded-lg border border-[#252525] max-h-[300px] overflow-auto select-text scrollbar-thin">
                {JSON.stringify(blocks, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t border-[#252525] flex justify-end gap-2 bg-[#111111]/20">
              <button
                type="button"
                onClick={() => setIsExportOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#aaaaaa] hover:text-[#e8e8e8] border border-[#252525] rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCopyExport}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6B5CE7] hover:bg-[#5b4cd4] rounded-lg transition-colors flex items-center gap-1.5"
              >
                <i className={`ti ${exportCopied ? 'ti-check' : 'ti-clipboard'} text-sm`} />
                <span>{exportCopied ? 'Copied!' : 'Copy Schema'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
