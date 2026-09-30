import { Button, Empty } from 'antd'
import { ArrowRightOutlined, PlusOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import { isRootUser } from '../services/api/auth'
import { useLingui } from '@lingui/react/macro'
import { SystemSettingsDrawer } from '../components/settings/SystemSettingsDrawer'
import { withBannerOffset } from '../components/license/bannerOffset'
import '../layouts/WeScaleWorkspace.css'

export function DashboardPage() {
  const { t } = useLingui()
  const { workspaces, user } = useAuth()
  const navigate = useNavigate()
  const canCreateWorkspace = isRootUser(user?.email)

  const handleWorkspaceClick = (workspaceId: string) => {
    navigate({
      to: '/console/workspace/$workspaceId',
      params: { workspaceId }
    })
  }

  const handleCreateWorkspace = () => {
    navigate({ to: '/console/workspace/create' })
  }

  const resources = [
    {
      title: t`WeScale community`,
      description: t`Learn with founders building and growing their businesses.`,
      image: '/console/brand/community.png',
      href: 'https://www.skool.com/heckman',
      label: t`Explore the community`
    },
    {
      title: t`WeScale Launchpad`,
      description: t`Build your foundation with the WeScale Launchpad community.`,
      image: '/console/brand/launchpad.png',
      href: 'https://www.skool.com/wescale',
      label: t`Explore Launchpad`
    },
    {
      title: t`WeScale GPTs`,
      description: t`Explore AI tools built for the work of growing a business.`,
      image: '/console/brand/gpts.png',
      href: 'https://wescale.ai/pages/wescale-gpts',
      label: t`Explore the GPTs`
    }
  ]

  return (
    <div className="wescale-hub" style={{ paddingTop: withBannerOffset('0px') }}>
      <a className="wescale-skip-link" href="#wescale-workspaces">{t`Skip to content`}</a>
      <header className="wescale-hub-header">
        <a href="https://wescale.ai/" aria-label={t`WeScale website`}>
          <img src="/console/logo.png" alt="WeScale" className="wescale-hub-logo" />
        </a>
        <a className="wescale-hub-community-link" href="https://www.skool.com/heckman" target="_blank" rel="noopener noreferrer">
          {t`Join the community`} <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main className="wescale-hub-main">
        <div className="wescale-hub-intro">
          <span className="wescale-hub-eyebrow"><span aria-hidden="true" />{t`The next stage starts here`}</span>
          <h1>{t`Build your business.`}<br /><span>{t`Make it scale.`}</span></h1>
          <p>{t`Your audience, campaigns, and content. One workspace to keep your growth moving.`}</p>
        </div>

        <section className="wescale-hub-workspaces" id="wescale-workspaces" tabIndex={-1} aria-labelledby="wescale-workspaces-heading">
          <div className="wescale-hub-section-heading">
            <div>
              <span className="wescale-hub-section-kicker">{t`Your business, connected`}</span>
              <h2 id="wescale-workspaces-heading">{t`Select workspace`}</h2>
            </div>
            {canCreateWorkspace && (
              <div className="wescale-hub-workspace-actions">
                {/* System settings remains available without a license gate, so root can configure SSO. */}
                <SystemSettingsDrawer workspaceId={workspaces[0]?.id} />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateWorkspace}>
                  {t`New workspace`}
                </Button>
              </div>
            )}
          </div>
          {workspaces.length === 0 ? (
            <div className="wescale-hub-empty">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t`No workspaces yet`} />
              <p>{canCreateWorkspace ? t`Create a workspace to start organizing your audience and campaigns.` : t`Ask your administrator to invite you to a workspace.`}</p>
              {canCreateWorkspace && <Button type="primary" onClick={handleCreateWorkspace}>{t`Create your first workspace`}</Button>}
            </div>
          ) : (
            <div className="wescale-hub-workspace-grid">
              {workspaces.map((workspace) => (
                <button key={workspace.id} type="button" className="wescale-hub-workspace" onClick={() => handleWorkspaceClick(workspace.id)}>
                  <span className="wescale-hub-workspace-avatar">
                    {workspace.settings.logo_url ? (
                      <img alt={workspace.name} src={workspace.settings.logo_url} />
                    ) : (
                      <span>{workspace.name.substring(0, 2).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="wescale-hub-workspace-copy">
                    <strong>{workspace.name}</strong>
                    <span>{t`ID:`} {workspace.id}</span>
                  </span>
                  <ArrowRightOutlined className="wescale-hub-workspace-arrow" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="wescale-hub-resources" aria-labelledby="wescale-resources-heading">
          <div className="wescale-hub-section-heading">
            <div>
              <span className="wescale-hub-section-kicker">{t`Keep building`}</span>
              <h2 id="wescale-resources-heading">{t`A little help goes a long way.`}</h2>
            </div>
            <a href="https://wescale.ai/" target="_blank" rel="noopener noreferrer">{t`Explore WeScale`} <span aria-hidden="true">↗</span></a>
          </div>
          <div className="wescale-hub-resource-list">
            {resources.map((resource) => (
              <a key={resource.href} className="wescale-hub-resource" href={resource.href} target="_blank" rel="noopener noreferrer">
                <img src={resource.image} alt={resource.title} />
                <div>
                  <h3>{resource.title}</h3>
                  <p>{resource.description}</p>
                  <span>{resource.label} <span aria-hidden="true">↗</span></span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
      <footer className="wescale-hub-footer">
        <span>{t`Built for your next stage.`}</span>
        <a href="https://wescale.ai/" target="_blank" rel="noopener noreferrer">WeScale <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  )
}
