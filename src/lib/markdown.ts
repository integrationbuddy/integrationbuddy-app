/**
 * Kleiner Markdown-Renderer für Antworten des Assistenten (ohne Abhängigkeit).
 * Der Text wird zuerst vollständig escaped; erst danach entstehen Tags.
 * Unterstützt: Überschriften, Absätze, Listen (auch verschachtelt eine Ebene),
 * Tabellen, Codeblöcke, Inline-Code, fett, kursiv, Links.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function renderTable(rows: string[]): string {
  const cells = (line: string) =>
    line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  let html = "<table><thead><tr>" + head.map((h) => `<th>${inline(h)}</th>`).join("") + "</tr></thead>";
  if (body.length) {
    html += "<tbody>" + body.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody>";
  }
  return html + "</table>";
}

const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);

export function renderMarkdown(raw: string): string {
  const text = escapeHtml(raw.replace(/\r\n?/g, "\n").trim());
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;

  const flushList = (items: { level: number; ordered: boolean; text: string }[]) => {
    // Eine Ebene Verschachtelung reicht für Antworten.
    let html = "";
    let open: string[] = [];
    let lastLevel = -1;
    for (const it of items) {
      const tag = it.ordered ? "ol" : "ul";
      if (it.level > lastLevel) {
        html += `<${tag}>`;
        open.push(tag);
      } else if (it.level < lastLevel) {
        html += `</li></${open.pop()}>`;
        html += "</li>";
      } else {
        html += "</li>";
      }
      html += `<li>${inline(it.text)}`;
      lastLevel = it.level;
    }
    while (open.length) html += `</li></${open.pop()}>`;
    return html;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // Codeblock
    if (/^```/.test(line.trim())) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${buf.join("\n")}</code></pre>`);
      continue;
    }

    // Tabelle
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const rows = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(lines[i++]);
      out.push(renderTable(rows));
      continue;
    }

    // Überschrift
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const level = Math.min(h[1].length + 2, 6); // im Chat nie größer als h3
      out.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // Liste
    const li = line.match(/^(\s*)([-*•]|\d+[.)])\s+(.+)$/);
    if (li) {
      const items: { level: number; ordered: boolean; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*•]|\d+[.)])\s+(.+)$/);
        if (!m) break;
        items.push({ level: m[1].length >= 2 ? 1 : 0, ordered: /\d/.test(m[2]), text: m[3] });
        i++;
      }
      out.push(flushList(items));
      continue;
    }

    // Zitat
    if (/^&gt;\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^&gt;\s?/.test(lines[i])) buf.push(lines[i++].replace(/^&gt;\s?/, ""));
      out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }

    // Absatz: Zeilen bis zur Leerzeile, harte Umbrüche bleiben erhalten
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i].trim()) && !/^(#{1,6})\s/.test(lines[i]) && !/^(\s*)([-*•]|\d+[.)])\s+/.test(lines[i]) && !(isTableRow(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
      buf.push(lines[i++]);
    }
    out.push(`<p>${buf.map(inline).join("<br>")}</p>`);
  }

  return out.join("");
}
