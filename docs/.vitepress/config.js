import { defineConfig } from "vitepress";

export default defineConfig({
  title: "ACCESS-CI MCP Servers",
  description: "Model Context Protocol servers for ACCESS-CI APIs",

  base: "/",

  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap",
      },
    ],
  ],

  // Since we're using ACCESS-CI UI for navigation, we disable all VitePress navigation
  themeConfig: {
    // Disable all VitePress navigation components
    nav: false,
    sidebar: false,
    aside: false,

    // Keep search functionality if needed
    search: {
      provider: "local",
    }
  },

  // Enable SPA mode for better integration with ACCESS-CI UI
  appearance: false,

  // Markdown configuration
  markdown: {
    theme: {
      light: {
        name: "access-ci-light",
        type: "light",
        colors: {
          "editor.background": "#ffffff",
          "editor.foreground": "#232323",
        },
        tokenColors: [
          {
            scope: ["string", "string.quoted"],
            settings: {
              foreground: "#008597", // Medium teal for strings
            },
          },
          {
            scope: [
              "entity.name.tag",
              "support.type.property-name",
              "meta.object-literal.key",
            ],
            settings: {
              foreground: "#1a5b6e", // Dark teal for properties
            },
          },
          {
            scope: ["keyword", "storage.type", "storage.modifier"],
            settings: {
              foreground: "#48c0b9", // Light teal for keywords
              fontStyle: "bold",
            },
          },
          {
            scope: ["comment"],
            settings: {
              foreground: "#707070", // Gray for comments
            },
          },
          {
            scope: ["punctuation", "meta.brace"],
            settings: {
              foreground: "#232323", // Dark gray for punctuation
            },
          },
        ],
      },
      dark: "github-light",
    },
    lineNumbers: true,
  },
});
