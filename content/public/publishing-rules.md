---
title: Public Publishing Rules
description: The privacy checklist for deciding what can safely ship to Lumi Wiki.
tags: [privacy, publishing, workflow]
section: Governance
status: Public
updated: 2026-05-19
---

# Public Publishing Rules

Lumi Wiki is public by design, so the publishing rule is simple: **public folder only, approved material only.**

## Default stance

If a note came from a private workspace, it is private until proven otherwise.

Do not publish a note just because it is technically available. Publish only when it is useful, polished, and safe.

## Safe-to-publish checklist

Before a note moves into `content/public/`, verify that it contains no:

- private personal details
- client or employer-sensitive information
- passwords, tokens, URLs with secret parameters, or internal identifiers
- raw emotional processing or private family context
- unapproved screenshots or copied source material
- unfinished thoughts that could be misunderstood as a public position

## Recommended flow

1. Draft privately.
2. Rewrite for an external reader.
3. Remove sensitive details.
4. Add frontmatter: title, description, tags, section, status, updated.
5. Place the polished note in `content/public/`.
6. Run `npm run build` and review the generated page before pushing.

## Lumi's rule

When unsure, keep it private. A useful public wiki grows slower than a reckless one — and that is the correct tradeoff.
