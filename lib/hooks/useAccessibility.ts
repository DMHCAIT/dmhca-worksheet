import { useEffect, useRef, RefObject } from 'react'

/**
 * Custom hook for managing focus accessibility
 */
export function useFocusManagement() {
  /**
   * Traps focus within a container element
   */
  const trapFocus = (container: Element) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: Event) => {
      const keyboardEvent = e as KeyboardEvent
      if (keyboardEvent.key !== 'Tab') return

      if (keyboardEvent.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          keyboardEvent.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          keyboardEvent.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    
    // Focus first element initially
    if (firstElement) {
      firstElement.focus()
    }

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }

  /**
   * Returns focus to the element that triggered a modal/dialog
   */
  const returnFocus = (element: HTMLElement | null) => {
    if (element && element.focus) {
      element.focus()
    }
  }

  /**
   * Announces content to screen readers
   */
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message

    document.body.appendChild(announcer)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  }

  return {
    trapFocus,
    returnFocus,
    announce,
  }
}

/**
 * Hook for managing focus in modal dialogs
 */
export function useModalFocus(isOpen: boolean, onClose?: () => void) {
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Store the element that triggered the modal
      triggerElementRef.current = document.activeElement as HTMLElement

      // Trap focus in modal
      if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        
        if (firstElement) {
          firstElement.focus()
        }

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && onClose) {
            onClose()
          }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
          document.removeEventListener('keydown', handleKeyDown)
        }
      }
    } else {
      // Return focus to trigger element when modal closes
      if (triggerElementRef.current) {
        triggerElementRef.current.focus()
        triggerElementRef.current = null
      }
    }
  }, [isOpen, onClose])

  return modalRef
}

/**
 * Hook for managing skip links accessibility
 */
export function useSkipLinks() {
  useEffect(() => {
    const skipLink = document.createElement('a')
    skipLink.href = '#main-content'
    skipLink.textContent = 'Skip to main content'
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded'
    
    document.body.insertBefore(skipLink, document.body.firstChild)
    
    return () => {
      if (document.body.contains(skipLink)) {
        document.body.removeChild(skipLink)
      }
    }
  }, [])
}

/**
 * Hook for managing roving tabindex in lists/grids
 */
export function useRovingTabIndex<T extends HTMLElement>(
  containerRef: RefObject<HTMLElement>,
  itemSelector: string,
  orientation: 'horizontal' | 'vertical' | 'both' = 'vertical'
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateTabIndex = () => {
      const items = container.querySelectorAll(itemSelector) as NodeListOf<T>
      items.forEach((item, index) => {
        item.tabIndex = index === 0 ? 0 : -1
      })
    }

    const handleKeyDown = (e: Event) => {
      const keyboardEvent = e as KeyboardEvent
      const target = keyboardEvent.target as T
      if (!target || !target.matches?.(itemSelector)) return

      const items = Array.from(container.querySelectorAll(itemSelector)) as T[]
      const currentIndex = items.indexOf(target)
      let nextIndex = currentIndex

      const isHorizontalNav = orientation === 'horizontal' || orientation === 'both'
      const isVerticalNav = orientation === 'vertical' || orientation === 'both'

      switch (keyboardEvent.key) {
        case 'ArrowDown':
          if (isVerticalNav) {
            keyboardEvent.preventDefault()
            nextIndex = (currentIndex + 1) % items.length
          }
          break
        case 'ArrowUp':
          if (isVerticalNav) {
            keyboardEvent.preventDefault()
            nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1
          }
          break
        case 'ArrowRight':
          if (isHorizontalNav) {
            keyboardEvent.preventDefault()
            nextIndex = (currentIndex + 1) % items.length
          }
          break
        case 'ArrowLeft':
          if (isHorizontalNav) {
            keyboardEvent.preventDefault()
            nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1
          }
          break
        case 'Home':
          keyboardEvent.preventDefault()
          nextIndex = 0
          break
        case 'End':
          keyboardEvent.preventDefault()
          nextIndex = items.length - 1
          break
      }

      if (nextIndex !== currentIndex && nextIndex >= 0) {
        // Update tabindex
        items.forEach((item, index) => {
          item.tabIndex = index === nextIndex ? 0 : -1
        })
        // Focus new item
        items[nextIndex].focus()
      }
    }

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.matches(itemSelector)) {
        const items = container.querySelectorAll(itemSelector) as NodeListOf<T>
        items.forEach(item => {
          item.tabIndex = item === target ? 0 : -1
        })
      }
    }

    updateTabIndex()
    container.addEventListener('keydown', handleKeyDown)
    container.addEventListener('focus', handleFocus, true)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('focus', handleFocus, true)
    }
  }, [containerRef, itemSelector, orientation])
}

/**
 * Hook for managing aria-live announcements
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create aria-live region
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.id = 'aria-announcer'
    
    document.body.appendChild(announcer)
    announcerRef.current = announcer

    return () => {
      if (document.body.contains(announcer)) {
        document.body.removeChild(announcer)
      }
    }
  }, [])

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority)
      announcerRef.current.textContent = message
    }
  }

  return { announce }
}

/**
 * Hook for enhancing form accessibility
 */
export function useFormAccessibility() {
  const announceError = (fieldName: string, error: string) => {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', 'assertive')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = `Error in ${fieldName}: ${error}`

    document.body.appendChild(announcer)
    
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  }

  const announceSuccess = (message: string) => {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message

    document.body.appendChild(announcer)
    
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  }

  return {
    announceError,
    announceSuccess,
  }
}