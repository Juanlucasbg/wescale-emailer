# WeScale Emailer

**WeScale Emailer** (`wescale-emailer`) is a self-hosted email platform with the [WeScale](https://wescale.ai/) identity. Manage audiences, build email campaigns, run automations, send transactional messages, and publish content from one workspace.

This project is a branded fork of [Notifuse](https://github.com/Notifuse/notifuse), created by Pierre Bazoge. It retains the upstream Go backend, React interfaces, PostgreSQL storage, and licensing. Notifuse's [documentation](https://docs.notifuse.com/) covers setup, providers, API requests, and deployment.

## Run locally

Install Docker with Docker Compose, then clone this fork:

```sh
git clone https://github.com/Juanlucasbg/wescale-emailer.git
cd wescale-emailer
cp env.example .env
openssl rand -base64 32
```

Set `SECRET_KEY` in `.env` to the generated value. Build and start the local source, including the WeScale interfaces and PostgreSQL 17:

```sh
docker compose up -d --build
```

Open [http://localhost:8081/console/](http://localhost:8081/console/). The first-run wizard creates the administrator account and configures SMTP. Use `http://localhost:8081` as the public API endpoint for this local installation. Provider credentials are required to deliver sign-in codes and email.

```sh
docker compose logs -f api
docker compose down
```

The database volume and `data/` directory retain installation data between starts. Configuration options are described in [env.example](env.example) and the [upstream setup documentation](https://docs.notifuse.com/).

## Development

The backend uses Go 1.25.4 and PostgreSQL 17 or newer. The console and notification center use React and TypeScript; the Docker build uses Node 22. Existing frontend checks can also run locally:

```sh
cd console
npm ci
npm run build
npm test -- --run
```

Run the equivalent build and tests from `notification_center/` for subscription preferences. Backend unit tests run from the repository root with `make test-unit`; integration tests use `make test-integration` with the services in [tests/compose.test.yaml](tests/compose.test.yaml).

The existing console development server uses the upstream local hostnames and TLS certificates in [console/vite.config.ts](console/vite.config.ts). Use Docker Compose for the complete local application.

## Upstream updates

The [upstream sync workflow](.github/workflows/upstream-sync.yml) polls `Notifuse/notifuse` hourly and also supports manual dispatch. It maintains an `updates/notifuse` branch and opens or refreshes a pull request into this fork's `main` branch. Updates are reviewed before merging so WeScale branding and fork changes remain intentional.

See [Upstream updates](docs/UPSTREAM_UPDATES.md) for activation, conflict resolution, and validation. Enable Actions and the scheduled workflow on the fork, and allow GitHub Actions to create pull requests in repository settings.

## Compatibility and licensing

The Go module path `github.com/Notifuse/notifuse`, `NOTIFUSE_*` environment variables, database defaults, and browser SDK identifiers such as `NotifuseAnalytics` remain unchanged for compatibility. Upstream licence keys and feature checks remain in place.

This is source-available software. Notifuse v40.0 and later use the [Business Source License 1.1](LICENSE), changing to AGPL-3.0-or-later four years after each version's publication. The additional use grant permits production hosting, including for third parties; the six licensed capabilities require a valid upstream licence key. These cover additional workspaces beyond three, granular permissions, SES tenant provisioning, OIDC single sign-on, multilingual template variants, and administrative audit-log recording.

Notifuse v39.x and earlier remain AGPL-3.0-or-later. The separate [web analytics SDK](web_analytics_sdk/LICENSE) is AGPL-3.0-or-later in every version. See [LICENSING.md](LICENSING.md) for the complete feature map and licence conditions. Original licence texts and attribution are retained.
