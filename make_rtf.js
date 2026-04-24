const fs = require('fs');

function esc(text) {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '{') out += '\\{';
    else if (ch === '}') out += '\\}';
    else if (code > 127) out += `\\u${code}?`;
    else out += ch;
  }
  return out;
}

function stripHtml(html) {
  html = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  html = html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  html = html.replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  html = html.replace(/&#x2019;/g, "'").replace(/&#x2018;/g, "'");
  html = html.replace(/&#x201C;/g, '"').replace(/&#x201D;/g, '"');
  html = html.replace(/<[^>]+>/g, '');
  html = html.replace(/[ \t]+/g, ' ');
  return html.trim();
}

function getText(html) {
  html = html.replace(/<br\s*\/?>/gi, ' ');
  html = html.replace(/<strong>([\s\S]*?)<\/strong>/gi, '$1');
  html = html.replace(/<em>([\s\S]*?)<\/em>/gi, '$1');
  html = html.replace(/<kbd>([\s\S]*?)<\/kbd>/gi, '$1');
  html = html.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  return stripHtml(html);
}

class RTFBuilder {
  constructor() {
    this.parts = [];
    this.parts.push(String.raw`{\rtf1\ansi\deff0`);
    this.parts.push(String.raw`{\fonttbl{\f0\froman\fcharset0 Times New Roman;}{\f1\fswiss\fcharset0 Arial;}}`);
    this.parts.push(String.raw`{\colortbl;\red0\green0\blue0;\red70\green130\blue180;\red100\green100\blue100;}`);
    this.parts.push(String.raw`\widowctrl\hyphauto`);
    this.parts.push(String.raw`\margl1440\margr1440\margt1440\margb1440`);
  }

  heading1(text) {
    this.parts.push(`{\\pard\\sb240\\sa120\\b\\f1\\fs36 ${esc(text)}\\par}`);
  }
  heading2(text) {
    this.parts.push(`{\\pard\\sb200\\sa80\\b\\f1\\fs28 ${esc(text)}\\par}`);
  }
  heading3(text) {
    this.parts.push(`{\\pard\\sb160\\sa60\\b\\f1\\fs24 ${esc(text)}\\par}`);
  }
  para(text) {
    if (text.trim()) this.parts.push(`{\\pard\\sa100\\f0\\fs22 ${esc(text)}\\par}`);
  }
  bullet(text) {
    if (text.trim()) this.parts.push(`{\\pard\\li400\\fi-200\\sa60\\f0\\fs22 \\bullet  ${esc(text)}\\par}`);
  }
  step(num, text) {
    if (text.trim()) this.parts.push(`{\\pard\\li400\\fi-200\\sa60\\f0\\fs22 {\\b ${esc(String(num))}.}   ${esc(text)}\\par}`);
  }
  callout(title, text) {
    if (title) this.parts.push(`{\\pard\\sb60\\sa40\\li360\\ri360\\b\\f1\\fs22 ${esc(title)}\\b0\\par}`);
    if (text.trim()) this.parts.push(`{\\pard\\sa80\\li360\\ri360\\f0\\fs22\\cf3 ${esc(text)}\\par}`);
  }
  pageBreak() {
    this.parts.push(String.raw`{\pard\pagebb\par}`);
  }
  build() {
    return this.parts.join('\n') + '\n}';
  }
}

// Find all occurrences of a tag with nesting support
function findTagEnd(html, startIndex, tagName) {
  const openRe = new RegExp(`<${tagName}[\\s>]`, 'gi');
  const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');
  let depth = 1;
  let i = startIndex;
  while (depth > 0 && i < html.length) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const openM = openRe.exec(html);
    const closeM = closeRe.exec(html);
    if (!closeM) return html.length;
    if (openM && openM.index < closeM.index) {
      depth++;
      i = openM.index + openM[0].length;
    } else {
      depth--;
      i = closeM.index + closeM[0].length;
      if (depth === 0) return i;
    }
  }
  return i;
}

function processUl(b, ulHtml) {
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(ulHtml)) !== null) {
    // Check for nested ul/ol
    const liContent = m[1];
    const nestedUl = /<ul[^>]*>([\s\S]*?)<\/ul>/i.exec(liContent);
    const mainText = nestedUl
      ? getText(liContent.replace(nestedUl[0], ''))
      : getText(liContent);
    if (mainText) b.bullet(mainText);
    if (nestedUl) {
      const nestedItems = nestedUl[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      for (const item of nestedItems) {
        const t = getText(item);
        if (t) b.bullet('  ' + t);
      }
    }
  }
}

function processSteps(b, divHtml) {
  const stepRe = /<div class="step">([\s\S]*?)<\/div>\s*<\/div>/gi;
  let m;
  while ((m = stepRe.exec(divHtml)) !== null) {
    const stepHtml = m[1];
    const numM = /<div class="step-num">(\d+)<\/div>/.exec(stepHtml);
    const bodyM = /<div class="step-body">([\s\S]*?)<\/div>/.exec(stepHtml);
    const num = numM ? parseInt(numM[1]) : 1;
    if (bodyM) {
      const bodyHtml = bodyM[1];
      const paras = [];
      const pRe = /<p>([\s\S]*?)<\/p>/gi;
      let pm;
      while ((pm = pRe.exec(bodyHtml)) !== null) paras.push(getText(pm[1]));
      const stepText = paras.join(' ');
      b.step(num, stepText);
      // Sub-bullets
      const ulRe = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
      let um;
      while ((um = ulRe.exec(bodyHtml)) !== null) {
        const items = um[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
        for (const item of items) {
          const t = getText(item);
          if (t) b.bullet('  ' + t);
        }
      }
    }
  }
}

function processCallout(b, divHtml) {
  const titleM = /<div class="callout-title">([\s\S]*?)<\/div>/.exec(divHtml);
  const title = titleM ? getText(titleM[1]) : '';
  const paras = [];
  const pRe = /<p>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = pRe.exec(divHtml)) !== null) paras.push(getText(pm[1]));
  b.callout(title, paras.join(' '));
}

function processFaqItem(b, divHtml) {
  const qM = /<div class="faq-q">([\s\S]*?)<span/.exec(divHtml);
  if (qM) b.heading3(getText(qM[1]));
  const aM = /<div class="faq-a">([\s\S]*?)$/.exec(divHtml);
  if (aM) {
    const aHtml = aM[1];
    const pRe = /<p>([\s\S]*?)<\/p>/gi;
    let pm;
    while ((pm = pRe.exec(aHtml)) !== null) b.para(getText(pm[1]));
    const ulRe = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    let um;
    while ((um = ulRe.exec(aHtml)) !== null) processUl(b, um[1]);
    const stepsM = /<div class="steps">([\s\S]*?)<\/div>\s*<\/div>/.exec(aHtml);
    if (stepsM) processSteps(b, stepsM[0]);
  }
}

function processGlossaryCard(b, cardHtml) {
  const termM = /<div class="glossary-term">([\s\S]*?)<\/div>/.exec(cardHtml);
  const defM = /<div class="glossary-def">([\s\S]*?)<\/div>/.exec(cardHtml);
  if (termM) b.heading3(getText(termM[1]));
  if (defM) b.para(getText(defM[1]));
}

function processBlock(b, html) {
  // Process sequentially using a simple scanner
  let i = 0;
  while (i < html.length) {
    // Skip whitespace/text between tags
    const tagStart = html.indexOf('<', i);
    if (tagStart === -1) break;

    // Get tag name
    const tagM = html.slice(tagStart).match(/^<(\w+)([^>]*)>/);
    if (!tagM) { i = tagStart + 1; continue; }

    const tagName = tagM[1].toLowerCase();
    const tagAttrs = tagM[2];
    const innerStart = tagStart + tagM[0].length;
    const closeTag = `</${tagName}>`;
    const closeIdx = (() => {
      // Find matching close tag (handle nesting for div/ul/ol)
      if (['div', 'ul', 'ol'].includes(tagName)) {
        return findTagEnd(html, innerStart, tagName) - closeTag.length;
      }
      const idx = html.indexOf(closeTag, innerStart);
      return idx === -1 ? html.length : idx;
    })();

    const inner = html.slice(innerStart, closeIdx);
    const afterClose = closeIdx + closeTag.length;

    switch (tagName) {
      case 'h2': b.heading2(getText(inner)); break;
      case 'h3': b.heading3(getText(inner)); break;
      case 'p':  { const t = getText(inner); if (t) b.para(t); } break;
      case 'ul': processUl(b, inner); break;
      case 'div': {
        const clsM = /class="([^"]*)"/.exec(tagAttrs);
        const cls = clsM ? clsM[1] : '';
        if (cls.includes('steps')) processSteps(b, tagM[0] + inner + closeTag);
        else if (cls.includes('callout')) processCallout(b, inner);
        else if (cls.includes('faq-item')) processFaqItem(b, inner);
        else if (cls.includes('glossary-card')) processGlossaryCard(b, tagM[0] + inner + closeTag);
        else processBlock(b, inner);
        break;
      }
    }

    i = afterClose;
  }
}

function processPage(b, html) {
  // Get content div
  let contentM = /<div class="content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/body>/.exec(html);
  if (!contentM) contentM = /<div class="content">([\s\S]*)/.exec(html);
  let content = contentM ? contentM[1] : html;

  // Remove chapter-nav
  content = content.replace(/<div class="chapter-nav">[\s\S]*?<\/div>\s*<\/div>/g, '');

  // Process page-hero
  const heroM = /<div class="page-hero">([\s\S]*?)<\/div>/.exec(content);
  if (heroM) {
    const heroHtml = heroM[1];
    const eyebrowM = /<div class="page-hero-eyebrow">([\s\S]*?)<\/div>/.exec(heroHtml);
    const h1M = /<h1>([\s\S]*?)<\/h1>/.exec(heroHtml);
    const subM = /<p>([\s\S]*?)<\/p>/.exec(heroHtml);
    if (eyebrowM) b.para(getText(eyebrowM[1]));
    if (h1M) b.heading1(getText(h1M[1]));
    if (subM) b.para(getText(subM[1]));
    content = content.replace(heroM[0], '');
  }

  // Remove img and img-caption
  content = content.replace(/<img[^>]*>/gi, '');
  content = content.replace(/<div class="img-caption">[\s\S]*?<\/div>/g, '');

  processBlock(b, content);
}

// Build document
const b = new RTFBuilder();

// Title page
b.parts.push(String.raw`{\pard\qc\sb480\sa120\b\f1\fs48 Discord for Beginners\b0\par}`);
b.parts.push(String.raw`{\pard\qc\sa80\f1\fs28 A Complete, Web-Based Step-by-Step Guide for Adults New to Discord\par}`);
b.parts.push(String.raw`{\pard\qc\sa80\f0\fs22\par}`);
b.parts.push(String.raw`{\pard\qc\sa40\f0\fs22 \b Author:\b0  Ric Rebull\par}`);
b.parts.push(String.raw`{\pard\qc\sa40\f0\fs22 \b Instructor:\b0  Prof. Kugelmann\par}`);
b.parts.push(String.raw`{\pard\qc\sa40\f0\fs22 \b Date:\b0  April 23, 2026\par}`);
b.parts.push(String.raw`{\pard\qc\sa40\f0\fs22 ENC 4265 \u183? Technical Writing \u183? UCF\par}`);
b.pageBreak();

const pages = [
  'index.html', 'ch1.html', 'ch2.html', 'ch3.html', 'ch4.html',
  'ch5.html', 'ch6.html', 'ch7.html', 'conclusion.html', 'faq.html', 'glossary.html'
];

for (const page of pages) {
  const html = fs.readFileSync(`D:/Downloads/discord-tutorial/${page}`, 'utf8');
  processPage(b, html);
  b.pageBreak();
}

const rtf = b.build();
fs.writeFileSync('D:/Downloads/discord-tutorial/discord_tutorial.rtf', rtf, 'ascii');
console.log('Done! Saved to discord_tutorial.rtf');
