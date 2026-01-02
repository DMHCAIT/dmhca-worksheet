import React, { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  preventBodyScroll?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

interface ModalHeaderProps {
  children: ReactNode
  className?: string
  onClose?: () => void
  showCloseButton?: boolean
}

interface ModalBodyProps {
  children: ReactNode
  className?: string
}

interface ModalFooterProps {
  children: ReactNode
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4'
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  size = 'md',
  preventBodyScroll = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
}: BaseModalProps) {
  useEffect(() => {
    if (preventBodyScroll && isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, preventBodyScroll])

  useEffect(() => {
    if (!closeOnEscape) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, closeOnEscape])

  useEffect(() => {
    if (isOpen) {
      // Focus first focusable element or modal itself
      const modal = document.querySelector('[role="dialog"]')
      const firstFocusable = modal?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      
      if (firstFocusable) {
        firstFocusable.focus()
      } else if (modal) {
        (modal as HTMLElement).focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="flex min-h-full items-center justify-center p-4 text-center"
        onClick={handleBackdropClick}
      >
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          aria-hidden="true"
        />
        
        {/* Modal panel */}
        <div
          className={`
            relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all
            ${sizeClasses[size]} w-full
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

export function ModalHeader({ 
  children, 
  className = '', 
  onClose, 
  showCloseButton = true 
}: ModalHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">{children}</div>
        {showCloseButton && onClose && (
          <button
            type="button"
            className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 ${className}`}>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
        {children}
      </div>
    </div>
  )
}

// Higher-order component for confirmation dialogs
interface ConfirmDialogProps extends Omit<BaseModalProps, 'children'> {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger' | 'warning'
  onConfirm: () => void
  isLoading?: boolean
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onClose,
  isLoading = false,
  ...modalProps
}: ConfirmDialogProps) {
  const confirmButtonClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  }

  return (
    <Modal {...modalProps} onClose={onClose} size="sm" aria-labelledby="confirm-dialog-title">
      <ModalHeader onClose={onClose}>
        <h3 id="confirm-dialog-title" className="text-lg font-medium text-gray-900">
          {title}
        </h3>
      </ModalHeader>
      
      <ModalBody>
        <p className="text-gray-600">{message}</p>
      </ModalBody>
      
      <ModalFooter>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClasses[confirmVariant]}`}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </>
          ) : (
            confirmLabel
          )}
        </button>
      </ModalFooter>
    </Modal>
  )
}