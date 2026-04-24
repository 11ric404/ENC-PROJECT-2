// nav.js — injects the sidebar and mobile toggle into every page
// Usage: <script src="../nav.js"></script> or <script src="nav.js"></script>
// Set window.CURRENT_PAGE to the filename before including this script.

(function() {
  const pages = [
    { id: 'index',        href: 'index.html',        icon: '🏠', label: 'Introduction' },
    { id: 'ch1',          href: 'ch1.html',           icon: '1️⃣', label: 'Ch 1 · Creating Your Account',
      sections: ['Downloading Discord', 'Creating a New Account', 'Verifying Your Email', 'Setting Up Your Profile'] },
    { id: 'ch2',          href: 'ch2.html',           icon: '2️⃣', label: 'Ch 2 · Navigating the Interface',
      sections: ['Overview of the Main Layout', 'The User Controls Bar', 'The Search Bar', 'Navigating to the Home Screen'] },
    { id: 'ch3',          href: 'ch3.html',           icon: '3️⃣', label: 'Ch 3 · Joining a Server',
      sections: ['What Is a Server?', 'Joining via Invite Link', 'Finding a Public Server', 'Server Structure'] },
    { id: 'ch4',          href: 'ch4.html',           icon: '4️⃣', label: 'Ch 4 · Text Channels',
      sections: ['What Is a Text Channel?', 'Reading Messages', 'Sending a Message', 'Replying to a Specific Message', 'Editing and Deleting Your Messages', 'Adding Emoji Reactions', 'Uploading Files and Images', 'Using @Mentions'] },
    { id: 'ch5',          href: 'ch5.html',           icon: '5️⃣', label: 'Ch 5 · Direct Messages',
      sections: ['What Is a Direct Message?', 'Sending a DM to Another User', 'The DM Inbox', 'Creating a Group DM', 'DM Etiquette and Privacy'] },
    { id: 'ch6',          href: 'ch6.html',           icon: '6️⃣', label: 'Ch 6 · Voice Channels',
      sections: ['What Is a Voice Channel?', 'Joining a Voice Channel', 'Audio Controls in a Voice Channel', 'Sharing Your Screen', 'Leaving a Voice Channel'] },
    { id: 'ch7',          href: 'ch7.html',           icon: '7️⃣', label: 'Ch 7 · Notifications & Settings',
      sections: ['How Discord Notifications Work', 'Changing Server Notification Settings', 'Muting Individual Channels', 'Status Modes', 'Customizing Appearance', 'Privacy and Safety Settings'] },
    { id: 'conclusion',   href: 'conclusion.html',    icon: '🎓', label: 'Conclusion' },
    { id: 'faq',          href: 'faq.html',           icon: '❓', label: 'FAQ' },
    { id: 'glossary',     href: 'glossary.html',      icon: '📖', label: 'Glossary' },
  ];

  const current = window.CURRENT_PAGE || '';
  const currentIdx = pages.findIndex(p => p.id === current);
  const progressText = currentIdx >= 0 && currentIdx < 8 ? `Step ${currentIdx} of 7` : '';

  const renderNavItems = () => {
    return pages.map(p => {
      const isActive = current === p.id;
      const hasSections = p.sections && p.sections.length > 0;
      
      return `
      <div class="nav-item-container${isActive ? ' open active-page' : ''}" id="nav-container-${p.id}">
        <div class="nav-item-header">
          <a href="${p.href}" class="nav-item-link${isActive ? ' active' : ''}" data-label="${p.label.toLowerCase()}">
            <span class="nav-icon">${p.icon}</span>
            <span class="nav-label-text">${p.label}</span>
          </a>
          ${hasSections ? `
            <button class="nav-toggle-btn" aria-label="Toggle sections" onclick="this.parentElement.parentElement.classList.toggle('open')">
              <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
            </button>
          ` : ''}
        </div>
        ${hasSections ? `
          <div class="nav-sub-items">
            ${p.sections.map((s, i) => {
              const sectionId = 'section-' + i;
              const href = isActive ? `#${sectionId}` : `${p.href}#${sectionId}`;
              return `<a href="${href}" class="nav-sub-item">${s}</a>`;
            }).join('')}
          </div>
        ` : ''}
      </div>`;
    }).join('');
  };

  // Discord SVG logo (clean version)
  const discordSVG = `<svg viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>`;

  const sidebarHTML = `
  <nav class="sidebar" id="sidebar">
    <a href="index.html" class="sidebar-logo">
      <div class="sidebar-logo-icon">
        ${discordSVG}
      </div>
      <div class="sidebar-logo-text">Discord Tutorial<span>Beginner's Guide</span></div>
    </a>
    <div class="nav-section">
      <div class="nav-section-label">
        Navigation
        <span style="float:right; opacity:0.5; font-size:9px;">${progressText}</span>
      </div>
      <div style="padding: 0 12px 12px;">
        <input type="text" id="nav-search" placeholder="Quick search..." style="width:100%; background:var(--bg-primary); border:1px solid var(--border); border-radius:4px; padding:6px 10px; color:var(--text-primary); font-size:12px; outline:none;">
      </div>
      <div id="nav-items-container">
        ${renderNavItems()}
      </div>
    </div>
  </nav>
  <div class="scroll-progress"><div class="scroll-progress-bar" id="progress-bar"></div></div>
  <button class="mobile-nav-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
  <button id="scroll-to-top" style="position:fixed; bottom:80px; right:20px; width:40px; height:40px; border-radius:50%; background:var(--bg-elevated); border:1px solid var(--border); color:var(--text-primary); cursor:pointer; display:none; align-items:center; justify-content:center; z-index:100; font-size:18px;">↑</button>
  `;

  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  // Search functionality
  const searchInput = document.getElementById('nav-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.nav-item-container').forEach(container => {
        const label = container.querySelector('.nav-item-link').getAttribute('data-label');
        container.style.display = label.includes(q) ? 'block' : 'none';
      });
    });
  }

  // Scroll Progress logic
  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = scrolled + "%";

    const stt = document.getElementById('scroll-to-top');
    if (stt) stt.style.display = winScroll > 300 ? 'flex' : 'none';

    // Highlight active sub-section in ToC
    const content = document.querySelector('.content');
    if (content && currentIdx >= 0 && currentIdx < 8) {
      const headings = content.querySelectorAll('h2');
      let currentSectionId = '';
      headings.forEach((h, i) => {
        const top = h.getBoundingClientRect().top;
        if (top < 100) currentSectionId = 'section-' + i;
      });

      document.querySelectorAll('.nav-sub-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('href').endsWith('#' + currentSectionId));
      });
    }
  });

  document.getElementById('scroll-to-top').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Handle FAQ accordions - toggle open/close
  document.body.addEventListener('click', (e) => {
    const q = e.target.closest('.faq-q');
    if (q) {
      q.parentElement.classList.toggle('open');
    }
  });

  // Glossary Tooltips
  const glossaryMap = {
    'server': 'The primary space in Discord for communities. Each server has its own channels, members, and roles.',
    'channel': 'A dedicated room within a server for text or voice communication.',
    'direct message': 'A private message between you and up to 10 other users.',
    'role': 'A label assigned to members that determines their permissions and color in a server.',
    'mention': 'A way to notify a specific user by typing @ followed by their name.',
    'mute': 'Disabling your own microphone audio. You can still hear others.',
    'deafen': 'Muting all audio from other users and your own microphone simultaneously.',
    'voice channel': 'A room for real-time audio communication, always open, no scheduling needed.',
    'invite link': 'A URL that grants access to a specific Discord server.',
    'bot': 'An automated account that performs tasks like moderation or reminders.',
    'ping': 'An informal term for sending someone a notification or mention.'
  };

  document.querySelectorAll('a[href*="glossary.html#"]').forEach(link => {
    const term = link.textContent.toLowerCase().replace('@', '');
    if (glossaryMap[term]) {
      link.setAttribute('data-tooltip', glossaryMap[term]);
    }
  });

  // Assign IDs to headings for ToC links once DOM is ready
  function initHeadings() {
    const contentBody = document.querySelector('.content');
    if (contentBody && currentIdx >= 0 && currentIdx < 8) {
      const headings = contentBody.querySelectorAll('h2');
      headings.forEach((h, i) => {
        h.id = 'section-' + i;
      });

      // Jump to hash if present on load
      const hash = window.location.hash;
      if (hash) {
        const target = document.querySelector(hash);
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeadings);
  } else {
    initHeadings();
  }

  // Handle mobile toggle and cleanup
  document.querySelectorAll('.nav-item-link, .nav-sub-item').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      // If it's an anchor on the current page, we'll force a scroll just in case
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          history.pushState(null, null, href);
        }
      }
      document.getElementById('sidebar').classList.remove('open');
    });
  });
})();
