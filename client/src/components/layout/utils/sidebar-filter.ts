/**
 * Utility functions for filtering sidebar items based on display preferences
 */

import { type NavItem, type NavGroup } from '../types'
import { type DisplayItemId } from '@/hooks/use-display-preferences'

/**
 * Map sidebar item URLs to display preference IDs
 */
const urlToDisplayIdMap: Record<string, DisplayItemId> = {
  '/': 'dashboard',
  '/tickets': 'tickets',
  '/chats': 'chats',
  '/chat-widgets': 'chat-widgets',
  '/users': 'users',
  '/knowledge-base/document': 'kb-document',
  '/knowledge-base/worker-status': 'worker-status',
  '/knowledge-base/downtime': 'system-downtime',
  '/help-center': 'help-center',
}

/**
 * URLs that should always be visible (settings pages, etc.)
 */
const alwaysVisibleUrls = [
  '/settings',
  '/settings/account',
  '/settings/appearance',
  '/settings/notifications',
  '/settings/display',
]

/**
 * Get display ID for a sidebar item
 */
function getDisplayIdForItem(item: NavItem): DisplayItemId | null {
  // For items with URL
  if ('url' in item && item.url) {
    const url = typeof item.url === 'string' ? item.url : item.url.toString()
    return urlToDisplayIdMap[url] || null
  }

  // For collapsible items, check if any sub-item matches
  if ('items' in item && item.items) {
    // Settings and other collapsible items are always visible
    // Only filter direct navigation items
    return null
  }

  return null
}

/**
 * Check if a sidebar item should be visible based on preferences
 */
function isItemVisible(item: NavItem, visibleIds: DisplayItemId[]): boolean {
  // Check if item URL is always visible (settings pages)
  if ('url' in item && item.url) {
    const url = typeof item.url === 'string' ? item.url : item.url.toString()
    if (alwaysVisibleUrls.some((visibleUrl) => url.startsWith(visibleUrl))) {
      return true
    }
  }

  // For collapsible items (like Settings), check if any sub-item is visible
  if ('items' in item && item.items) {
    const visibleSubItems = item.items.filter((subItem) => {
      const subUrl = 'url' in subItem ? subItem.url : null
      const subUrlStr = subUrl
        ? typeof subUrl === 'string'
          ? subUrl
          : subUrl.toString()
        : ''
      
      // Always show settings sub-items
      if (alwaysVisibleUrls.some((visibleUrl) => subUrlStr.startsWith(visibleUrl))) {
        return true
      }
      
      const subDisplayId = getDisplayIdForItem(subItem as NavItem)
      return !subDisplayId || visibleIds.includes(subDisplayId)
    })
    return visibleSubItems.length > 0
  }

  // For regular items, check display ID
  const displayId = getDisplayIdForItem(item)
  
  // If no display ID mapping found, hide the item (it's not in our preference list)
  if (!displayId) {
    return false
  }

  return visibleIds.includes(displayId)
}

/**
 * Filter sidebar items based on display preferences
 */
export function filterSidebarItems(
  navGroups: NavGroup[],
  visibleIds: DisplayItemId[]
): NavGroup[] {
  return navGroups
    .map((group) => {
      const filteredItems = group.items
        .map((item) => {
          // For collapsible items, filter sub-items
          if ('items' in item && item.items) {
            const filteredSubItems = item.items.filter((subItem) => {
              const subUrl = 'url' in subItem ? subItem.url : null
              const subUrlStr = subUrl
                ? typeof subUrl === 'string'
                  ? subUrl
                  : subUrl.toString()
                : ''
              
              // Always show settings sub-items
              if (alwaysVisibleUrls.some((visibleUrl) => subUrlStr.startsWith(visibleUrl))) {
                return true
              }
              
              const subDisplayId = getDisplayIdForItem(subItem as NavItem)
              return !subDisplayId || visibleIds.includes(subDisplayId)
            })

            // Return item with filtered sub-items if any remain
            if (filteredSubItems.length > 0) {
              return {
                ...item,
                items: filteredSubItems,
              } as NavItem
            }
            return null
          }

          // For regular items, check visibility
          return isItemVisible(item, visibleIds) ? item : null
        })
        .filter((item): item is NavItem => item !== null)

      // Only return group if it has visible items
      if (filteredItems.length > 0) {
        return {
          ...group,
          items: filteredItems,
        }
      }
      return null
    })
    .filter((group): group is NavGroup => group !== null)
}

