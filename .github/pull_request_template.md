## Description
<!-- Brief description of your changes -->

## Related Issue
<!-- Link to the related issue if applicable: fixes #123 -->

## Affected Package
<!-- check at least one -->
- [ ] `packages/create-app` (CLI / npm package `@takuma-hirai/create-app`)
- [ ] `template/` (Next.js skeleton fetched by `create-app` via giget)
- [ ] root infra (workflows / dependabot / README / pnpm-workspace.yaml)

## Testing
<!-- How have you tested these changes? -->

## Breaking Changes
<!-- Does this introduce any breaking changes? If yes, please describe them. -->

## Checklist

- [ ] tests added/updated (CLI changes)
- [ ] `.changeset/*.md` added at repo root (breaking change: major, feature: minor, bugfix: patch)
- [ ] CI changeset verification step PASS
- [ ] template/ changes verified via `npx @takuma-hirai/create-app <name>` in a tmp dir
