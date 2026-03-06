import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  mono?: boolean
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, mono = false, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 flex-1">
        {label && (
          <label className="text-sm font-medium text-[#e0e0e0]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full h-full min-h-[200px] px-3 py-3
            bg-[#111111] border border-[#2a2a2a] rounded-lg
            text-[#e0e0e0] placeholder-[#555555]
            focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/50
            transition-colors
            ${mono ? 'font-mono text-sm leading-relaxed' : ''}
            ${error ? 'border-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

export default TextArea
