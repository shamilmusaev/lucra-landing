# Lucra — Landing Page

Marketing landing page for [lucra.se](https://lucra.se) — an AI-powered personal finance platform for the Swedish market.

Built with Astro 6 as a fully static site. Swedish (`/`) and English (`/en/`) routes are generated from shared component templates and separate i18n string files.

## Stack

- **Framework:** Astro 6 (`output: static`)
- **Styling:** Scoped CSS per component + shared design tokens (`src/styles/colors_and_type.css`)
- **Fonts:** General Sans (woff2), Plus Jakarta Sans variable (ttf) — self-hosted
- **WebGL orb:** `ogl` (bundled and tree-shaken by Astro)
- **Smooth scroll:** Lenis (`@studio-freight/lenis`)
- **Sitemap:** `@astrojs/sitemap` (auto-generated on build)

## Structure

```
src/
├── components/
│   ├── sections/       # One file per page section (Problem, Hero, Nav, …)
│   ├── HeroParticles.astro
│   ├── OrbIsland.astro
│   ├── SmoothScroll.astro
│   └── RevealScript.astro
├── i18n/
│   ├── sv.ts           # Swedish strings (default)
│   ├── en.ts           # English strings
│   └── utils.ts
├── layouts/
│   └── BaseLayout.astro  # SEO head, hreflang, canonical
├── pages/
│   ├── index.astro       # / (Swedish)
│   └── en/index.astro    # /en/ (English)
├── scripts/
│   └── orb.ts            # WebGL orb (OGL)
└── styles/
    ├── colors_and_type.css  # Design tokens — source of truth
    └── global.css
public/
├── assets/              # SVG icons, premium PNGs
└── fonts/               # Self-hosted woff2/ttf
```

## Commands

```bash
npm install          # Install dependencies (Node >=22.12 required)
npm run dev          # Dev server at http://localhost:4321
npm run build        # Build to ./dist/
npm run preview      # Preview built site locally
npx astro check      # TypeScript + Astro type check
```

## i18n

To add or update copy, edit `src/i18n/sv.ts` (Swedish) or `src/i18n/en.ts` (English). Both files export a typed object — TypeScript will flag any missing keys.

## Design tokens

All colors, typography, and font declarations live in `src/styles/colors_and_type.css`. The same file is the source of truth for the main `lucra-frontend` app (`src/theme/theme.ts`). Do not hardcode hex values — use `var(--token-name)`.
