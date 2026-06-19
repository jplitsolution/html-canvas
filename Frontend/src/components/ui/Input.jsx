import React from 'react';

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
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-[#666666] flex items-center pointer-events-none">
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
            w-full bg-[#181818] border border-[#252525] rounded-lg px-3 py-2 text-sm text-[#e8e8e8]
            placeholder-[#666666] transition-all duration-200 outline-none
            focus:border-[#6B5CE7] focus:ring-1 focus:ring-[#6B5CE7]
            ${icon ? 'pl-9' : ''}
            ${suffix ? 'pr-12' : ''}
            ${error ? 'border-[#ff5555] focus:border-[#ff5555] focus:ring-[#ff5555]' : ''}
          `}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-xs font-medium text-[#666666] pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span className="text-xs text-[#ff5555] mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
