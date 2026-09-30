# WeScale Emailer workflows

`console.yml`, `go.yml`, and `web-analytics-sdk.yml` retain the upstream build and test checks for pushes and pull requests to `main` or `dev`.

## Upstream updates

`upstream-sync.yml` polls `Notifuse/notifuse` at minute 17 of every hour and supports manual dispatch. It creates or updates a pull request from `updates/notifuse` into `main`, validates the proposed integration, and leaves merging to review. See [the update guide](../../docs/UPSTREAM_UPDATES.md) for activation and conflict handling.

## Docker releases

Both Docker workflows target `docker.io/juanlucasbg/wescale-emailer`, building `linux/amd64` and `linux/arm64` images with provenance attestations.

- `docker-release.yml`: pushing a `v*.*` tag publishes that exact tag; pushing the `latest` tag publishes `latest`.
- `docker-manual.yml`: manual dispatch accepts a tag (default `latest`) and a push toggle. Disable push for a build without registry publication.

Publishing requires repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` with permission to push this image. These credentials must be configured before using the release workflows. Building from source with `docker compose up -d --build` does not require them.

If changing registries, update both workflows, the Docker login configuration, and the `DOCKER_IMAGE` default in the root Makefile together. No images have been published as part of the rebrand.
