import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'content', 'public');
const distDir = path.join(root, 'dist');
const stylesPath = path.join(root, 'src', 'styles.css');

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'note';
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return [{}, raw];
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return [{}, raw];
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trim();
  const data = {};

  for (const line of fm.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    let [, key, value] = match;
    value = value.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
  return [data, body];
}

function inlineMarkdown(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>');
  return out;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  let html = '';
  let listOpen = false;
  let orderedOpen = false;

  function closeLists() {
    if (listOpen) { html += '</ul>'; listOpen = false; }
    if (orderedOpen) { html += '</ol>'; orderedOpen = false; }
  }

  for (const line of lines) {
    if (!line.trim()) {
      closeLists();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeLists();
      const level = heading[1].length;
      html += `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (orderedOpen) { html += '</ol>'; orderedOpen = false; }
      if (!listOpen) { html += '<ul>'; listOpen = true; }
      html += `<li>${inlineMarkdown(bullet[1])}</li>`;
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      if (listOpen) { html += '</ul>'; listOpen = false; }
      if (!orderedOpen) { html += '<ol>'; orderedOpen = true; }
      html += `<li>${inlineMarkdown(numbered[1])}</li>`;
      continue;
    }

    if (line.startsWith('> ')) {
      closeLists();
      html += `<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`;
      continue;
    }

    closeLists();
    html += `<p>${inlineMarkdown(line)}</p>`;
  }

  closeLists();
  return html;
}

function siteNav() {
  return `<nav class="topbar" aria-label="Primary navigation">
  <a class="brand" href="/" aria-label="Lumi Wiki home"><span class="brand-mark">●</span><span>Lumi Wiki</span></a>
  <div class="nav-links">
    <a href="/#notes">Notes</a>
    <a href="/#principles">Principles</a>
    <a href="/#publishing">Publishing</a>
  </div>
</nav>`;
}

function pageShell({ title, description, body, script = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · Lumi Wiki</title>
  <meta name="description" content="${escapeHtml(description || 'Lumi Wiki')}" />
  <meta name="color-scheme" content="light" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
${siteNav()}
${body}
${script}
</body>
</html>`;
}

function collectNotes() {
  if (!fs.existsSync(contentDir)) return [];
  const files = fs.readdirSync(contentDir).filter((file) => file.endsWith('.md'));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(contentDir, file), 'utf8');
    const [frontmatter, body] = parseFrontmatter(raw);
    const title = frontmatter.title || file.replace(/\.md$/, '');
    const slug = frontmatter.slug || slugify(file.replace(/\.md$/, ''));
    const firstBodyLine = body.split('\n').find((line) => line.trim() && !line.startsWith('#')) || '';
    const description = frontmatter.description || firstBodyLine.replace(/^[-*>\s]+/, '');
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    const section = frontmatter.section || 'Knowledge';
    const status = frontmatter.status || 'Public';
    const updated = frontmatter.updated || '';
    return {
      file,
      title,
      slug,
      description,
      tags,
      section,
      status,
      updated,
      body,
      html: markdownToHtml(body),
    };
  }).sort((a, b) => (b.updated || '').localeCompare(a.updated || '') || a.title.localeCompare(b.title));
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(path.join(distDir, 'notes'), { recursive: true });
fs.copyFileSync(stylesPath, path.join(distDir, 'styles.css'));

const notes = collectNotes();
const allTags = [...new Set(notes.flatMap((note) => note.tags))].sort((a, b) => a.localeCompare(b));
const sections = [...new Set(notes.map((note) => note.section))].sort((a, b) => a.localeCompare(b));

for (const note of notes) {
  const noteDir = path.join(distDir, 'notes', note.slug);
  fs.mkdirSync(noteDir, { recursive: true });
  const tags = note.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const body = `<main class="article shell-narrow">
    <a class="back-link" href="/">← All public notes</a>
    <header class="article-hero">
      <p class="eyebrow">${escapeHtml(note.section)} · ${note.updated ? `Updated ${escapeHtml(note.updated)}` : escapeHtml(note.status)}</p>
      <h1>${escapeHtml(note.title)}</h1>
      <p class="article-deck">${escapeHtml(note.description)}</p>
      <div class="tags">${tags}</div>
    </header>
    <section class="prose">${note.html}</section>
  </main>
  <footer class="site-footer"><div class="shell">Lumi Wiki publishes only approved public notes. Private/raw material stays offline.</div></footer>`;
  fs.writeFileSync(path.join(noteDir, 'index.html'), pageShell({ title: note.title, description: note.description, body }));
}

const cards = notes.map((note) => `<a class="note-card" href="/notes/${note.slug}/" data-title="${escapeHtml(note.title.toLowerCase())}" data-tags="${escapeHtml(note.tags.join(' ').toLowerCase())}" data-section="${escapeHtml(note.section.toLowerCase())}" data-description="${escapeHtml(note.description.toLowerCase())}">
  <div class="card-meta"><span>${escapeHtml(note.section)}</span><span>${note.updated ? escapeHtml(note.updated) : escapeHtml(note.status)}</span></div>
  <h3>${escapeHtml(note.title)}</h3>
  <p>${escapeHtml(note.description)}</p>
  <div class="tags">${note.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
</a>`).join('\n');

const tagButtons = allTags.map((tag) => `<button class="filter-chip" type="button" data-filter="${escapeHtml(tag.toLowerCase())}">${escapeHtml(tag)}</button>`).join('');
const sectionList = sections.map((section) => `<li><span>${escapeHtml(section)}</span><strong>${notes.filter((note) => note.section === section).length}</strong></li>`).join('');

const indexBody = `<header class="hero shell">
  <p class="eyebrow">Privacy-first public knowledge garden</p>
  <h1>Useful knowledge, polished for the open web.</h1>
  <p class="subtitle">Lumi Wiki is the share-safe surface for Hye, Lumi, and The Shadow Geeks: curated notes, public systems, and product-like knowledge cards — without exposing private Obsidian/raw material.</p>
  <div class="hero-actions">
    <a class="button primary" href="#notes">Browse public notes</a>
    <a class="button secondary" href="#publishing">Publishing rules</a>
  </div>
</header>

<main>
  <section class="overview shell" aria-label="Wiki overview">
    <article class="stat-card"><span>${notes.length}</span><p>approved public notes</p></article>
    <article class="stat-card"><span>${allTags.length}</span><p>searchable topic tags</p></article>
    <article class="stat-card"><span>0</span><p>private notes auto-published</p></article>
  </section>

  <section class="panel shell" id="notes">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Public index</p>
        <h2>Explore the wiki</h2>
      </div>
      <span class="count-pill">${notes.length} note${notes.length === 1 ? '' : 's'}</span>
    </div>
    <div class="search-row">
      <label class="search-wrap" for="search"><span>⌕</span><input id="search" type="search" placeholder="Search title, tag, section, or description" autocomplete="off" /></label>
    </div>
    <div class="filters" aria-label="Tag filters">
      <button class="filter-chip active" type="button" data-filter="">All</button>
      ${tagButtons}
    </div>
    <div class="note-grid" id="grid">${cards}</div>
    <p class="empty-state" id="empty" hidden>No public note matches that search yet.</p>
  </section>

  <section class="split shell" id="principles">
    <div>
      <p class="eyebrow">Design direction</p>
      <h2>Apple-inspired, not Apple-copied.</h2>
      <p>Light canvas, white surfaces, precise system typography, generous whitespace, restrained gray hierarchy, and blue only where interaction needs it.</p>
    </div>
    <ul class="check-list">
      <li>Readable before decorative.</li>
      <li>Cards should feel calm, polished, and useful.</li>
      <li>Search and navigation stay obvious on small screens.</li>
      <li>Private material is never included by automation.</li>
    </ul>
  </section>

  <section class="publishing shell" id="publishing">
    <div class="publishing-card">
      <p class="eyebrow">Publishing boundary</p>
      <h2>Only <code>content/public/*.md</code> ships.</h2>
      <p>The build pipeline reads the public content folder only. Raw Obsidian notes, private drafts, and unapproved vault material remain outside the generated site.</p>
    </div>
    <div class="section-card">
      <h3>Sections</h3>
      <ul class="section-list">${sectionList}</ul>
    </div>
  </section>
</main>
<footer class="site-footer"><div class="shell">Built by Lumi for Hye · static, searchable, privacy-safe.</div></footer>`;

const script = `<script>
const input = document.querySelector('#search');
const cards = [...document.querySelectorAll('.note-card')];
const chips = [...document.querySelectorAll('.filter-chip')];
const empty = document.querySelector('#empty');
let activeFilter = '';

function applyFilters() {
  const q = input?.value.trim().toLowerCase() || '';
  let shown = 0;
  for (const card of cards) {
    const haystack = [card.dataset.title, card.dataset.tags, card.dataset.section, card.dataset.description, card.textContent.toLowerCase()].join(' ');
    const matchesText = !q || haystack.includes(q);
    const matchesFilter = !activeFilter || haystack.includes(activeFilter);
    const visible = matchesText && matchesFilter;
    card.hidden = !visible;
    if (visible) shown += 1;
  }
  if (empty) empty.hidden = shown !== 0;
}

input?.addEventListener('input', applyFilters);
chips.forEach((chip) => chip.addEventListener('click', () => {
  activeFilter = chip.dataset.filter || '';
  chips.forEach((item) => item.classList.toggle('active', item === chip));
  applyFilters();
}));
</script>`;

fs.writeFileSync(path.join(distDir, 'index.html'), pageShell({ title: 'Home', description: 'A privacy-first public wiki for polished Shadow Geeks knowledge.', body: indexBody, script }));
fs.writeFileSync(path.join(distDir, 'search-index.json'), JSON.stringify(notes.map(({ title, slug, description, tags, section, status, updated }) => ({ title, slug, description, tags, section, status, updated })), null, 2));
console.log(`Built Lumi Wiki with ${notes.length} public note(s), ${sections.length} section(s), and ${allTags.length} tag(s).`);
