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

## Claude Science deep dive (checked 2026-11-20, module 02+ of the deck)
- **What:** "a desktop application that pairs Claude with an analysis environment on your computer" (docs overview). Not a model: it uses the plan's Claude models; some sensitive life-science requests may go to a different Claude model (product FAQ). A generalist coordinating agent, 60+ curated skills and connectors, parallel "delegation" tracks, specialists.
- **Platforms:** macOS 13+, Windows 11, Linux x64 glibc (launch post said macOS/Linux; Windows came later). Linux needs bubblewrap ≥ 0.8.0 + socat + unprivileged user namespaces. WSL 2 (Ubuntu 24.04+) supported for the Linux CLI. Not arm64 or musl.
- **Plans:** Pro, Max, Ultra, Team, Enterprise; not Free. Team/Enterprise: an Owner enables it (Organization settings → Claude Science). Usage shares the 5-hour and weekly limits with Claude Code and chat.
- **What runs where:** app, OS sandbox, Python/R kernels and all state (`~/.claude-science`) on the user's machine. Every reply is a model call to Anthropic carrying "the conversation so far, including … the contents of files Claude has read (PDFs included), code and command output, connector results, images Claude is shown, and recalled memory facts". SSH hosts, Modal, model endpoints and database queries go direct, not through Anthropic. No ZDR, no BAA, no third-party cloud inference.
- **Sandbox:** deny-by-default network via a local proxy (allowlist: package sites, featured databases, approved hosts); writes only to workspace/artifacts/temp; granted folders read-only to code; "aren't a guarantee". Permission cards with scopes Once / This conversation / This project / Global.
- **Remote:** `curl -fsSL https://claude.ai/install-claude-science.sh | bash`, `claude-science serve --no-browser [--detached] [--port N]`, SSH tunnel for ports 8000 + 8001; sign-in link expires in ~3 min. No sudo: conda-installed bwrap/socat + `claude-science sandbox approve`.
- **SSH hosts:** uses ~/.ssh/config, installs nothing; probe (CPUs, memory, GPUs, CUDA, conda/modules/Apptainer, scratch, sbatch, partitions); Slurm via sbatch, else detached process; no PBS/LSF; runs outside sandbox as the user; default timeout 30 min; >100 MB outputs stay on host; 100 concurrent jobs default.
- **Modal:** user's own account and bill; no spend ceiling in app; 10 concurrent jobs; 12 h container timeout (23 max); 1 GiB inputs / 5 GiB outputs; closing the app doesn't cancel jobs.
- **Reviewer:** re-reads responses, approved plan, artifacts, execution record; flags uncomputed results, values contradicting source files, unsupported citations, wrong-article DOIs, skipped plan steps, unsupported conclusions. Doesn't re-run analyses or judge the method. Auto on Max/Ultra/Team/Enterprise; off on Pro. Custom criteria in Settings → Specialists → Reviewer.
- **Provenance:** Messages, Code (download as script/notebook), Execution Log (authoritative), Environment, Review. Versions immutable. Workspace cleared ~12 h after last reply; kernels end after ~30 min idle.
- **Built-ins:** 16 featured connector groups (≈44 databases) + BioMart, CELLxGENE, ZINC, Ketcher; directory: PubMed, Clinical Trials, ChEMBL, bioRxiv. Skills: literature review, indication dossier, AlphaFold2, Boltz-2, Chai-1, ESMFold2, OpenFold3, ProteinMPNN, DiffDock, ESM-2, Evo 2, Borzoi, scGPT, scvi-tools (BioNeMo for Evo 2/Boltz-2/OpenFold3). ColabFold MSAs go direct to api.colabfold.com.
- **Programs:** Team plan for scientists (PI-verified, 1–25 seats, Standard $0 / Premium $15 for 12 months, promotional); AI for Science credits (30 Jun cohort closed 15 Jul); Life Sciences Verification Program (beta).
- **Independent reviews:** faster workflows but reasoning gaps, paywalls, biosecurity refusals (The Scientist); reviewer missed a misattributed survival result (Future Stack Reviews, hands-on, N=1); "Confident wrongness survives" and 54 databases across 24 connectors (An Inquisitive Mind); no PRISMA / reference manager (ThesisAI, a competitor).
- **Discrepancies to watch:** "only the context needed" (launch post) vs "the conversation so far" (data docs); Modal "automatic" (Modal blog) vs per-job approval cards (docs); $30k credits (launch post) vs $100k cohort pool (Modal blog).

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
- https://www.anthropic.com/news/claude-science-ai-workbench (launch post, 30 Jun 2026)
- https://claude.com/product/claude-science (product page + FAQ)
- https://claude.com/docs/claude-science/overview · core-concepts · how-claude-science-works-with-your-data · run-on-remote-linux-server · remote-compute-clusters · compute-providers · the-reviewer · artifacts · connectors-and-skills · tools-and-environments · admin-controls · enable-claude-science · get-started · glossary (index: https://claude.com/docs/llms.txt)
- https://modal.com/blog/modal-integration-brings-scalable-compute-to-claude-science
- https://claude.com/programs/claude-team-plan-for-research-labs · https://www.anthropic.com/news/expanding-support-for-scientists
- https://www.the-scientist.com/early-verdicts-on-claude-science-faster-workflows-but-gaps-remain-74745
- https://future-stack-reviews.com/claude-science-review/
- https://aninquisitivemind.substack.com/p/i-investigated-claude-science-using
- https://rundatarun.io/p/claude-science-and-the-boring-80
- https://www.thesisai.io/blog/claude-science-review/
