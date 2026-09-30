import { ConfigProvider, App as AntApp, ThemeConfig } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { I18nProvider } from '@lingui/react'
import { router } from './router'
import { brand } from './brand'
import { AuthProvider } from './contexts/AuthContext'
import { LicenseProvider } from './contexts/LicenseContext'
import { LocaleProvider, useLocale, i18n } from './contexts/LocaleContext'
import { initializeAnalytics } from './utils/analytics-config'
import { shouldRetryQuery } from './services/api/errors'
import enUS from 'antd/locale/en_US'
import frFR from 'antd/locale/fr_FR'
import esES from 'antd/locale/es_ES'
import deDE from 'antd/locale/de_DE'
import caES from 'antd/locale/ca_ES'
import ptBR from 'antd/locale/pt_BR'
import jaJP from 'antd/locale/ja_JP'
import itIT from 'antd/locale/it_IT'
import type { Locale as AntdLocale } from 'antd/es/locale'
import type { Locale } from './i18n'

// Every locale in the app's supported set needs an entry: a missing key leaves
// ConfigProvider without a locale and antd's own strings fall back to English.
const antdLocales: Record<Locale, AntdLocale> = {
  en: enUS,
  fr: frFR,
  es: esES,
  de: deDE,
  ca: caES,
  'pt-BR': ptBR,
  ja: jaJP,
  it: itIT,
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery
    }
  }
})

const theme: ThemeConfig = {
  token: {
    colorPrimary: brand.green,
    colorLink: brand.green,
    colorLinkHover: brand.ctaHover,
    colorText: brand.ink,
    colorTextSecondary: brand.secondary,
    colorTextTertiary: brand.muted,
    colorTextHeading: brand.ink,
    colorBgLayout: brand.background,
    colorBgContainer: brand.surface,
    colorBgElevated: brand.surface,
    colorBorder: brand.border,
    colorBorderSecondary: brand.border,
    colorInfo: brand.green,
    fontFamily: brand.fontFamily,
    fontSize: 13,
    borderRadius: 8,
    borderRadiusLG: 14,
    controlHeight: 36
  },
  components: {
    Layout: { bodyBg: brand.background, lightSiderBg: brand.surface, siderBg: brand.surface },
    Button: {
      primaryColor: brand.ink,
      colorPrimary: brand.cta,
      colorPrimaryHover: '#62e133',
      colorPrimaryActive: '#3cb912',
      primaryShadow: 'none',
      fontWeight: 500
    },
    Card: { headerFontSize: 16, borderRadiusLG: 14, colorBorderSecondary: brand.border, colorBgContainer: brand.surface },
    Table: {
      headerBg: brand.background,
      cellFontSize: 12, cellFontSizeMD: 12, cellFontSizeSM: 12,
      headerColor: brand.secondary, footerColor: brand.secondary,
      colorBgContainer: brand.surface,
      rowHoverBg: '#f1f7f2',
      headerSortActiveBg: '#edf3ed', headerSortHoverBg: '#edf3ed', bodySortBg: '#f8faf8'
    },
    Menu: {
      itemColor: brand.secondary,
      itemSelectedColor: brand.green,
      itemSelectedBg: brand.greenTint,
      itemHoverBg: brand.background,
      subMenuItemBg: 'transparent',
      itemBorderRadius: 8
    },
    Tabs: { titleFontSize: 13, inkBarColor: brand.green },
    Drawer: { colorBgElevated: brand.surface },
    Modal: { contentBg: brand.surface },
    Timeline: { dotBg: brand.surface }
  }
}

// Initialize analytics service
initializeAnalytics()

// Inner component that uses LocaleContext
function AppContent() {
  const { locale } = useLocale()

  return (
    // key={locale} forces I18nProvider and all children to remount when locale changes,
    // ensuring all components re-render with the new translations
    <I18nProvider i18n={i18n} key={locale}>
      <ConfigProvider theme={theme} locale={antdLocales[locale]}>
        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </ConfigProvider>
    </I18nProvider>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Inside AuthProvider because it reads the licence state off /api/user.me, and outside
            everything that renders a workspace because a licence covers the deployment rather
            than any one workspace. It renders no UI of its own. */}
        <LicenseProvider>
          <LocaleProvider>
            <AppContent />
          </LocaleProvider>
        </LicenseProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
