import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'content', 'public');
const distDir = path.join(root, 'dist');
const stylesPath = path.join(root, 'src', 'styles.css');

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '') || 'note';
}

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
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
      data[key] = value.slice(1, -1).split(',').map(v => v.trim()).filter(Boolean);
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
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>');
  return out;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  let html = '';
  let listOpen = false;
  for (const line of lines) {
    if (!line.trim()) {
      if (listOpen) { html += '</ul>'; listOpen = false; }
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      if (listOpen) { html += '</ul>'; listOpen = false; }
      const level = heading[1].length;
      html += `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!listOpen) { html += '<ul>'; listOpen = true; }
      html += `<li>${inlineMarkdown(bullet[1])}</li>`;
      continue;
    }
    if (line.startsWith('> ')) {
      if (listOpen) { html += '</ul>'; listOpen = false; }
      html += `<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`;
      continue;
    }
    if (listOpen) { html += '</ul>'; listOpen = false; }
    html += `<p>${inlineMarkdown(line)}</p>`;
  }
  if (listOpen) html += '</ul>';
  return html;
}

function pageShell({ title, description, body, script = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · Lumi Wiki</title>
  <meta name="description" content="${escapeHtml(description || 'Lumi Wiki')}" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
${body}
${script}
</body>
</html>`;
}

function collectNotes() {
  if (!fs.existsSync(contentDir)) return [];
  const files = fs.readdirSync(contentDir).filter(file => file.endsWith('.md'));
  return files.map(file => {
    const raw = fs.readFileSync(path.join(contentDir, file), 'utf8');
    const [frontmatter, body] = parseFrontmatter(raw);
    const title = frontmatter.title || file.replace(/\.md$/, '');
    const slug = frontmatter.slug || slugify(file.replace(/\.md$/, ''));
    const description = frontmatter.description || body.split('\n').find(line => line.trim() && !line.startsWith('#')) || '';
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    return { file, title, slug, description, tags, updated: frontmatter.updated || '', body, html: markdownToHtml(body) };
  }).sort((a, b) => a.title.localeCompare(b.title));
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(path.join(distDir, 'notes'), { recursive: true });
fs.copyFileSync(stylesPath, path.join(distDir, 'styles.css'));

const notes = collectNotes();

for (const note of notes) {
  const noteDir = path.join(distDir, 'notes', note.slug);
  fs.mkdirSync(noteDir, { recursive: true });
  const body = `<main class="article">
    <nav><a href="/">← Lumi Wiki</a></nav>
    <p class="eyebrow">${note.updated ? `Updated ${escapeHtml(note.updated)}` : 'Lumi Wiki note'}</p>
    <h1>${escapeHtml(note.title)}</h1>
    <section class="prose">${note.html}</section>
  </main>`;
  fs.writeFileSync(path.join(noteDir, 'index.html'), pageShell({ title: note.title, description: note.description, body }));
}

const cards = notes.map(note => `<a class="card" href="/notes/${note.slug}/" data-title="${escapeHtml(note.title.toLowerCase())}" data-tags="${escapeHtml(note.tags.join(' ').toLowerCase())}">
  <h2>${escapeHtml(note.title)}</h2>
  <p>${escapeHtml(note.description)}</p>
  <div class="tags">${note.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
</a>`).join('\n');

const indexBody = `<header class="hero shell">
  <p class="eyebrow">🐾 The Shadow Geeks knowledge garden</p>
  <h1>Lumi Wiki</h1>
  <p class="subtitle">A web-accessible wiki for polished, share-safe knowledge from Hye, Lumi, and our tiny-panther family systems. Private raw notes stay private until Hye approves them for publishing.</p>
  <div class="toolbar">
    <input id="search" class="search" type="search" placeholder="Search Lumi Wiki..." autocomplete="off" />
    <span class="badge">${notes.length} public note${notes.length === 1 ? '' : 's'}</span>
  </div>
</header>
<main class="shell grid" id="grid">${cards}</main>
<footer><div class="shell">Built by Lumi for Hye · privacy-first public wiki shell</div></footer>`;

const script = `<script>
const input = document.querySelector('#search');
const cards = [...document.querySelectorAll('.card')];
input?.addEventListener('input', () => {
  const q = input.value.trim().toLowerCase();
  for (const card of cards) {
    const haystack = card.dataset.title + ' ' + card.dataset.tags + ' ' + card.textContent.toLowerCase();
    card.style.display = haystack.includes(q) ? '' : 'none';
  }
});
</script>`;

fs.writeFileSync(path.join(distDir, 'index.html'), pageShell({ title: 'Home', description: 'Lumi Wiki', body: indexBody, script }));
fs.writeFileSync(path.join(distDir, 'search-index.json'), JSON.stringify(notes.map(({ title, slug, description, tags, updated }) => ({ title, slug, description, tags, updated })), null, 2));
console.log(`Built Lumi Wiki with ${notes.length} public note(s).`);
