import re

def esc(text):
    """Escape special RTF characters and handle unicode."""
    out = []
    for ch in text:
        if ch == '\\':
            out.append('\\\\')
        elif ch == '{':
            out.append('\\{')
        elif ch == '}':
            out.append('\\}')
        elif ord(ch) > 127:
            out.append(f'\\u{ord(ch)}?')
        else:
            out.append(ch)
    return ''.join(out)

def strip_html(html):
    """Strip HTML tags, decode entities, return plain text."""
    # Remove script/style blocks
    html = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', html, flags=re.DOTALL)
    # Decode common entities
    html = html.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    html = html.replace('&nbsp;', ' ').replace('&#39;', "'").replace('&quot;', '"')
    # Remove tags
    html = re.sub(r'<[^>]+>', '', html)
    # Collapse whitespace
    html = re.sub(r'[ \t]+', ' ', html)
    return html.strip()

class RTFBuilder:
    def __init__(self):
        self.parts = []
        self.parts.append(r'{\rtf1\ansi\deff0')
        self.parts.append(r'{\fonttbl{\f0\froman\fcharset0 Times New Roman;}{\f1\fswiss\fcharset0 Arial;}}')
        self.parts.append(r'{\colortbl;\red0\green0\blue0;\red70\green130\blue180;\red100\green100\blue100;}')
        self.parts.append(r'\widowctrl\hyphauto')
        self.parts.append(r'\margl1440\margr1440\margt1440\margb1440')

    def heading1(self, text):
        self.parts.append(r'{\pard\sb240\sa120\b\f1\fs32 ' + esc(text) + r'\par}')

    def heading2(self, text):
        self.parts.append(r'{\pard\sb200\sa80\b\f1\fs28 ' + esc(text) + r'\par}')

    def heading3(self, text):
        self.parts.append(r'{\pard\sb160\sa60\b\f1\fs24 ' + esc(text) + r'\par}')

    def para(self, text):
        if text.strip():
            self.parts.append(r'{\pard\sa120\f0\fs22 ' + esc(text) + r'\par}')

    def bullet(self, text):
        if text.strip():
            self.parts.append(r'{\pard\li360\fi-180\sa80\f0\fs22 \bullet  ' + esc(text) + r'\par}')

    def step(self, num, text):
        if text.strip():
            self.parts.append(r'{\pard\li360\fi-180\sa80\f0\fs22 \b ' + esc(str(num) + '.') + r'\b0   ' + esc(text) + r'\par}')

    def callout(self, title, text):
        if title:
            self.parts.append(r'{\pard\sb80\sa40\li360\ri360\b\f1\fs22 ' + esc(title) + r'\b0\par}')
        if text.strip():
            self.parts.append(r'{\pard\sa80\li360\ri360\f0\fs22\cf3 ' + esc(text) + r'\par}')

    def page_break(self):
        self.parts.append(r'{\pard\pagebb\par}')

    def build(self):
        self.parts.append('}')
        return '\n'.join(self.parts)


def get_text(element_html):
    """Get text from HTML, preserving inline structure."""
    # Replace <br> with space
    element_html = re.sub(r'<br\s*/?>', ' ', element_html)
    # Replace <strong> bold inline - keep text
    element_html = re.sub(r'<strong>(.*?)</strong>', r'\1', element_html, flags=re.DOTALL)
    element_html = re.sub(r'<em>(.*?)</em>', r'\1', element_html, flags=re.DOTALL)
    element_html = re.sub(r'<kbd>(.*?)</kbd>', r'\1', element_html, flags=re.DOTALL)
    element_html = re.sub(r'<a[^>]*>(.*?)</a>', r'\1', element_html, flags=re.DOTALL)
    return strip_html(element_html)


def process_page(b, html, title_override=None):
    """Process one HTML page, adding its content to the RTFBuilder."""
    # Extract content div
    m = re.search(r'<div class="content">(.*)</div>\s*</div>\s*</body>', html, re.DOTALL)
    if not m:
        m = re.search(r'<div class="content">(.*?)</div>\s*(?:</div>\s*)?</body>', html, re.DOTALL)
    if m:
        content = m.group(1)
    else:
        content = html

    # Remove chapter-nav
    content = re.sub(r'<div class="chapter-nav">.*?</div>\s*</div>', '', content, flags=re.DOTALL)
    content = re.sub(r'<div class="chapter-nav">.*?</div>', '', content, flags=re.DOTALL)

    # Process page-hero
    hero = re.search(r'<div class="page-hero">(.*?)</div>', content, re.DOTALL)
    if hero:
        hero_html = hero.group(1)
        eyebrow = re.search(r'<div class="page-hero-eyebrow">(.*?)</div>', hero_html)
        h1 = re.search(r'<h1>(.*?)</h1>', hero_html, re.DOTALL)
        sub = re.search(r'<p>(.*?)</p>', hero_html, re.DOTALL)
        if eyebrow:
            b.para(get_text(eyebrow.group(1)))
        if h1:
            b.heading1(get_text(h1.group(1)))
        if sub:
            b.para(get_text(sub.group(1)))
        content = content.replace(hero.group(0), '')

    # Remove img and img-caption elements
    content = re.sub(r'<img[^>]*>', '', content)
    content = re.sub(r'<div class="img-caption">.*?</div>', '', content, flags=re.DOTALL)

    # Now parse remaining structure sequentially using a simple state machine
    # We'll process tags in order
    pos = 0
    length = len(content)

    # Tokenize into a list of (type, data)
    tokens = []
    # Find all block-level elements
    tag_pattern = re.compile(
        r'<(h2|h3|p|ul|div|ol)\b([^>]*)>(.*?)</\1>',
        re.DOTALL
    )

    def process_ul(ul_html):
        items = re.findall(r'<li[^>]*>(.*?)</li>', ul_html, re.DOTALL)
        for item in items:
            b.bullet(get_text(item))

    def process_steps_div(div_html):
        steps = re.findall(r'<div class="step">(.*?)</div>\s*</div>', div_html, re.DOTALL)
        for i, step_html in enumerate(steps, 1):
            num_m = re.search(r'<div class="step-num">(\d+)</div>', step_html)
            body_m = re.search(r'<div class="step-body">(.*?)</div>', step_html, re.DOTALL)
            num = int(num_m.group(1)) if num_m else i
            if body_m:
                body_html = body_m.group(1)
                # May contain multiple <p> and <ul>
                paras = re.findall(r'<p>(.*?)</p>', body_html, re.DOTALL)
                uls = re.findall(r'<ul[^>]*>(.*?)</ul>', body_html, re.DOTALL)
                step_text = ' '.join(get_text(p) for p in paras)
                b.step(num, step_text)
                for ul_html in uls:
                    items = re.findall(r'<li[^>]*>(.*?)</li>', ul_html, re.DOTALL)
                    for item in items:
                        b.bullet('  ' + get_text(item))

    def process_callout(div_html):
        title_m = re.search(r'<div class="callout-title">(.*?)</div>', div_html, re.DOTALL)
        paras = re.findall(r'<p>(.*?)</p>', div_html, re.DOTALL)
        title = get_text(title_m.group(1)) if title_m else ''
        text = ' '.join(get_text(p) for p in paras)
        b.callout(title, text)

    def process_faq_item(div_html):
        q_m = re.search(r'<div class="faq-q">(.*?)<span', div_html, re.DOTALL)
        a_m = re.search(r'<div class="faq-a">(.*?)</div>', div_html, re.DOTALL)
        if q_m:
            b.heading3(get_text(q_m.group(1)))
        if a_m:
            a_html = a_m.group(1)
            paras = re.findall(r'<p>(.*?)</p>', a_html, re.DOTALL)
            for p in paras:
                b.para(get_text(p))
            uls = re.findall(r'<ul[^>]*>(.*?)</ul>', a_html, re.DOTALL)
            for ul in uls:
                items = re.findall(r'<li[^>]*>(.*?)</li>', ul, re.DOTALL)
                for item in items:
                    b.bullet(get_text(item))
            steps_div = re.search(r'<div class="steps">(.*?)</div>\s*</div>', a_html, re.DOTALL)
            if steps_div:
                process_steps_div(steps_div.group(0))

    def process_glossary_card(card_html):
        term_m = re.search(r'<div class="glossary-term">(.*?)</div>', card_html, re.DOTALL)
        def_m = re.search(r'<div class="glossary-def">(.*?)</div>', card_html, re.DOTALL)
        if term_m:
            b.heading3(get_text(term_m.group(1)))
        if def_m:
            b.para(get_text(def_m.group(1)))

    # Process content block by block using a recursive descent approach
    def process_block(html_chunk):
        """Process html_chunk, emit RTF for recognized structures."""
        html_chunk = html_chunk.strip()
        if not html_chunk:
            return

        # h2
        for m in re.finditer(r'<h2[^>]*>(.*?)</h2>', html_chunk, re.DOTALL):
            pass  # will handle below

        # Process sequentially
        i = 0
        while i < len(html_chunk):
            # Skip whitespace
            if html_chunk[i:i+1].isspace():
                i += 1
                continue

            # Try to match a tag
            tag_m = re.match(r'<(\w+)([^>]*)>', html_chunk[i:])
            if not tag_m:
                i += 1
                continue

            tag_name = tag_m.group(1).lower()
            tag_attrs = tag_m.group(2)

            # Find closing tag
            close_pattern = re.compile(r'</' + re.escape(tag_name) + r'\s*>', re.IGNORECASE)
            # Find matching close (handle nesting)
            depth = 1
            search_start = i + len(tag_m.group(0))
            j = search_start
            open_pattern = re.compile(r'<' + re.escape(tag_name) + r'[\s>]', re.IGNORECASE)
            while depth > 0 and j < len(html_chunk):
                open_m = open_pattern.search(html_chunk, j)
                close_m = close_pattern.search(html_chunk, j)
                if close_m is None:
                    j = len(html_chunk)
                    break
                if open_m and open_m.start() < close_m.start():
                    depth += 1
                    j = open_m.end()
                else:
                    depth -= 1
                    if depth == 0:
                        j = close_m.end()
                    else:
                        j = close_m.end()

            inner = html_chunk[search_start:j - len('</' + tag_name + '>') - (len(tag_name) - len(tag_name))]
            # Recalculate inner properly
            close_m2 = close_pattern.search(html_chunk, i + len(tag_m.group(0)))
            if close_m2:
                end_pos = close_m2.end()
                inner = html_chunk[i + len(tag_m.group(0)):close_m2.start()]
            else:
                end_pos = len(html_chunk)
                inner = html_chunk[i + len(tag_m.group(0)):]

            if tag_name == 'h2':
                b.heading2(get_text(inner))
            elif tag_name == 'h3':
                b.heading3(get_text(inner))
            elif tag_name == 'p':
                text = get_text(inner)
                if text:
                    b.para(text)
            elif tag_name == 'ul':
                process_ul(inner)
            elif tag_name == 'div':
                cls = re.search(r'class="([^"]*)"', tag_attrs)
                cls = cls.group(1) if cls else ''
                if 'steps' in cls:
                    process_steps_div('<div' + tag_attrs + '>' + inner + '</div>')
                elif 'callout' in cls:
                    process_callout(inner)
                elif 'faq-item' in cls:
                    process_faq_item(inner)
                elif 'glossary-card' in cls:
                    process_glossary_card(inner)
                elif 'glossary-list' in cls:
                    process_block(inner)
                else:
                    process_block(inner)

            i = end_pos if close_m2 else len(html_chunk)

    process_block(content)


# Build RTF
b = RTFBuilder()

# Title page
b.parts.append(r'{\pard\qc\sb480\sa120\b\f1\fs48 Discord for Beginners\b0\par}')
b.parts.append(r'{\pard\qc\sa80\f1\fs28 A Complete, Web-Based Step-by-Step Guide for Adults New to Discord\par}')
b.parts.append(r'{\pard\qc\sa80\f0\fs22\par}')
b.parts.append(r'{\pard\qc\sa40\f0\fs22 \b Author:\b0  Ric Rebull\par}')
b.parts.append(r'{\pard\qc\sa40\f0\fs22 \b Instructor:\b0  Prof. Kugelmann\par}')
b.parts.append(r'{\pard\qc\sa40\f0\fs22 \b Date:\b0  April 23, 2026\par}')
b.parts.append(r'{\pard\qc\sa40\f0\fs22 ENC 4265 \u183? Technical Writing \u183? UCF\par}')
b.page_break()

pages = [
    ('D:/Downloads/discord-tutorial/index.html', None),
    ('D:/Downloads/discord-tutorial/ch1.html', None),
    ('D:/Downloads/discord-tutorial/ch2.html', None),
    ('D:/Downloads/discord-tutorial/ch3.html', None),
    ('D:/Downloads/discord-tutorial/ch4.html', None),
    ('D:/Downloads/discord-tutorial/ch5.html', None),
    ('D:/Downloads/discord-tutorial/ch6.html', None),
    ('D:/Downloads/discord-tutorial/ch7.html', None),
    ('D:/Downloads/discord-tutorial/conclusion.html', None),
    ('D:/Downloads/discord-tutorial/faq.html', None),
    ('D:/Downloads/discord-tutorial/glossary.html', None),
]

for path, title in pages:
    with open(path, encoding='utf-8') as f:
        html = f.read()
    process_page(b, html, title)
    b.page_break()

rtf_content = b.build()

with open('D:/Downloads/discord-tutorial/discord_tutorial.rtf', 'w', encoding='ascii', errors='replace') as f:
    f.write(rtf_content)

print("Done! Saved to discord_tutorial.rtf")
