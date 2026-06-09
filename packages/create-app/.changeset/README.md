# Changesets

This folder holds one text file for each changeset that needs to be added to this project.

## What is a changeset?

A changeset is an intent to release a set of packages as new versions. Its contents detail what types of changes are being made, so that consumers of the library can understand the impact of the update.

## Automatic releases

When Changesets finds a Changeset in a pull request, the PR will be updated with a release summary and links to each changed package. When the PR is merged, a GitHub Action will run the Changeset publish flow to automatically:

1. Create a new PR bumping all versions that have changed and updating all changelogs
2. When that PR is merged, automatically publish the packages to npm

## Format

```
---
@takuma-hirai/create-app: minor
---

Add new feature description here.
```

## Types of releases

- **major**: Breaking changes that require users to update their code
- **minor**: New features that are backward compatible
- **patch**: Bug fixes and minor improvements

## Creating a changeset

Run `pnpm changeset` to create a new changeset interactively.
