/**
 * Display Preferences Hook
 * Manages sidebar display preferences using localStorage
 */

import { useState, useEffect, useCallback } from 'react'

const DISPLAY_PREFERENCES_KEY = 'display_preferences'

export type DisplayItemId = 
  | 'dashboard'
  | 'tickets'
  | 'chats'
  | 'chat-widgets'
  | 'users'
  | 'kb-document'
  | 'worker-status'
  | 'system-downtime'
  | 'help-center'

export interface DisplayPreferences {
  items: DisplayItemId[]
}

const DEFAULT_PREFERENCES: DisplayPreferences = {
  items: [
    'dashboard',
    'tickets',
    'chats',
    'chat-widgets',
    'users',
    'kb-document',
    'worker-status',
    'system-downtime',
    'help-center',
  ],
}

function getStoredPreferences(): DisplayPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES
  }

  try {
    const stored = localStorage.getItem(DISPLAY_PREFERENCES_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as DisplayPreferences
      // Validate that items is an array
      if (Array.isArray(parsed.items)) {
        return parsed
      }
    }
  } catch (error) {
    console.error('Failed to load display preferences:', error)
  }

  return DEFAULT_PREFERENCES
}

function savePreferences(preferences: DisplayPreferences): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(DISPLAY_PREFERENCES_KEY, JSON.stringify(preferences))
    // Dispatch custom event to notify other components in the same tab
    window.dispatchEvent(
      new CustomEvent('displayPreferencesChanged', {
        detail: preferences,
      })
    )
  } catch (error) {
    console.error('Failed to save display preferences:', error)
  }
}

/**
 * Hook to manage display preferences
 */
export function useDisplayPreferences() {
  const [preferences, setPreferences] = useState<DisplayPreferences>(() =>
    getStoredPreferences()
  )

  const updatePreferences = useCallback((newPreferences: DisplayPreferences) => {
    setPreferences(newPreferences)
    savePreferences(newPreferences)
  }, [])

  const updateItems = useCallback((items: DisplayItemId[]) => {
    const newPreferences: DisplayPreferences = { items }
    updatePreferences(newPreferences)
  }, [updatePreferences])

  const resetPreferences = useCallback(() => {
    updatePreferences(DEFAULT_PREFERENCES)
  }, [updatePreferences])

  // Sync with localStorage changes from other tabs and same tab
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DISPLAY_PREFERENCES_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as DisplayPreferences
          if (Array.isArray(parsed.items)) {
            setPreferences(parsed)
          }
        } catch (error) {
          console.error('Failed to parse display preferences from storage:', error)
        }
      }
    }

    const handlePreferencesChanged = (e: CustomEvent<DisplayPreferences>) => {
      setPreferences(e.detail)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('displayPreferencesChanged', handlePreferencesChanged as EventListener)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('displayPreferencesChanged', handlePreferencesChanged as EventListener)
    }
  }, [])

  return {
    preferences,
    updatePreferences,
    updateItems,
    resetPreferences,
    isItemVisible: (itemId: DisplayItemId) => preferences.items.includes(itemId),
  }
}

