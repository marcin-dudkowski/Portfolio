/* markdown.js — a tiny, dependency-free Markdown→HTML renderer.
   Handles the subset used by portfolio content: headings, paragraphs,
   bold/italic/code, links, images, lists, blockquotes and #hashtags.
   Layout extras for sheet-style project pages:
     ![alt](src "caption")   an image on its own line -> <figure> (caption optional)
     ::: cols 2:3            side-by-side columns, split by a line of |||,
     ...                     closed by a bare :::  (ratio optional, e.g. 1:1:1)
     |||                     columns stack on narrow screens. Words after the
     ...                     ratio become classes, e.g. `::: cols 1:1 spread`
     :::                     spreads each column's items over the full height;
                             `fill` makes a lone figure span the row height.
   Not CommonMark-complete — good enough for a prototype, safe by default. */

(function () {
  const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // inline: images, links, bold, italic, code, hashtags
  function inline(text) {
    let t = esc(text);
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">');
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    // hashtags -> clickable spans (app.js delegates clicks)
    t = t.replace(/(^|\s)#([A-Za-z0-9_-]+)/g,
      '$1<span class="hashtag" data-tag="$2">#$2</span>');
    return t;
  }

  function render(md) {
    if (!md) return '';
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let listType = null;

    const closeList = () => {
      if (listType) { out.push(`</${listType}>`); listType = null; }
    };

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) { closeList(); i++; continue; }

      let m;
      if ((m = line.match(/^:::\s*cols(?:\s+([\d.:]+))?((?:\s+[a-z-]+)*)\s*$/))) {
        closeList();
        const cols = [[]]; i++;
        while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
          if (/^\|\|\|\s*$/.test(lines[i])) cols.push([]); else cols[cols.length - 1].push(lines[i]);
          i++;
        }
        i++;   // closing :::
        const ratio = m[1] ? m[1].split(':') : [];
        const tpl = cols.map((_, k) => `minmax(0, ${Number(ratio[k]) || 1}fr)`).join(' ');
        const spread = /\bspread\b/.test(m[2] || '');
        // spread columns: each heading or figure starts a group, so a heading stays with its text
        const colHTML = (c) => {
          if (!spread) return render(c.join('\n'));
          const groups = [];
          c.forEach((l) => { if (!groups.length || /^(#{1,4}\s|\s*!\[)/.test(l)) groups.push([]); groups[groups.length - 1].push(l); });
          return groups.map((g) => render(g.join('\n'))).filter(Boolean).map((h) => `<div class="md-grp">${h}</div>`).join('');
        };
        out.push(`<div class="md-cols${(m[2] || '').replace(/\s+/g, ' ')}" style="grid-template-columns:${tpl}">` +
          cols.map((c) => `<div class="md-col">${colHTML(c)}</div>`).join('') + '</div>');
        continue;
      }
      if ((m = line.match(/^\s*!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)\s*$/))) {
        closeList();
        const cap = m[3] || '';
        out.push(`<figure class="md-fig"><img src="${esc(m[2])}" alt="${esc(m[1] || cap)}" loading="lazy">` +
          (cap ? `<figcaption>${inline(cap)}</figcaption>` : '') + '</figure>');
        i++; continue;
      }
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
        closeList();
        const lvl = m[1].length;
        out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`);
        i++; continue;
      }
      if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
        if (listType !== 'ul') { closeList(); listType = 'ul'; out.push('<ul>'); }
        out.push(`<li>${inline(m[1])}</li>`);
        i++; continue;
      }
      if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
        if (listType !== 'ol') { closeList(); listType = 'ol'; out.push('<ol>'); }
        out.push(`<li>${inline(m[1])}</li>`);
        i++; continue;
      }
      if ((m = line.match(/^>\s?(.*)$/))) {
        closeList();
        out.push(`<blockquote>${inline(m[1])}</blockquote>`);
        i++; continue;
      }
      // paragraph: gather consecutive non-empty, non-special lines
      closeList();
      const para = [line];
      while (i + 1 < lines.length && lines[i + 1].trim() &&
             !/^(#{1,4}\s|\s*[-*+]\s|\s*\d+\.\s|>\s?|:::|\s*!\[)/.test(lines[i + 1])) {
        para.push(lines[++i]);
      }
      out.push(`<p>${inline(para.join(' '))}</p>`);
      i++;
    }
    closeList();
    return out.join('\n');
  }

  window.renderMarkdown = render;
})();
