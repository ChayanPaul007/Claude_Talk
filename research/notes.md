# Research notes for the talk (gathered 2026-11-19)

Everything here was checked against web sources on 19 Nov 2026. Items marked **beta** or
**preview** may change; re-check the release notes the day before the talk.

## Models (current)
- Claude Opus 5.5 (`claude-opus-5-5`) — 22 Sep 2026; flagship for coding/agents; 1M context in Claude Code.
- Claude Sonnet 5.5 (`claude-sonnet-5-5`) — 28 Sep 2026; ~30% faster output and up to 30% cheaper per task than Sonnet 5 (Anthropic-reported).
- Claude Haiku 5.5 (`claude-haiku-5-5`) — 7 Oct 2026.
- Claude Fable 5.2 (`claude-fable-5-2`) — 9 Nov 2026; default Fable in Claude Code 2.1.321, 1M context.
- Claude Mythos 5.2 — 9 Nov 2026; only for orgs verified through Anthropic programs.

## Claude apps (web / desktop / mobile)
- 16 Sep 2026: Cowork folded into every conversation ("one Claude"); Claude Docs, Slides and Design available in chat (Docs/Slides/Design beta on Enterprise). Slides export to PPTX/PDF, Docs to Word/Google Docs.
- 10 Jul 2026: memory became categorized, editable entries. 25 Aug: memory spans chat + Cowork, editable Topics, sensitive topics excluded unless enabled.
- 12 Jun 2026: highlight part of a draft to edit in place.
- 7 Jul 2026: Cowork sessions on web/mobile (remote, beta); Microsoft 365 connector write tools.
- 25 Sep 2026: developer portal to submit plugins to the Claude directory.
- 30 Jun 2026: **Claude Science** public beta — research workbench (literature, code execution, figures, auditable history, reviewer agent checking citations & calculations). macOS/Linux, local or remote incl. HPC login node. Pro/Max/Team/Enterprise.
- 27 Aug 2026: expanded support for scientists (free access for 10,000 scientists to start; PI Team subscription).
- 10–12 Nov 2026: Claude Meetings (beta, Team/Enterprise, Google Meet). Claude Sheets + Whiteboards (beta), Claude Data (formerly Dashboards, GA).
- 17 Nov 2026: Desktop release channels (Stable / Latest).
- Chrome: side panel runs a full Cowork session (skills, plugins, connectors). Excel & PowerPoint add-ins share context (Mar 2026).

## Claude Code (v2.1.328 on 19 Nov 2026)
- Surfaces: CLI, Desktop Code tab, web (claude.ai/code, `--cloud`, `--teleport`), VS Code/Cursor, JetBrains, mobile + Remote Control.
- Permission modes: Manual, acceptEdits, plan, auto (classifier; default for interactive sessions since 2.1.283), dontAsk, bypassPermissions. Shift+Tab cycles.
- CLAUDE.md hierarchy + `.claude/rules/`, `@imports`; auto memory in `~/.claude/projects/<proj>/memory/MEMORY.md`.
- Skills: `SKILL.md` + frontmatter; `~/.claude/skills`, `.claude/skills`, plugin skills (`/plugin:skill`), synced from claude.ai.
- Plugins: `.claude-plugin/plugin.json`; skills, agents, hooks, `.mcp.json`, output styles, workflows. `/plugin`, `claude plugin eval`.
- Hooks: 33 events (PreToolUse, PostToolUse, UserPromptSubmit, Stop, SessionStart, PreCompact …); handlers command/http/mcp_tool/prompt/agent.
- Subagents: Explore/Plan/general-purpose built in; custom in `.claude/agents/`; fork subagents; background by default.
- Agent teams (experimental), dynamic workflows (`ultracode`, `/deep-research`, `/workflows`).
- Scheduled tasks / routines (`/schedule`), `/loop`, headless `claude -p --output-format json`, worktrees (`claude -w`), checkpoints (`/rewind`, Esc Esc), Code Mode (experimental, 2.1.323).

## API / platform
- Managed Agents public beta (Apr 2026): hosted agent harness with built-in caching & compaction.
- Agent SDK: same loop as Claude Code, Python (`claude_agent_sdk`) and TypeScript.
- 7 Oct 2026: Max and Team plans include monthly API credits.

## Sources
- https://support.claude.com/en/articles/12138966-release-notes
- https://www.anthropic.com/news/announcements
- https://code.claude.com/docs/en/changelog and https://code.claude.com/docs/en/overview
- https://platform.claude.com/docs/en/release-notes/overview
- https://platform.claude.com/docs/en/managed-agents/overview
- https://venturebeat.com/technology/anthropic-is-killing-off-cowork-and-folding-it-into-claude-launching-claude-docs-and-claude-slides
- https://thenewstack.io/anthropic-claude-science-workbench/
- https://techcrunch.com/2026/11/10/anthropic-launches-claude-meetings-to-turn-workplace-discussions-into-plans-and-tasks/
- https://the-decoder.com/anthropic-brings-claude-cowork-to-its-chrome-extension-adding-skills-and-plugins-to-the-browser/
- https://www.anthropic.com/claude-opus-5-5
