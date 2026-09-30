import { Layout } from 'antd'
import { useLingui } from '@lingui/react/macro'
import { ReactNode } from 'react'
import { withBannerOffset } from '../components/license/bannerOffset'
import './WeScaleOnboarding.css'

const { Content } = Layout

interface MainLayoutProps {
  children: ReactNode
  showcase?: boolean
}

export function MainLayout({ children, showcase = true }: MainLayoutProps) {
  const { t } = useLingui()

  return (
    <Layout className="wescale-onboarding" style={{ paddingTop: withBannerOffset('0px') }}>
      <a className="wescale-skip-link" href="#wescale-content">{t`Skip to content`}</a>
      <header className="wescale-onboarding-header">
        <a href="https://wescale.ai/" target="_blank" rel="noopener noreferrer" aria-label={t`WeScale home`}>
          <img src="/console/logo.png" alt={t`WeScale`} className="wescale-onboarding-logo" />
        </a>
        <a href="https://www.skool.com/heckman/about" target="_blank" rel="noopener noreferrer" className="wescale-community-link">
          {t`Explore the community`} <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div className={`wescale-onboarding-grid${showcase ? '' : ' wescale-onboarding-grid-wide'}`}>
        {showcase && <aside className="wescale-onboarding-story">
          <div className="wescale-story-copy">
            <span className="wescale-eyebrow">{t`Built for brand builders`}</span>
            <h1>{t`Build your brand.`}<br /><span>{t`Keep it growing.`}</span></h1>
            <p>{t`Bring your audience, campaigns, and customer journeys together in your WeScale workspace.`}</p>
          </div>
          <figure className="wescale-founders">
            <img src="/console/brand/founders.png" alt={t`Chris and Meg Heckman, founders of WeScale`} />
            <figcaption>
              <strong>{t`Chris & Meg Heckman`}</strong>
              <span>{t`Founders of WeScale`}</span>
            </figcaption>
          </figure>
          <p className="wescale-story-note">{t`Learn, launch, and grow with the WeScale community.`}</p>
        </aside>}
        <Content id="wescale-content" tabIndex={-1} className="wescale-onboarding-content">{children}</Content>
      </div>
      <footer className="wescale-onboarding-footer">
        <span>{t`WeScale · Your brand, built together.`}</span>
        <nav aria-label={t`WeScale policies`}>
          <a href="https://wescale.ai/policies/privacy-policy" target="_blank" rel="noopener noreferrer">{t`Privacy policy`}</a>
          <a href="https://wescale.ai/policies/terms-of-service" target="_blank" rel="noopener noreferrer">{t`Terms of service`}</a>
        </nav>
      </footer>
    </Layout>
  )
}

interface MainLayoutSidebarProps {
  children: ReactNode
  title: string
  extra: ReactNode
}

export function MainLayoutSidebar({ children, title, extra }: MainLayoutSidebarProps) {
  return (
    <section className="wescale-onboarding-panel">
      <div className="wescale-panel-heading"><h2>{title}</h2>{extra}</div>
      {children}
    </section>
  )
}
