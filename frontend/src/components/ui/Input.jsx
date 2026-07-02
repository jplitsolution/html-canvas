import React from 'react'

const Input = React.forwardRef(({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  error = '',
  icon = '',
  suffix = '',
  className = '',
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-fg-subtle flex items-center pointer-events-none">
            <i className={`ti ${icon} text-base`} />
          </span>
        )}
        <input
          ref={ref}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          className={`
            w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-fg
            placeholder:text-fg-subtle transition-all duration-200 outline-none
            focus:border-border-focus focus:ring-2 focus:ring-ring
            ${icon ? 'pl-9' : ''}
            ${suffix ? 'pr-12' : ''}
            ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-xs font-medium text-fg-subtle pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span className="text-xs text-danger mt-0.5">
          {error}
        </span>
      )}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
