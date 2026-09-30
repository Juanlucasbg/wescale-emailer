import { useState, useEffect, useRef } from 'react'
import {
  getContactPreferences,
  parseNotificationCenterParams,
  subscribeToLists,
  unsubscribeOneClick,
  updateContactPreferences
} from './api/notification_center'
import type { ContactPreferencesResponse, List } from './api/notification_center'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { getTranslation, getLanguage } from './translations'
import type { Language } from './translations'
import languageIcon from './assets/language-icon.svg'

// Language display names for the selector
const languageNames: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  zh: '中文',
  hi: 'हिन्दी',
  ar: 'العربية',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  pl: 'Polski'
}

const defaultLogoUrl = `${import.meta.env.BASE_URL}logo.png`
const defaultIconUrl = `${import.meta.env.BASE_URL}icon.png`

function App() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notificationData, setNotificationData] = useState<ContactPreferencesResponse | null>(null)
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({})
  const [processingLists, setProcessingLists] = useState<Record<string, boolean>>({})
  const [allLists, setAllLists] = useState<Array<List & { status?: string }>>([])
  const [language, setLanguage] = useState<Language>(getLanguage())
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<{
    success: boolean
    messageKey: string
    listId?: string
  } | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const languageMenuRef = useRef<HTMLDivElement>(null)

  // Translation helper function
  const t = (key: string) => getTranslation(key, language)

  useEffect(() => {
    async function loadNotificationData() {
      ;(window as any).Consecration =
        'Imperet illi Deus, supplices deprecamur: tuque, Princeps militiae caelestis, Satanam aliosque spiritus malignos, qui ad perditionem animarum pervagantur in mundo, divina virtute in infernum detrude. Amen.'

      try {
        // Parse parameters from URL
        const params = parseNotificationCenterParams()

        if (!params) {
          setError(t('missingParameters'))
          setLoading(false)
          return
        }

        // Detect preview mode (test email, preview message ID, or fake HMAC)
        const isPreview =
          params.mid === 'preview' ||
          params.email === 'john.doe@example.com' ||
          params.email_hmac === 'abc123' ||
          params.email_hmac === '...'

        if (isPreview) {
          setIsPreviewMode(true)
          setLoading(false)
          // Don't make API calls in preview mode
          return
        }

        // Handle confirmation action
        if (params.action === 'confirm' && params.lid) {
          try {
            // Use the existing API client to subscribe to lists
            const response = await subscribeToLists({
              workspace_id: params.wid,
              contact: {
                id: '', // Will be populated by the backend
                email: params.email,
                email_hmac: params.email_hmac
              },
              list_ids: [params.lid]
            })

            if (response.success) {
              setConfirmationResult({
                success: true,
                messageKey: 'confirmSubscriptionSuccess',
                listId: params.lid
              })
            } else {
              setConfirmationResult({
                success: false,
                messageKey: 'confirmSubscriptionFailed'
              })
            }
          } catch (err) {
            console.error('Failed to confirm subscription:', err)
            setConfirmationResult({
              success: false,
              messageKey: 'confirmSubscriptionFailed'
            })
          }
        }

        // Handle unsubscribe action
        if (params.action === 'unsubscribe' && params.lid) {
          try {
            // Automatically unsubscribe from the list
            const response = await unsubscribeOneClick({
              wid: params.wid,
              email: params.email,
              email_hmac: params.email_hmac,
              lids: [params.lid],
              mid: params.mid
            })

            if (response.success) {
              setConfirmationResult({
                success: true,
                messageKey: 'unsubscribeSuccess',
                listId: params.lid
              })
            } else {
              setConfirmationResult({
                success: false,
                messageKey: 'unsubscribeFailed'
              })
            }
          } catch (err) {
            console.error('Failed to unsubscribe:', err)
            setConfirmationResult({
              success: false,
              messageKey: 'unsubscribeFailed'
            })
          }
        }

        // Load notification center data
        const data = await getContactPreferences({
          workspace_id: params.wid,
          email: params.email,
          email_hmac: params.email_hmac
        })
        setNotificationData(data)

        // Auto-detect browser language and timezone, sync if different from contact
        const browserLang = navigator.language.split('-')[0].toLowerCase()
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const contactLang = data.contact?.language || null
        const contactTz = data.contact?.timezone || null

        const langChanged = browserLang.length === 2 && !contactLang
        const tzChanged = !!browserTz && contactTz !== browserTz

        if (langChanged || tzChanged) {
          updateContactPreferences({
            workspace_id: params.wid,
            email: params.email,
            email_hmac: params.email_hmac,
            ...(langChanged ? { language: browserLang } : {}),
            ...(tzChanged ? { timezone: browserTz } : {})
          }).catch((err) => console.error('Failed to auto-sync preferences:', err))

          // Also update the widget UI language if the browser lang is supported
          if (langChanged && browserLang in languageNames) {
            setLanguage(browserLang as Language)
          }
        }

        // Initialize subscriptions state
        const initialSubscriptions: Record<string, boolean> = {}

        // Combine public lists and contact-specific lists
        const combinedLists: Array<List & { status?: string }> = []

        // Process all contact lists to get status
        if (data.contact_lists) {
          data.contact_lists.forEach((contactList) => {
            // Set subscription status based on contact list status
            initialSubscriptions[contactList.list_id] = contactList.status === 'active'

            // Try to find this list in public lists to get name and description
            const publicList = data.public_lists?.find((list) => list.id === contactList.list_id)

            if (publicList) {
              // For lists in both contact_lists and public_lists
              combinedLists.push({
                ...publicList,
                status: contactList.status
              })
            } else {
              // For lists only in contact_lists (private lists)
              combinedLists.push({
                id: contactList.list_id,
                name: contactList.list_name || `List ${contactList.list_id}`,
                status: contactList.status
              })
            }
          })
        }

        // Add public lists that aren't in contact_lists
        if (data.public_lists) {
          data.public_lists.forEach((list) => {
            const existingList = combinedLists.find((l) => l.id === list.id)
            if (!existingList) {
              combinedLists.push({
                ...list,
                status: 'unsubscribed' // Default status for public lists not in contact_lists
              })
              initialSubscriptions[list.id] = false
            }
          })
        }

        setAllLists(combinedLists)
        setSubscriptions(initialSubscriptions)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load notification center data:', err)
        setError(err instanceof Error ? err.message : t('failedToLoad'))
        setLoading(false)
      }
    }

    loadNotificationData()
  }, [])

  // Use workspace identity when supplied, otherwise use the WeScale icon.
  useEffect(() => {
    const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
    const link = existingLink || document.createElement('link')
    link.rel = 'icon'
    link.href = notificationData?.logo_url || defaultIconUrl
    if (notificationData?.logo_url) {
      link.removeAttribute('type')
    } else {
      link.type = 'image/png'
    }

    if (!existingLink) {
      document.head.appendChild(link)
    }
  }, [notificationData?.logo_url])

  // Update page title with contact information
  useEffect(() => {
    if (notificationData?.contact) {
      document.title = `${notificationData.contact.email} | ${t('emailSubscriptions')}`
    }
  }, [notificationData?.contact, language])

  // Handle clicks outside language menu to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node) &&
        showLanguageMenu
      ) {
        setShowLanguageMenu(false)
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && showLanguageMenu) {
        setShowLanguageMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [showLanguageMenu])

  // Handle keyboard events for language menu
  const handleLanguageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowLanguageMenu(false)
    }
    if (e.key === 'Enter' || e.key === ' ') {
      setShowLanguageMenu(!showLanguageMenu)
    }
  }

  // Handle keyboard selection within dropdown
  const handleLanguageOptionKeyDown = (e: React.KeyboardEvent, code: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setLanguage(code as Language)
      setShowLanguageMenu(false)
      e.preventDefault()
      const p = parseNotificationCenterParams()
      if (p && !isPreviewMode) {
        updateContactPreferences({
          workspace_id: p.wid,
          email: p.email,
          email_hmac: p.email_hmac,
          language: code
        }).catch((err) => console.error('Failed to sync language:', err))
      }
    }
  }

  const subscribe = async (listId: string) => {
    try {
      // Clear any previous confirmation result (e.g., from unsubscribe action)
      setConfirmationResult(null)

      // Set processing state
      setProcessingLists((prev) => ({ ...prev, [listId]: true }))

      // Update local state optimistically
      setSubscriptions((prev) => ({
        ...prev,
        [listId]: true
      }))

      // Also update list status if possible
      setAllLists((prev) =>
        prev.map((list) => (list.id === listId ? { ...list, status: 'active' } : list))
      )

      if (notificationData?.contact) {
        const params = parseNotificationCenterParams()

        if (!params) {
          throw new Error('Missing required parameters')
        }

        // Call API to subscribe to list
        // Include email_hmac from URL params for private list authentication
        await subscribeToLists({
          workspace_id: params.wid,
          contact: { ...notificationData.contact, email_hmac: params.email_hmac },
          list_ids: [listId]
        })

        toast.success(t('successSubscribed'), {
          style: { backgroundColor: '#dff1e5', borderLeft: '4px solid #0f8a3d', color: '#0f8a3d' },
          duration: 3000
        })
      }
    } catch (err) {
      // Revert local state on error
      setSubscriptions((prev) => ({
        ...prev,
        [listId]: false
      }))

      // Revert list status
      setAllLists((prev) =>
        prev.map((list) => (list.id === listId ? { ...list, status: 'unsubscribed' } : list))
      )

      console.error('Failed to subscribe:', err)
      toast.error(t('failedSubscribe'))
    } finally {
      // Clear processing state
      setProcessingLists((prev) => ({ ...prev, [listId]: false }))
    }
  }

  const unsubscribe = async (listId: string) => {
    try {
      // Set processing state
      setProcessingLists((prev) => ({ ...prev, [listId]: true }))

      // Update local state optimistically
      setSubscriptions((prev) => ({
        ...prev,
        [listId]: false
      }))

      // Also update list status if possible
      setAllLists((prev) =>
        prev.map((list) => (list.id === listId ? { ...list, status: 'unsubscribed' } : list))
      )

      if (notificationData?.contact) {
        const params = parseNotificationCenterParams()

        if (!params) {
          throw new Error('Missing required parameters')
        }

        // Call API to unsubscribe from list
        await unsubscribeOneClick({
          wid: params.wid,
          email: params.email,
          email_hmac: params.email_hmac,
          lids: [listId],
          mid: params.mid
        })

        toast.success(t('successUnsubscribed'), {
          style: { backgroundColor: '#dff1e5', borderLeft: '4px solid #0f8a3d', color: '#0f8a3d' },
          duration: 3000
        })
      }
    } catch (err) {
      // Revert local state on error
      setSubscriptions((prev) => ({
        ...prev,
        [listId]: true
      }))

      // Revert list status
      setAllLists((prev) =>
        prev.map((list) => (list.id === listId ? { ...list, status: 'active' } : list))
      )

      console.error('Failed to unsubscribe:', err)
      toast.error(t('failedUnsubscribe'))
    } finally {
      // Clear processing state
      setProcessingLists((prev) => ({ ...prev, [listId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="brand-state">
        <div className="brand-state-panel">
          <img src={defaultLogoUrl} alt="WeScale" className="brand-state-logo" />
          <div className="text-center">
            <div role="status" className="text-lg font-medium text-foreground animate-pulse">{t('loading')}</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="brand-state">
        <div className="brand-state-panel">
          <img src={defaultLogoUrl} alt="WeScale" className="brand-state-logo" />
          <div className="text-center">
            <h1 className="text-xl font-medium text-destructive">{t('error')}</h1>
            <p className="text-secondary-foreground mt-2">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isPreviewMode) {
    return (
      <div className="brand-state">
        <div className="w-full max-w-2xl mx-auto">
          <div className="brand-state-panel mx-auto">
            <div className="text-center">
              <img src={defaultLogoUrl} alt="WeScale" className="brand-state-logo" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">Preview Mode</h1>
              <p className="text-secondary-foreground text-lg mb-6">
                This is a preview of your email template's notification center links.
              </p>
              <div className="bg-accent border border-border rounded-xl p-6 text-left">
                <p className="text-sm text-secondary-foreground mb-3">
                  <strong className="text-primary">What you're seeing:</strong>
                </p>
                <ul className="text-sm text-secondary-foreground space-y-2 list-disc list-inside">
                  <li>This preview shows how subscription/unsubscribe links work</li>
                  <li>In production, real contacts will see their actual preferences</li>
                  <li>Links in live emails use secure authentication</li>
                </ul>
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  To test with real functionality, send yourself a test email from the template
                  editor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const websiteUrl = notificationData?.website_url || 'https://wescale.ai/'

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Toaster />
      {/* Topbar with bottom border */}
      <header className="preference-header bg-card w-full">
        <div className="flex items-center gap-4 h-20 px-5 max-w-[720px] mx-auto">
          <div className="flex-shrink-0">
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" title="Visit website">
              <img
                src={notificationData?.logo_url || defaultLogoUrl}
                alt={notificationData?.logo_url ? 'Workspace Logo' : 'WeScale'}
                className="h-6 md:h-8 max-w-32 w-auto object-contain"
              />
            </a>
          </div>
          <div className="text-xs sm:text-sm font-medium text-foreground flex-1 text-right">
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {t('emailSubscriptions')}
            </a>
          </div>
          {/* Language selector */}
          <div className="flex-shrink-0">
            <div className="relative" ref={languageMenuRef}>
              <button
                className="flex items-center rounded-lg p-2 border border-border hover:bg-accent cursor-pointer"
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                onKeyDown={handleLanguageKeyDown}
                aria-label="Select language"
                aria-expanded={showLanguageMenu}
                aria-haspopup="true"
              >
                <img
                  src={languageIcon}
                  alt="Language"
                  className="h-6 w-6 opacity-70 hover:opacity-100 transition-opacity"
                />
              </button>

              {showLanguageMenu && (
                <div
                  className="absolute right-0 mt-2 py-2 w-32 bg-white rounded-md shadow-lg border border-border z-10"
                  role="menu"
                >
                  {Object.entries(languageNames).map(([code, name]) => (
                    <button
                      key={code}
                      className="block w-full text-left px-4 py-1 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setLanguage(code as Language)
                        setShowLanguageMenu(false)
                        const p = parseNotificationCenterParams()
                        if (p && !isPreviewMode) {
                          updateContactPreferences({
                            workspace_id: p.wid,
                            email: p.email,
                            email_hmac: p.email_hmac,
                            language: code
                          }).catch((err) =>
                            console.error('Failed to sync language:', err)
                          )
                        }
                      }}
                      onKeyDown={(e) => handleLanguageOptionKeyDown(e, code)}
                      role="menuitem"
                      tabIndex={0}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-5 py-10 md:py-14">
        <div className="w-full max-w-[680px]">
          {notificationData && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl tracking-tight font-medium break-words">
                  {t('welcome')}{' '}
                  {notificationData.contact.first_name || notificationData.contact.email}
                </h1>
              </div>

              {/* Confirmation result */}
              {confirmationResult && (
                <div
                  className={`mb-6 p-4 rounded-sm border ${
                    confirmationResult.success
                      ? 'bg-accent border-border text-primary'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="font-medium">
                    {confirmationResult.success ? t('successHeader') : t('errorHeader')}
                  </div>
                  <div className="mt-1 text-sm">{t(confirmationResult.messageKey)}</div>
                </div>
              )}

              {/* All Lists section with toggles - showing both public and private lists */}
              {allLists.length > 0 && (
                <div className="mb-6">
                  <div className="space-y-3">
                    {allLists.map((list) => {
                      const isSubscribed = subscriptions[list.id] || false
                      const canToggle = list.status !== 'bounced' && list.status !== 'complained'

                      return (
                        <div
                          key={list.id}
                          className="p-5 md:p-6 border border-border rounded-xl bg-card"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 break-words">
                              <div className="font-medium">
                                {list.name}
                                {list.status &&
                                  list.status !== 'active' &&
                                  list.status !== 'unsubscribed' && (
                                    <span className="ml-2 text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-md">
                                      {list.status}
                                    </span>
                                  )}
                              </div>
                              {list.description && (
                                <p className="text-sm text-secondary-foreground leading-relaxed mt-2">{list.description}</p>
                              )}
                            </div>
                            <div className="ml-4">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  isSubscribed ? unsubscribe(list.id) : subscribe(list.id)
                                }
                                size="sm"
                                disabled={processingLists[list.id] || !canToggle}
                                className={`cursor-pointer ${
                                  !canToggle
                                    ? 'border-border text-muted-foreground cursor-not-allowed'
                                    : isSubscribed
                                    ? 'border-border text-muted-foreground hover:bg-accent hover:text-primary'
                                    : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                                }`}
                              >
                                {processingLists[list.id]
                                  ? t('processing')
                                  : !canToggle
                                  ? list.status
                                  : isSubscribed
                                  ? t('unsubscribe')
                                  : t('subscribe')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty state when no lists */}
              {allLists.length === 0 && (
                <p className="text-center text-muted-foreground bg-card border border-border rounded-xl px-6 py-10">{t('noSubscriptions')}</p>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-secondary-foreground hover:underline"
        >
          {t('visitWebsite')}
        </a>
      </footer>
    </div>
  )
}

export default App
