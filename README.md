# Promoter Brain Core — architecture, considered

A cinematic, scroll-driven tour of [Promoter Brain Core](https://github.com/PayMeService/promoter-brain-core) (private; team access). Seven compositions take the reader through the system overview, package boundaries, revision lifecycle, profiling, explicit RDS handoff, audience selection, and evidence. Ten expandable field-guide chapters retain the detailed explanations, commands, and glossary.

The architecture copy follows the source snapshot documented in [docs/](docs/README.md), inspected on 2026-09-10 at `3c8eb0841795b3f0f17fde5aad67a37f73726224`. The scenes are conceptual illustrations, not live data or application screenshots.

## Preview and check

```sh
python3 -m http.server 4173 --bind 127.0.0.1
# Open http://127.0.0.1:4173
node tests/check-tour.mjs
```

The site remains one `index.html`, with vanilla JavaScript and the existing integrity-pinned three.js dependency from cdnjs. No build or package installation is required. Google Fonts supplies the typography. Native scrolling drives a continuous 3D world with procedural studio lighting; no generated film or image assets are required. Motion can be paused, reduced-motion preferences are honored, and an inline illustration plus complete HTML content remain when WebGL or the CDN is unavailable. Direct chapter links open their corresponding field-guide panels.

Visual direction: luxury typography, obsidian, parchment, champagne, and patinated brass. Design tokens live at the top of the inline stylesheet. Motion references: [Scroll World](https://github.com/cth9191/scroll-world) for connected spatial storytelling, and [Motion Design](https://github.com/cth9191/motion-design) for layered component reveals. This is a browser-rendered interpretation, not their Higgsfield video-generation pipeline.

Live site: [paymeservice.github.io/promoter-brain-core-site](https://paymeservice.github.io/promoter-brain-core-site/). Local edits must be published separately to update it.

## Working with Codex

Open this repository as the project folder. [AGENTS.md](AGENTS.md) contains the
project rules, source-evidence requirements, and verification commands.
[.codex/config.toml](.codex/config.toml) sets the project sandbox; model and other
personal preferences remain inherited. No project-specific skills, hooks, or
MCP servers are required. Start a new task to load the project instructions;
project config applies when the project is trusted. See the official
[instruction guide](https://developers.openai.com/codex/guides/agents-md) and
[config guide](https://developers.openai.com/codex/config-basic).
