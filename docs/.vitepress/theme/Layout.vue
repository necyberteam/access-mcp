<template>
  <div class="access-ci-layout">
    <!-- ACCESS-CI UI Components -->
    <div id="universal-menus"></div>
    <div id="header"></div>
    <div id="site-menus"></div>
    
    <!-- Main Content -->
    <div id="main">
      <Layout />
    </div>
    
    <!-- ACCESS-CI Footer -->
    <div id="footer-menus"></div>
    <div id="footer"></div>
    <div id="qa-bot"></div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme

let accessCIInitialized = false

function initializeAccessCI() {
  if (accessCIInitialized) return
  
  // Create script element for ACCESS-CI UI
  const script = document.createElement('script')
  script.type = 'module'
  const scriptContent = [
    'import {',
    '  footer,',
    '  footerMenus,',
    '  header,',
    '  siteMenus,',
    '  universalMenus,',
    '} from "https://esm.sh/@access-ci/ui@0.8.0";',
    '',
    'const siteItems = [',

  '  {',
    '    name: "Guide",',
    '    items: [',
    '      { name: "Home", href: "/" },',
    '      { name: "Getting Started", href: "/getting-started" },',
    '    ],',
    '  },',
    '  {',
    '    name: "Servers",',
    '    items: [',
    '      { name: "Overview", href: "/servers/" },',
    '      { name: "Affinity Groups", href: "/servers/affinity-groups" },',
    '      { name: "Compute Resources", href: "/servers/compute-resources" },',
    '      { name: "System Status", href: "/servers/system-status" },',
    '      { name: "Software Discovery", href: "/servers/software-discovery" },',
    '    ],',
    '  },',
    '  {',
    '    name: "GitHub",',
    '    href: "https://github.com/necyberteam/access-mcp",',
    '  },',
    '];',
    '',
    '// Initialize components',
    'universalMenus({',
    '  loginUrl: "/login",',
    '  logoutUrl: "/logout",',
    '  siteName: "Support",',
    '  target: document.getElementById("universal-menus"),',
    '});',
    '',
    'header({',
    '  siteName: "Support",',
    '  target: document.getElementById("header"),',
    '});',
    '',
    'siteMenus({',
    '  items: siteItems,',
    '  siteName: "Support",',
    '  target: document.getElementById("site-menus"),',
    '});',
    '',
    'footerMenus({',
    '  items: siteItems,',
    '  siteName: "Support",',
    '  target: document.getElementById("footer-menus"),',
    '});',
    '',
    'footer({',
    '  target: document.getElementById("footer")',
    '});',
    '',
    '// ACCESS-CI UI components initialized'
  ];
  
  script.innerHTML = scriptContent.join('\n');
  
  // Add error handling
  script.onerror = (error) => {
    console.error('ACCESS-CI UI script failed to load:', error);
  };
  
  document.head.appendChild(script)
  accessCIInitialized = true
  
  console.log('ACCESS-CI UI script injected');
}

onMounted(() => {
  initializeAccessCI()
})
</script>

<style>
/* ACCESS-CI Design System Variables */
:root {
  /* Colors - from ACCESS-CI */
  --access-ci-contrast: #232323;
  --access-ci-contrast-2: #3f3f3f;
  --access-ci-contrast-3: #707070;
  --access-ci-base-2: #f2f2f2;
  --access-ci-base-3: #ffffff;
  --access-ci-accent: #232323; /* Links use same color as text */
  --access-ci-teal-light: #48c0b9; /* Light teal */
  --access-ci-teal-medium: #008597; /* Medium teal */
  --access-ci-teal-dark: #1a5b6e; /* Dark teal for hover */
  
  /* Typography */
  --access-ci-font-small: 13px;
  --access-ci-font-medium: 20px;
  --access-ci-font-large: 36px;
  --access-ci-font-xlarge: 42px;
  
  /* Spacing */
  --access-ci-spacing-xs: 0.44rem;
  --access-ci-spacing-sm: 0.88rem;
  --access-ci-spacing-md: 1.32rem;
  --access-ci-spacing-lg: 2rem;
  --access-ci-spacing-xl: 3rem;
  --access-ci-spacing-2xl: 5.06rem;
  
  /* Override VitePress variables */
  --vp-c-brand-1: #232323;
  --vp-c-brand-2: #3f3f3f;
  --vp-c-brand-3: #707070;
  --vp-c-text-1: #232323;
  --vp-c-text-2: #3f3f3f;
  --vp-c-text-3: #707070;
}

/* Base layout */
.access-ci-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'Archivo', sans-serif;
  line-height: 1.6;
  color: var(--access-ci-contrast);
  background-color: var(--access-ci-base-3);
}

/* Force font family on all elements */
.access-ci-layout * {
  font-family: 'Archivo', sans-serif !important;
}

#main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--access-ci-spacing-lg) var(--access-ci-spacing-md);
  padding-top: var(--access-ci-spacing-md);
}

/* Hide VitePress defaults that conflict */
:deep(.VPNav),
:deep(.VPSidebar),
:deep(.VPDocFooter) {
  display: none !important;
}

/* Adjust VitePress content to match ACCESS-CI styles */
:deep(.VPContent) {
  padding: 0 !important;
}

:deep(.VPDoc) {
  padding: 0 !important;
}

/* Typography styles matching ACCESS-CI */
.access-ci-layout :deep(.vp-doc h1) {
  font-size: var(--access-ci-font-large) !important;
  font-weight: 700 !important;
  color: var(--access-ci-contrast) !important;
  margin: var(--access-ci-spacing-xl) 0 var(--access-ci-spacing-lg) 0 !important;
  line-height: 1.2 !important;
}

.access-ci-layout :deep(.vp-doc h1:first-child) {
  margin-top: 0 !important;
}

.access-ci-layout :deep(.vp-doc h2) {
  font-size: var(--access-ci-font-medium) !important;
  font-weight: 600 !important;
  color: var(--access-ci-contrast) !important;
  margin: var(--access-ci-spacing-lg) 0 var(--access-ci-spacing-md) 0 !important;
  line-height: 1.3 !important;
}

.access-ci-layout :deep(.vp-doc h3) {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: var(--access-ci-contrast) !important;
  margin: var(--access-ci-spacing-md) 0 var(--access-ci-spacing-sm) 0 !important;
}

.access-ci-layout :deep(.vp-doc p) {
  margin: var(--access-ci-spacing-sm) 0 !important;
  color: var(--access-ci-contrast-2) !important;
  line-height: 1.7 !important;
  font-weight: 400 !important;
  font-size: 16px !important;
}

.access-ci-layout :deep(.vp-doc ul),
.access-ci-layout :deep(.vp-doc ol) {
  margin: var(--access-ci-spacing-sm) 0 !important;
  padding-left: var(--access-ci-spacing-lg) !important;
}

.access-ci-layout :deep(.vp-doc li) {
  margin: var(--access-ci-spacing-xs) 0 !important;
  color: var(--access-ci-contrast-2) !important;
}

/* Link styles matching ACCESS-CI */
.access-ci-layout a {
  color: var(--access-ci-accent) !important;
  text-decoration: underline !important;
  font-weight: 800 !important;
  text-underline-offset: 2px !important;
  transition: color 0.3s ease !important;
  font-family: 'Archivo', sans-serif !important;
}

.access-ci-layout a:hover {
  color: var(--access-ci-teal-dark) !important;
}

/* Remove external link icons */
.access-ci-layout :deep(.vp-doc a[href*="://"]::after),
.access-ci-layout :deep(.vp-doc a[target="_blank"]::after),
.access-ci-layout :deep(.vp-external-link-icon::after) {
  display: none !important;
}

/* Code blocks */
.access-ci-layout :deep(.vp-doc pre),
.access-ci-layout :deep(.vp-code) {
  background-color: var(--access-ci-base-2) !important;
  border: 1px solid #ddd !important;
  border-radius: 4px !important;
  padding: var(--access-ci-spacing-md) !important;
  margin: var(--access-ci-spacing-md) 0 !important;
  overflow-x: auto !important;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
}

.access-ci-layout :deep(.vp-doc code),
.access-ci-layout :deep(.shiki code) {
  background-color: var(--access-ci-base-2) !important;
  padding: 2px 6px !important;
  border-radius: 3px !important;
  font-size: 0.9em !important;
  color: var(--access-ci-contrast) !important;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
}

.access-ci-layout :deep(.vp-doc pre code),
.access-ci-layout :deep(.shiki pre code) {
  background-color: transparent !important;
  padding: 0 !important;
  color: var(--access-ci-contrast) !important;
}

/* Code block styling with ACCESS-CI theme */
.access-ci-layout :deep(.shiki) {
  background-color: var(--access-ci-base-2) !important;
}

/* Tables */
:deep(.vp-doc table) {
  border-collapse: collapse;
  width: 100%;
  margin: var(--access-ci-spacing-md) 0;
}

:deep(.vp-doc th),
:deep(.vp-doc td) {
  border: 1px solid #ddd;
  padding: var(--access-ci-spacing-sm);
  text-align: left;
}

:deep(.vp-doc th) {
  background-color: var(--access-ci-base-2);
  font-weight: 600;
  color: var(--access-ci-contrast);
}

/* Blockquotes */
:deep(.vp-doc blockquote) {
  border-left: 4px solid var(--access-ci-teal-400);
  padding-left: var(--access-ci-spacing-md);
  margin: var(--access-ci-spacing-md) 0;
  color: var(--access-ci-contrast-3);
  font-style: italic;
}

/* Button Styles - ACCESS-CI Design System */
:deep(.vp-doc .button),
:deep(.vp-doc button),
:deep(.vp-doc .btn) {
  display: inline-block;
  color: #ffffff;
  background-color: #55555e;
  border: none;
  border-radius: 9999px;
  padding: calc(0.667em + 2px) calc(1.333em + 2px);
  font-size: 1.125em;
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.1s ease;
  margin: var(--access-ci-spacing-xs) var(--access-ci-spacing-xs) var(--access-ci-spacing-xs) 0;
}

:deep(.vp-doc .button:hover),
:deep(.vp-doc button:hover),
:deep(.vp-doc .btn:hover) {
  background-color: #3f4047;
  text-decoration: none;
  transform: translateY(-1px);
}

:deep(.vp-doc .button:active),
:deep(.vp-doc button:active),
:deep(.vp-doc .btn:active) {
  transform: translateY(0);
}

/* Primary Button Variant */
:deep(.vp-doc .button-primary),
:deep(.vp-doc .btn-primary) {
  background-color: var(--access-ci-teal-600);
}

:deep(.vp-doc .button-primary:hover),
:deep(.vp-doc .btn-primary:hover) {
  background-color: var(--access-ci-teal-700);
}

/* Secondary Button Variant */
:deep(.vp-doc .button-secondary),
:deep(.vp-doc .btn-secondary) {
  background-color: transparent;
  color: var(--access-ci-teal-600);
  border: 2px solid var(--access-ci-teal-600);
}

:deep(.vp-doc .button-secondary:hover),
:deep(.vp-doc .btn-secondary:hover) {
  background-color: var(--access-ci-teal-600);
  color: #ffffff;
}

/* Enhanced Header Styles */
:deep(.vp-doc h1) {
  font-size: var(--access-ci-font-large);
  font-weight: 700;
  color: var(--access-ci-teal-700);
  margin: var(--access-ci-spacing-xl) 0 var(--access-ci-spacing-lg) 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

:deep(.vp-doc h1:first-child) {
  margin-top: 0;
}

:deep(.vp-doc h2) {
  font-size: var(--access-ci-font-medium);
  font-weight: 600;
  color: var(--access-ci-teal-600);
  margin: var(--access-ci-spacing-lg) 0 var(--access-ci-spacing-md) 0;
  line-height: 1.3;
  letter-spacing: -0.01em;
  padding-top: var(--access-ci-spacing-xs);
  padding-bottom: var(--access-ci-spacing-xs);
}

:deep(.vp-doc h3) {
  font-size: 18px;
  font-weight: 600;
  color: var(--access-ci-contrast);
  margin: var(--access-ci-spacing-md) 0 var(--access-ci-spacing-sm) 0;
  line-height: 1.4;
}

:deep(.vp-doc h4) {
  font-size: 16px;
  font-weight: 600;
  color: var(--access-ci-contrast-2);
  margin: var(--access-ci-spacing-sm) 0 var(--access-ci-spacing-xs) 0;
  line-height: 1.4;
}

:deep(.vp-doc h5) {
  font-size: 14px;
  font-weight: 600;
  color: var(--access-ci-contrast-2);
  margin: var(--access-ci-spacing-sm) 0 var(--access-ci-spacing-xs) 0;
  line-height: 1.4;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:deep(.vp-doc h6) {
  font-size: 13px;
  font-weight: 600;
  color: var(--access-ci-contrast-3);
  margin: var(--access-ci-spacing-sm) 0 var(--access-ci-spacing-xs) 0;
  line-height: 1.4;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Header Hover Effects */
:deep(.vp-doc h1:hover),
:deep(.vp-doc h2:hover),
:deep(.vp-doc h3:hover) {
  color: var(--access-ci-teal-400);
  transition: color 0.2s ease;
}

/* Special Header Backgrounds */
:deep(.vp-doc h2.has-background) {
  padding: var(--access-ci-spacing-sm) var(--access-ci-spacing-md);
  background-color: var(--access-ci-base-2);
  border-radius: 4px;
}

/* Responsive */
@media (max-width: 768px) {
  #main {
    padding: var(--access-ci-spacing-md) var(--access-ci-spacing-sm);
  }
  
  :deep(.vp-doc h1) {
    font-size: 28px;
  }
  
  :deep(.vp-doc h2) {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  #main {
    padding: var(--access-ci-spacing-sm);
  }
  
  :deep(.vp-doc h1) {
    font-size: 24px;
  }
}
</style>