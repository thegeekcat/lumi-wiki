# lumi-wiki

A lightweight web-based wiki for Lumi and Hye.

## Current status

This repository is intentionally scaffolded first with a privacy-safe static wiki shell. It does **not** publish Hye's private Obsidian vault by default.

## Build

```bash
npm run build
```

The generated site is written to `dist/`.

## Content model

- Public, web-safe notes live in `content/public/*.md`.
- The generator can later be extended to import selected notes from the Shadow Geeks Obsidian wiki.
- Private/raw notes should stay out of this public repo unless explicitly approved.
