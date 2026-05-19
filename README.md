# lumi-wiki

A privacy-safe, static web wiki for polished public knowledge from Hye, Lumi, and The Shadow Geeks.

## Current status

This repository builds a small Apple-inspired V1 wiki shell:

- public homepage
- searchable note cards
- generated note pages
- static `search-index.json`
- privacy-first publishing boundary
- Vercel-ready `dist/` output

It does **not** publish Hye's private Obsidian vault or raw notes by default.

## Build

```bash
npm run build
```

The generated site is written to `dist/`.

Optional local preview:

```bash
npm run preview
```

Then open <http://localhost:4173>.

## Content model

Public notes live in:

```text
content/public/*.md
```

Each note may include frontmatter:

```md
---
title: Note title
description: Short public description
tags: [privacy, wiki]
section: Governance
status: Public
updated: 2026-05-19
---
```

The generator reads **only** `content/public/`. Private/raw vault notes should stay outside this repo unless Hye explicitly approves a polished public version.

## Publishing checklist

Before adding any note to `content/public/`, confirm it contains no:

- private personal details
- client/employer-sensitive information
- passwords, tokens, secret URLs, or internal identifiers
- raw emotional processing or private family context
- unapproved screenshots or copied source material
- unfinished drafts that could be misread as public positions

When unsure, do not publish.

## Design direction

Apple-inspired, not Apple-cloned:

- `#f5f5f7` light canvas
- white surfaces
- `#1d1d1f` primary text
- restrained gray hierarchy
- blue `#0071e3` / `#0066cc` for interaction only
- large precise system typography
- generous whitespace
- pill CTAs, search, and filters
- minimal borders and soft shadows

## Deployment

The repo is connected to Vercel through GitHub deployments. Pushes to `main` should trigger a production deployment.

Known deployment URL from the current GitHub deployment status:

<https://lumi-wiki-plws8lv35-genihj-5323s-projects.vercel.app>
