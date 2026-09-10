# Promoter Brain Core Site

## Scope and layout

This repository is the static architecture tour and engineering guide for
Promoter Brain Core. Start with `README.md` and `docs/README.md`.

- `index.html`: the entire site, including inline CSS, vanilla JavaScript,
  seven scroll scenes, ten expandable guide chapters, and a three.js world.
- `docs/`: architecture explanations and source evidence.
- `tests/check-tour.mjs`: dependency-free Node assertions for site structure,
  links, JavaScript syntax, scroll boundaries, and selected copy corrections.
- `.codex/config.toml`: project-level Codex settings; keep personal settings global.

There is no build step, package manager, backend, or dependency installation.
Python 3 serves the preview; Node runs the check. Commands documented for the
Python application belong to its separate repository, not this site.

## Editing rules

- Keep the single-file implementation and use native HTML, CSS, and existing
  JavaScript patterns. Add dependencies or tooling only for a demonstrated need.
- Keep the existing visual direction and CSS design tokens unless a redesign
  is requested. Preserve responsive layout and avoid horizontal overflow.
- Preserve semantic content, keyboard access, visible focus, readable contrast,
  chapter bookmarks, and automatic opening of linked guide panels.
- Preserve the motion toggle, reduced-motion support, and readable fallback
  content when JavaScript, WebGL, fonts, or the CDN are unavailable.
- Keep the three.js version pinned with matching subresource integrity and
  `crossorigin` metadata. Do not change its version without checking compatibility.
- When fixing JavaScript, trace callers and related event handlers before editing.
  Extend the existing check for meaningful logic changes; avoid adding a framework.

## Source accuracy

- Architecture claims follow the inspected source snapshot identified in
  `docs/README.md`, `docs/10-source-reference.md`, and `docs/11-source-snapshot.md`.
  Keep the landing-page copy and affected guide chapters consistent.
- The sibling `../promoter-brain-core` repository is a read-only reference for
  site work. Do not run its installer, data operations, services, or integrations,
  or edit it, unless the user includes that work in the task.
- Verify changed behavior claims against the relevant source. Distinguish
  conceptual illustrations, historical test evidence, and live verification.
- Do not silently mix a newer implementation with the recorded snapshot. A
  snapshot refresh must update the affected copy, commit links, date, and hashes
  from inspected files. Never invent fingerprints or validation results.
- Keep credentials, customer data, local configuration values, and private
  runtime artifacts out of the site. Source links require team repository access.

## Verification

Run from the repository root:

```sh
node tests/check-tour.mjs
git diff --check
```

For visual or interaction changes, preview with:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Check the affected behavior in a browser at desktop and mobile widths. Include
keyboard navigation, chapter links, motion on/off, reduced motion, and the
fallback relevant to the change. The Node check does not establish browser
rendering, accessibility, CDN availability, or backend correctness. Report any
checks that could not be run; do not claim they passed.

## Git and delivery

- Inspect Git status before editing and preserve unrelated user changes.
- Use `codex/` for new branches unless the user specifies another name.
- This is a workplace `PayMeService` repository. Before a requested push, verify
  authentication uses `constantinshafranski-arch`; do not push as `costiash` or
  change the repository's git author identity.
- Local edits do not publish the GitHub Pages site. Commit, push, or deploy when
  requested; report local verification separately from publication.
- Finish with the changed files, checks and their results, and any remaining
  limitation. Keep the explanation proportional to the change.

## Code Review Rules

Flag unsupported architecture claims, broken source or chapter links, loss of
readable fallback content, accessibility or motion regressions, and changes
that add a runtime/build dependency without a concrete requirement.
