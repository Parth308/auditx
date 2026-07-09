import { relative, isAbsolute } from 'path';
import type { AuditReport, Finding, Severity, Category } from '../types.js';

const CAT_LABEL: Record<Category, string> = {
  SECRETS: 'Secrets',
  DEPS: 'Dependencies',
  SAST: 'SAST',
  DEAD_CODE: 'Dead Code',
  IaC: 'IaC',
  PATTERNS: 'Patterns',
  DUPLICATION: 'Duplication',
  COMPLEXITY: 'Complexity',
  DEP_HEALTH: 'Dep Health',
  LICENSE: 'License',
  AI_CODE: 'AI Code',
  GIT_HEALTH: 'Git Health',
  TYPE_SAFETY: 'Type Safety',
  SUPPLY_CHAIN: 'Supply Chain',
  COMPOUND: 'Compound',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseMarkdown(text: string): string {
  if (!text) return '';
  return escapeHtml(text)
    // Code blocks: ```code```
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold: **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function formatHtml(report: AuditReport, aiSummary?: string): string {
  const meta = report.meta;
  const summary = report.summary;
  const totalFindings = report.findings.length;
  const urgentCount = summary.critical + summary.high;

  // Compute top offending files
  const fileCounts = new Map<string, number>();
  for (const f of report.findings) {
    if (!f.file) continue;
    let displayFile = f.file;
    if (isAbsolute(f.file) && isAbsolute(meta.target)) {
      displayFile = relative(meta.target, f.file);
    }
    displayFile = displayFile.replace(/\\/g, '/');
    fileCounts.set(displayFile, (fileCounts.get(displayFile) ?? 0) + 1);
  }
  const topFiles = [...fileCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Render findings list
  const findingsHtml = report.findings.map((f, index) => {
    let displayFile = '';
    let location = '';
    if (f.file) {
      displayFile = f.file;
      if (isAbsolute(f.file) && isAbsolute(meta.target)) {
        displayFile = relative(meta.target, f.file);
      }
      displayFile = displayFile.replace(/\\/g, '/');
      location = f.line ? `${displayFile}:${f.line}` : displayFile;
    }

    const uniqueId = f.id || `auditx-finding-${index}`;
    const fixSection = f.fix 
      ? `<div class="finding-fix">
          <div class="fix-header">
            <span>Fix Suggestion</span>
            <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(f.fix.replace(/'/g, "\\'"))}', this)">Copy Fix</button>
          </div>
          <pre><code>${escapeHtml(f.fix)}</code></pre>
         </div>`
      : '';

    const matchSection = f.match
      ? `<div class="finding-match">
          <span class="meta-label">Code Match:</span>
          <pre><code>${escapeHtml(f.match)}</code></pre>
         </div>`
      : '';

    return `
      <div class="finding-card card" data-severity="${f.severity}" data-category="${f.category}" data-file="${escapeHtml(displayFile)}">
        <div class="finding-header">
          <div class="finding-title-row">
            <span class="badge badge-sev badge-${f.severity}">${f.severity.toUpperCase()}</span>
            <span class="badge badge-cat">${CAT_LABEL[f.category] || f.category}</span>
            <h3 class="finding-title">${escapeHtml(f.title)}</h3>
          </div>
          <span class="finding-id">${escapeHtml(uniqueId)}</span>
        </div>
        
        <div class="finding-body">
          ${f.description ? `<p class="finding-description">${parseMarkdown(f.description)}</p>` : ''}
          
          <div class="finding-meta-grid">
            ${displayFile ? `
              <div class="meta-item">
                <span class="meta-label">Location:</span>
                <span class="meta-value font-mono highlight-path">${escapeHtml(location)}</span>
              </div>` : ''}
            ${f.packageName ? `
              <div class="meta-item">
                <span class="meta-label">Package:</span>
                <span class="meta-value font-mono">${escapeHtml(f.packageName)}@${escapeHtml(f.packageVersion || 'latest')}</span>
              </div>` : ''}
            ${f.cve ? `
              <div class="meta-item">
                <span class="meta-label">CVE:</span>
                <span class="meta-value font-mono badge-cve">${escapeHtml(f.cve)} ${f.cvss !== undefined ? `(CVSS ${f.cvss})` : ''}</span>
              </div>` : ''}
            ${f.rule ? `
              <div class="meta-item">
                <span class="meta-label">Rule ID:</span>
                <span class="meta-value font-mono text-muted">${escapeHtml(f.rule)}</span>
              </div>` : ''}
            ${f.scanner ? `
              <div class="meta-item">
                <span class="meta-label">Scanner:</span>
                <span class="meta-value font-mono text-muted">${escapeHtml(f.scanner)}</span>
              </div>` : ''}
          </div>

          ${matchSection}
          ${fixSection}
        </div>
      </div>
    `;
  }).join('\n');

  // Render top files HTML
  const topFilesHtml = topFiles.map(([file, count]) => `
    <div class="top-file-row">
      <span class="top-file-name font-mono" title="${escapeHtml(file)}">${escapeHtml(file)}</span>
      <span class="top-file-count badge badge-low">${count} flag${count > 1 ? 's' : ''}</span>
    </div>
  `).join('\n');

  // Render Category sidebar options
  const allCategories = Array.from(new Set(report.findings.map(f => f.category))) as Category[];
  const categoriesHtml = allCategories.map(cat => {
    const count = report.findings.filter(f => f.category === cat).length;
    return `
      <label class="filter-checkbox-row">
        <input type="checkbox" checked class="category-filter-checkbox" data-category="${cat}" onchange="filterFindings()">
        <span class="checkbox-custom"></span>
        <span class="filter-checkbox-label">${CAT_LABEL[cat] || cat}</span>
        <span class="filter-checkbox-count">${count}</span>
      </label>
    `;
  }).join('\n');

  // Render AI Summary if present
  const aiSectionHtml = aiSummary
    ? `
      <section class="section ai-section card">
        <div class="ai-header">
          <div class="ai-logo-icon">🤖</div>
          <div>
            <h2 class="section-title font-display">AI Copilot Insights</h2>
            <p class="section-subtitle">Automatic vulnerability risk analysis and action items</p>
          </div>
        </div>
        <div class="ai-body markdown-body">
          ${parseMarkdown(aiSummary)}
        </div>
      </section>
      `
    : '';

  // Return full HTML file
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>auditx Security Report — ${escapeHtml(meta.target)}</title>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <style>
    /* ─── Variables & Design Tokens (Matching marketing globals.css) ────────── */
    :root[data-theme="dark"] {
      --color-canvas:     #080808; /* Deepest black */
      --color-surface:    #121110; /* Slightly warm obsidian */
      --color-surface-2:  #1d1916; /* Copper-tinted dark */
      --color-surface-3:  #29221d;
      
      --color-hairline:   rgba(255, 255, 255, 0.08);
      --color-hairline-2: rgba(255, 255, 255, 0.04);
      
      --color-accent:     #ea580c;   /* Glowing burnt orange */
      --color-accent-dim: rgba(234, 88, 12, 0.15);
      
      --color-danger:     #ef4444;   /* Red */
      --color-danger-dim: rgba(239, 68, 68, 0.15);
      --color-warn:       #eab308;   /* Yellow */
      --color-warn-dim:   rgba(234, 179, 8, 0.15);
      --color-ok:         #10b981;   /* Green */
      --color-ok-dim:     rgba(16, 185, 129, 0.15);
      
      --color-ink:        #f5f5f0;
      --color-ink-light:  #a8a29e;
      --color-mute:       #8a847c;
      --color-ash:        #44403c;
      
      --shadow-sm:        0 1px 2px rgba(0, 0, 0, 0.4);
      --shadow-md:        0 4px 10px rgba(0, 0, 0, 0.6);
      --shadow-lg:        0 10px 30px rgba(0, 0, 0, 0.8);
      --shadow-glow:      0 0 25px rgba(234, 88, 12, 0.2);
    }
    
    :root[data-theme="light"] {
      --color-canvas:     #f5f4f0; /* Warm light grey */
      --color-surface:    #ffffff; /* White surface */
      --color-surface-2:  #eae7e1; /* Warm copper-tinted grey */
      --color-surface-3:  #dcd8cf;
      
      --color-hairline:   rgba(0, 0, 0, 0.08);
      --color-hairline-2: rgba(0, 0, 0, 0.04);
      
      --color-accent:     #ea580c;   /* Burnt orange */
      --color-accent-dim: rgba(234, 88, 12, 0.1);
      
      --color-danger:     #ef4444;
      --color-danger-dim: rgba(239, 68, 68, 0.1);
      --color-warn:       #b45309;   /* Higher contrast warn */
      --color-warn-dim:   rgba(180, 83, 9, 0.1);
      --color-ok:         #047857;   /* Higher contrast ok */
      --color-ok-dim:     rgba(4, 120, 87, 0.1);
      
      --color-ink:        #1c1917;   /* Dark charcoal */
      --color-ink-light:  #57534e;
      --color-mute:       #78716c;
      --color-ash:        #e7e5e4;
      
      --shadow-sm:        0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md:        0 4px 8px rgba(0, 0, 0, 0.05);
      --shadow-lg:        0 10px 20px rgba(0, 0, 0, 0.05);
      --shadow-glow:      0 0 25px rgba(234, 88, 12, 0.1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      transition: background-color 0.22s cubic-bezier(0.16, 1, 0.3, 1), 
                  border-color 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--color-canvas);
      color: var(--color-ink);
      line-height: 1.6;
      padding: 3rem 1.5rem;
      overflow-x: hidden;
      
      /* Subtle dot grid */
      background-image: radial-gradient(
        circle,
        var(--color-hairline) 1px,
        transparent 1px
      );
      background-size: 28px 28px;
    }

    .container {
      max-width: 1300px;
      margin: 0 auto;
    }

    code, pre {
      font-family: 'IBM Plex Mono', ui-monospace, monospace;
    }

    /* ─── Typography & Display Fonts ────────────────────────────────────────── */
    .font-display {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .font-mono {
      font-family: 'IBM Plex Mono', ui-monospace, monospace;
      font-size: 0.88em;
    }

    /* ─── Card Design System ────────────────────────────────────────────────── */
    .card {
      background-color: var(--color-surface);
      border: 1px solid var(--color-hairline);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
      position: relative;
    }

    /* ─── Header Section ────────────────────────────────────────────────────── */
    .header-block {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .logo-container {
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-accent), #f97316);
      border-radius: 10px;
      box-shadow: 0 4px 15px var(--color-accent-dim);
    }

    .logo-container svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .brand-name {
      font-size: 2.2rem;
      background: linear-gradient(to right, var(--color-ink), var(--color-ink-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-subtitle {
      font-size: 0.92rem;
      color: var(--color-mute);
      margin-top: 0.1rem;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .theme-toggle-btn {
      background-color: var(--color-surface);
      border: 1px solid var(--color-hairline);
      color: var(--color-ink);
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
    }

    .theme-toggle-btn:hover {
      border-color: var(--color-accent);
    }

    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .pill {
      font-size: 0.82rem;
      padding: 0.28rem 0.68rem;
      background-color: var(--color-surface-2);
      border: 1px solid var(--color-hairline);
      border-radius: 6px;
      color: var(--color-ink-light);
    }

    .pill-active {
      border-color: var(--color-accent-dim);
      background-color: var(--color-accent-dim);
      color: var(--color-accent);
      font-weight: 500;
    }

    /* ─── Hero Stats Grid ────────────────────────────────────────────────── */
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2.5rem;
    }

    .overview-card {
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 110px;
      cursor: pointer;
      transform: translateY(0);
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), 
                  border-color 0.22s ease, 
                  box-shadow 0.22s ease;
    }

    .overview-card:hover {
      transform: translateY(-2px);
      border-color: var(--color-accent);
      box-shadow: var(--shadow-md);
    }

    .overview-card.active-filter {
      border-color: var(--color-accent);
      box-shadow: var(--shadow-glow);
    }

    .overview-label {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 600;
      color: var(--color-ink-light);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .overview-value {
      font-size: 2.3rem;
      font-weight: 700;
      line-height: 1;
      margin-top: 0.5rem;
    }

    .card-indicator {
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;
    }

    .indicator-critical { background-color: var(--color-danger); }
    .indicator-high     { background-color: var(--color-accent); }
    .indicator-medium   { background-color: var(--color-warn); }
    .indicator-low      { background-color: var(--color-ok); }
    .indicator-info     { background-color: var(--color-mute); }
    .indicator-total    { background: linear-gradient(var(--color-accent), #f97316); }

    .text-critical { color: var(--color-danger); }
    .text-high     { color: var(--color-accent); }
    .text-medium   { color: var(--color-warn); }
    .text-low      { color: var(--color-ok); }
    .text-info     { color: var(--color-mute); }

    /* ─── Main Content Split ────────────────────────────────────────────────── */
    .content-layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 2rem;
      align-items: start;
    }

    @media (max-width: 950px) {
      .content-layout {
        grid-template-columns: 1fr;
      }
    }

    /* ─── Sidebar Filters ───────────────────────────────────────────────────── */
    .sidebar {
      position: sticky;
      top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .search-wrapper {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 0.7rem 1rem 0.7rem 2.3rem;
      background-color: var(--color-surface);
      border: 1px solid var(--color-hairline);
      border-radius: 8px;
      color: var(--color-ink);
      font-size: 0.92rem;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 2px var(--color-accent-dim);
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-mute);
      pointer-events: none;
      width: 15px;
      height: 15px;
    }

    .sidebar-section-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--color-ink);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.85rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px dashed var(--color-hairline);
    }

    .filter-checkbox-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .filter-checkbox-row {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: 0.92rem;
      color: var(--color-ink-light);
      user-select: none;
    }

    .filter-checkbox-row input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .checkbox-custom {
      height: 16px;
      width: 16px;
      background-color: var(--color-surface-2);
      border: 1px solid var(--color-hairline);
      border-radius: 4px;
      margin-right: 0.65rem;
      display: inline-block;
      position: relative;
    }

    .filter-checkbox-row:hover input ~ .checkbox-custom {
      border-color: var(--color-accent);
    }

    .filter-checkbox-row input:checked ~ .checkbox-custom {
      background-color: var(--color-accent);
      border-color: var(--color-accent);
    }

    .checkbox-custom:after {
      content: "";
      position: absolute;
      display: none;
      left: 5px;
      top: 2px;
      width: 4px;
      height: 7px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .filter-checkbox-row input:checked ~ .checkbox-custom:after {
      display: block;
    }

    .filter-checkbox-label {
      flex: 1;
    }

    .filter-checkbox-count {
      font-size: 0.78rem;
      font-weight: 500;
      padding: 0.08rem 0.4rem;
      background-color: var(--color-surface-2);
      border-radius: 4px;
      border: 1px solid var(--color-hairline);
      color: var(--color-mute);
    }

    /* Top Files UI */
    .top-files-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .top-file-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      font-size: 0.82rem;
    }

    .top-file-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--color-ink-light);
    }

    /* ─── Findings Column ───────────────────────────────────────────────────── */
    .findings-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .findings-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      max-width: 960px;
      width: 100%;
    }

    .toolbar-title {
      font-size: 1.15rem;
      font-weight: 600;
    }

    .toolbar-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-secondary {
      background-color: var(--color-surface);
      border: 1px solid var(--color-hairline);
      color: var(--color-ink);
      font-size: 0.82rem;
      font-weight: 500;
      padding: 0.45rem 0.85rem;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .btn-secondary:hover {
      border-color: var(--color-accent);
    }

    .finding-card {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      border: 1px solid var(--color-hairline);
      border-radius: 8px;
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      max-width: 960px;
      width: 100%;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.25rem;
      flex-wrap: wrap;
    }

    .finding-title-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
      flex: 1;
    }

    .finding-title {
      font-size: 1.08rem;
      font-weight: 600;
      color: var(--color-ink);
    }

    .finding-id {
      font-size: 0.78rem;
      font-family: 'IBM Plex Mono', monospace;
      color: var(--color-mute);
      background-color: var(--color-surface-2);
      border: 1px solid var(--color-hairline);
      padding: 0.12rem 0.45rem;
      border-radius: 4px;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.18rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }

    .badge-sev {
      text-transform: uppercase;
      font-size: 0.68rem;
    }

    .badge-critical { color: var(--color-danger); background-color: var(--color-danger-dim); border: 1px solid rgba(239, 68, 68, 0.2); }
    .badge-high     { color: var(--color-accent); background-color: var(--color-accent-dim); border: 1px solid rgba(234, 88, 12, 0.2); }
    .badge-medium   { color: var(--color-warn); background-color: var(--color-warn-dim); border: 1px solid rgba(230, 180, 8, 0.2); }
    .badge-low      { color: var(--color-ok); background-color: var(--color-ok-dim); border: 1px solid rgba(16, 185, 129, 0.2); }
    .badge-info     { color: var(--color-mute); background-color: var(--color-hairline-2); border: 1px solid var(--color-hairline); }

    .badge-cat {
      background-color: var(--color-surface-2);
      border: 1px solid var(--color-hairline);
      color: var(--color-ink-light);
    }

    .badge-cve {
      color: var(--color-danger);
      background-color: var(--color-danger-dim);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: 4px;
      padding: 0.1rem 0.35rem;
      font-size: 0.78rem;
    }

    .finding-description {
      color: var(--color-ink-light);
      font-size: 0.92rem;
      margin-bottom: 0.85rem;
    }

    .finding-description code {
      background-color: var(--color-surface-2);
      padding: 0.12rem 0.3rem;
      border-radius: 4px;
      border: 1px solid var(--color-hairline);
      color: var(--color-accent);
    }

    .finding-description a {
      color: var(--color-accent);
      text-decoration: none;
    }

    .finding-description a:hover {
      text-decoration: underline;
    }

    /* Meta Grid */
    .finding-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.75rem;
      background-color: var(--color-surface-2);
      border: 1px solid var(--color-hairline);
      border-radius: 8px;
      padding: 0.85rem;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .meta-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--color-mute);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .meta-value {
      font-size: 0.85rem;
      color: var(--color-ink);
      word-break: break-all;
    }

    .highlight-path {
      color: var(--color-accent);
    }

    /* Code Previews & Fix Section */
    .finding-match, .finding-fix {
      margin-top: 0.65rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .finding-match pre, .finding-fix pre {
      background-color: var(--color-surface-3);
      border: 1px solid var(--color-hairline);
      border-radius: 6px;
      padding: 0.85rem;
      overflow-x: auto;
    }

    .finding-match code, .finding-fix code {
      color: var(--color-ink);
      font-size: 0.82rem;
      display: block;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .fix-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--color-ink);
    }

    .copy-btn {
      background-color: var(--color-surface-2);
      border: 1px solid var(--color-hairline);
      color: var(--color-ink-light);
      padding: 0.22rem 0.65rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.78rem;
    }

    .copy-btn:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    /* ─── AI Insights Section ───────────────────────────────────────────────── */
    .ai-section {
      margin-top: 2.5rem;
      border-left: 3px solid var(--color-accent);
      box-shadow: var(--shadow-glow);
    }

    .ai-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 1.15rem;
    }

    .ai-logo-icon {
      font-size: 2rem;
      animation: pulse 2s infinite ease-in-out;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .section-title {
      font-size: 1.45rem;
    }

    .section-subtitle {
      font-size: 0.88rem;
      color: var(--color-mute);
    }

    .markdown-body {
      color: var(--color-ink-light);
      font-size: 0.95rem;
    }

    .markdown-body p {
      margin-bottom: 0.85rem;
    }

    .markdown-body code {
      background-color: var(--color-surface-2);
      padding: 0.12rem 0.3rem;
      border-radius: 4px;
      border: 1px solid var(--color-hairline);
      color: var(--color-accent);
      font-size: 0.88em;
    }

    /* ─── Toast Alert ────────────────────────────────────────────────────────── */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background-color: var(--color-surface-2);
      color: var(--color-ink);
      padding: 0.7rem 1.4rem;
      border-radius: 6px;
      box-shadow: var(--shadow-lg);
      border-left: 3px solid var(--color-accent);
      display: flex;
      align-items: center;
      gap: 0.65rem;
      z-index: 1000;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    /* ─── Empty state ───────────────────────────────────────────────────────── */
    .empty-state {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      max-width: 960px;
      width: 100%;
    }

    .empty-state-icon {
      font-size: 2.5rem;
      margin-bottom: 0.85rem;
    }

    .empty-state-title {
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 0.4rem;
    }

    .empty-state-desc {
      color: var(--color-mute);
      font-size: 0.9rem;
      max-width: 380px;
    }

    /* ─── Footer ────────────────────────────────────────────────────────────── */
    footer {
      text-align: center;
      margin-top: 5rem;
      font-size: 0.82rem;
      color: var(--color-mute);
      padding-top: 1.25rem;
      border-top: 1px solid var(--color-hairline);
    }

    footer a {
      color: var(--color-accent);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>

  <div class="container">
    
    <!-- Header -->
    <header class="header-block">
      <div class="brand-section">
        <div class="logo-container">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div>
          <h1 class="brand-name font-display">auditx</h1>
          <p class="brand-subtitle">Automated Security & Code Quality Report</p>
        </div>
      </div>
      
      <div class="header-actions">
        <button class="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Theme">
          <span id="theme-toggle-icon">☀️</span>
        </button>
      </div>
    </header>

    <!-- Scan Metadata -->
    <section class="card" style="margin-bottom: 2rem;">
      <h2 class="font-display" style="font-size: 1.3rem; margin-bottom: 0.75rem;">Scan Profile</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
        <div>
          <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600; display: block; color: var(--color-mute);">Target Directory</span>
          <p style="font-weight: 500; font-size: 0.92rem; word-break: break-all;">${escapeHtml(meta.target)}</p>
        </div>
        <div>
          <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600; display: block; color: var(--color-mute);">Scanned At</span>
          <p style="font-weight: 500; font-size: 0.92rem;">${new Date(meta.scannedAt).toLocaleString()}</p>
        </div>
        <div>
          <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600; display: block; color: var(--color-mute);">Duration</span>
          <p style="font-weight: 500; font-size: 0.92rem;">${(meta.durationMs / 1000).toFixed(2)} seconds</p>
        </div>
      </div>
      
      <div style="margin-top: 1.25rem;">
        <span class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 0.5rem; color: var(--color-mute);">Stack Profile</span>
        <div class="meta-pills">
          ${meta.stack.map(s => `<span class="pill pill-active">${escapeHtml(s)}</span>`).join('')}
          ${meta.scanners.map(s => `<span class="pill">${escapeHtml(s)}</span>`).join('')}
        </div>
      </div>
    </section>

    <!-- Overview Hero Stats -->
    <section class="overview-grid">
      <div class="overview-card card active-filter" onclick="selectSeverityFilter('all', this)">
        <div class="card-indicator indicator-total"></div>
        <span class="overview-label">Total Flags</span>
        <span class="overview-value">${totalFindings}</span>
      </div>
      <div class="overview-card card" onclick="selectSeverityFilter('critical', this)">
        <div class="card-indicator indicator-critical"></div>
        <span class="overview-label text-critical">Critical</span>
        <span class="overview-value text-critical">${summary.critical}</span>
      </div>
      <div class="overview-card card" onclick="selectSeverityFilter('high', this)">
        <div class="card-indicator indicator-high"></div>
        <span class="overview-label text-high">High</span>
        <span class="overview-value text-high">${summary.high}</span>
      </div>
      <div class="overview-card card" onclick="selectSeverityFilter('medium', this)">
        <div class="card-indicator indicator-medium"></div>
        <span class="overview-label text-medium">Medium</span>
        <span class="overview-value text-medium">${summary.medium}</span>
      </div>
      <div class="overview-card card" onclick="selectSeverityFilter('low', this)">
        <div class="card-indicator indicator-low"></div>
        <span class="overview-label text-low">Low</span>
        <span class="overview-value text-low">${summary.low}</span>
      </div>
      <div class="overview-card card" onclick="selectSeverityFilter('info', this)">
        <div class="card-indicator indicator-info"></div>
        <span class="overview-label text-info">Info</span>
        <span class="overview-value text-info">${summary.info}</span>
      </div>
    </section>

    <!-- Content Split Layout -->
    <div class="content-layout">
      
      <!-- Sidebar Panel -->
      <aside class="sidebar">
        
        <!-- Search bar -->
        <div class="search-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="live-search" class="search-input" placeholder="Search findings..." oninput="filterFindings()">
        </div>

        <!-- Filter Categories -->
        ${allCategories.length > 0 ? `
        <div class="card">
          <h3 class="sidebar-section-title">Categories</h3>
          <div class="filter-checkbox-list">
            ${categoriesHtml}
          </div>
        </div>
        ` : ''}

        <!-- Top Offending Files -->
        ${topFiles.length > 0 ? `
        <div class="card">
          <h3 class="sidebar-section-title">Top Hotspots</h3>
          <div class="top-files-list">
            ${topFilesHtml}
          </div>
        </div>
        ` : ''}
        
      </aside>

      <!-- Findings List -->
      <main>
        <div class="findings-toolbar">
          <span class="toolbar-title font-display" id="visible-findings-count">Showing ${totalFindings} findings</span>
          <div class="toolbar-actions">
            <button class="btn-secondary" onclick="setExpandAll(true)">Expand All</button>
            <button class="btn-secondary" onclick="setExpandAll(false)">Collapse All</button>
          </div>
        </div>

        <!-- Container for cards -->
        <div class="findings-container" id="findings-cards-list">
          ${findingsHtml}
        </div>

        <!-- Empty state -->
        <div class="card empty-state" id="findings-empty-state">
          <div class="empty-state-icon">🛡️</div>
          <h3 class="empty-state-title">No matching findings</h3>
          <p class="empty-state-desc">Try clearing your filters or adjusting your search criteria.</p>
        </div>

      </main>

    </div>

    <!-- AI insights -->
    ${aiSectionHtml}

    <!-- Toast clipboard alert -->
    <div id="toast-alert" class="toast">
      <span>📋</span>
      <span id="toast-message">Fix suggestion copied!</span>
    </div>

    <!-- Footer -->
    <footer>
      <p>Generated by <a href="https://github.com/parth308/auditx" target="_blank" rel="noopener noreferrer">auditx</a> · MIT License</p>
    </footer>

  </div>

  <script>
    // ─── State Management ────────────────────────────────────────────────────
    let selectedSeverity = 'all';
    
    // ─── Filter Logic ────────────────────────────────────────────────────────
    function selectSeverityFilter(severity, cardElement) {
      // Toggle card styles
      document.querySelectorAll('.overview-card').forEach(c => c.classList.remove('active-filter'));
      cardElement.classList.add('active-filter');
      
      selectedSeverity = severity;
      filterFindings();
    }

    function filterFindings() {
      const searchQuery = document.getElementById('live-search').value.toLowerCase().trim();
      const enabledCategories = Array.from(document.querySelectorAll('.category-filter-checkbox:checked')).map(cb => cb.dataset.category);
      
      const cards = document.querySelectorAll('.finding-card');
      let visibleCount = 0;

      cards.forEach(card => {
        const severity = card.dataset.severity;
        const category = card.dataset.category;
        const file = card.dataset.file.toLowerCase();
        const content = card.textContent.toLowerCase();

        // 1. Severity filter
        const matchesSeverity = (selectedSeverity === 'all' || severity === selectedSeverity);
        
        // 2. Category filter
        const matchesCategory = enabledCategories.includes(category);
        
        // 3. Search query filter
        const matchesSearch = (!searchQuery || content.includes(searchQuery) || file.includes(searchQuery));

        if (matchesSeverity && matchesCategory && matchesSearch) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      // Update counters
      document.getElementById('visible-findings-count').textContent = \`Showing \${visibleCount} finding\${visibleCount !== 1 ? 's' : ''}\`;
      
      // Empty state handler
      const emptyState = document.getElementById('findings-empty-state');
      if (visibleCount === 0) {
        emptyState.style.display = 'flex';
      } else {
        emptyState.style.display = 'none';
      }
    }

    function setExpandAll(expand) {
      const detailSections = document.querySelectorAll('.finding-body');
      detailSections.forEach(el => {
        if (expand) {
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      });
    }

    // ─── Utility Operations ──────────────────────────────────────────────────
    function copyToClipboard(text, btnElement) {
      navigator.clipboard.writeText(text).then(() => {
        // Show Toast
        const toast = document.getElementById('toast-alert');
        toast.classList.add('show');
        
        const originalText = btnElement.textContent;
        btnElement.textContent = 'Copied!';
        btnElement.style.borderColor = 'var(--color-accent)';
        btnElement.style.color = 'var(--color-accent)';
        
        setTimeout(() => {
          toast.classList.remove('show');
          btnElement.textContent = originalText;
          btnElement.style.borderColor = '';
          btnElement.style.color = '';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy code: ', err);
      });
    }

    // ─── Theme Toggling ──────────────────────────────────────────────────────
    function toggleTheme() {
      const html = document.documentElement;
      const themeIcon = document.getElementById('theme-toggle-icon');
      
      if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        themeIcon.textContent = '🌙';
        localStorage.setItem('auditx-theme', 'light');
      } else {
        html.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        localStorage.setItem('auditx-theme', 'dark');
      }
    }

    // Load theme from store
    window.addEventListener('DOMContentLoaded', () => {
      const savedTheme = localStorage.getItem('auditx-theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.getElementById('theme-toggle-icon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
      }
      
      // Expand/Collapse cards on title click for dashboard interactivity
      document.querySelectorAll('.finding-card').forEach(card => {
        const titleRow = card.querySelector('.finding-title-row');
        const body = card.querySelector('.finding-body');
        titleRow.style.cursor = 'pointer';
        titleRow.addEventListener('click', () => {
          if (window.getComputedStyle(body).display === 'none') {
            body.style.display = 'block';
          } else {
            body.style.display = 'none';
          }
        });
      });
    });
  </script>
</body>
</html>
`;
}
