import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, X, Check } from 'lucide-react'

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  allOptionLabel = 'All',
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => {
      const label = String(opt.label || '').toLowerCase()
      const sub = String(opt.sublabel || '').toLowerCase()
      const val = String(opt.value || '').toLowerCase()
      const searchKey = String(opt.searchKey || '').toLowerCase()
      return (
        label.includes(q) ||
        sub.includes(q) ||
        val.includes(q) ||
        searchKey.includes(q)
      )
    })
  }, [options, searchTerm])

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value))
  }, [options, value])

  const handleSelect = (val) => {
    onChange(val)
    setIsOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
    >
      {/* Trigger Button */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-label={placeholder}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen((prev) => !prev)
          } else if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className={`w-full h-[38px] flex items-center justify-between gap-2 px-3 text-sm bg-white border rounded-md shadow-2xs cursor-pointer select-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
            : isOpen
              ? 'border-blue-500 ring-2 ring-blue-500/20 text-gray-900'
              : 'border-gray-300 text-gray-800'
        }`}
      >
        <span className="truncate flex-1 text-left font-normal">
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[240px] max-w-[340px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/70">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-xs sm:text-sm pl-8 pr-7 py-1.5 border border-gray-200 rounded-md bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false)
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto py-1 text-sm">
            {/* Top All Option */}
            {allOptionLabel && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs sm:text-sm cursor-pointer ${
                  !value
                    ? 'bg-blue-50 text-blue-800 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{allOptionLabel}</span>
                {!value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs sm:text-sm cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-800 font-semibold'
                        : 'text-gray-700 hover:bg-blue-50/40 hover:text-gray-900'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel ? (
                        <div className="text-[11px] text-gray-400 truncate">
                          {opt.sublabel}
                        </div>
                      ) : null}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                )
              })
            ) : (
              <div className="py-4 px-3 text-center text-xs text-gray-400">
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
