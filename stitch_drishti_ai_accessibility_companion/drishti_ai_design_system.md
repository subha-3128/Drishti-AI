---
name: "Drishti AI — Royal Ivory Design System"
description: "High-contrast, calm, accessibility-first mobile design system for Drishti AI (दृष्टि), built on Royal Ivory and its warm parchment shades in Light Mode, warm Royal Obsidian in Dark Mode, paired with Imperial Plum, Antique Gold, Royal Jade, and Crimson."
---

## Overview

Drishti AI (दृष्टि) is an on-device assistive mobility companion for blind and visually impaired users in India. Its interface is calm, trustworthy, distraction-free, and engineered for low-vision legibility and screen-reader clarity.

The visual language centers on **Royal Ivory and its tonal shades** (`#FFF8F3`, `#FFF1E3`, `#F9ECDE`, `#F3E6D8`, `#EEE0D2`) in **Light Mode** (the default), paired with **Royal Obsidian** (`#18120A`–`#3B342A`) and warm ivory ink (`#EEE0D2`) in **Dark Mode**, with a user-accessible Light/Dark theme toggle. **Imperial Plum** (`#250C36` / `#3B224C`) and **Antique Gold** (`#9D6E19` / `#F7BC62`) provide regal clarity, while **Royal Jade** (`#136A5B` / `#88D5C2`) communicates verified readiness and **Royal Crimson** (`#B42724` / `#FFB4AB`) signals critical errors.

## Colors

- **Royal Ivory Shades (`light.surface*`):** Warm alabaster (`#FFFFFF`), ivory (`#FFF8F3`), cream (`#FFF1E3`), champagne (`#F9ECDE`), and parchment (`#F3E6D8` / `#EEE0D2`) create subtle tonal hierarchy without visual clutter.
- **Royal Obsidian (`dark.surface*`):** Deep warm umber-obsidian (`#18120A`–`#3B342A`) with warm ivory text (`#EEE0D2`) for low-glare night or indoor use.
- **Imperial Plum (`primary`):** Regal high-contrast anchor for primary actions (`Start Assistance`, `Continue`, `Enable Camera`).
- **Antique Gold (`royal-gold` / `tertiary`):** Restrained royal accent for active focus rings, logo motif, and subtle borders.
- **Royal Jade (`secondary`):** Verified ready and active assistance states.
- **Royal Crimson (`error`):** Unmistakable system failures, permission denials, and Stop Assistance actions.

```yaml
colors:
  royal-ivory: "#FFF8F3"
  on-royal-ivory: "#211B12"
  royal-gold: "#9D6E19"
  on-royal-gold: "#060606"
  royal-gold-bright: "#F7BC62"
  on-royal-gold-bright: "#442C00"
  royal-jade: "#136A5B"
  on-royal-jade: "#FFFFFF"
  royal-crimson: "#B42724"
  on-royal-crimson: "#FFFFFF"
  light:
    primary: "#250C36"
    on-primary: "#FFFFFF"
    primary-container: "#3B224C"
    on-primary-container: "#F3DAFF"
    secondary: "#136A5B"
    on-secondary: "#FFFFFF"
    secondary-container: "#A1EFDB"
    on-secondary-container: "#00201A"
    tertiary: "#805600"
    on-tertiary: "#FFFFFF"
    tertiary-container: "#FFDDB0"
    on-tertiary-container: "#281800"
    error: "#B42724"
    on-error: "#FFFFFF"
    error-container: "#FFDAD6"
    on-error-container: "#910810"
    background: "#FFF8F3"
    on-background: "#211B12"
    surface: "#FFF8F3"
    surface-container-lowest: "#FFFFFF"
    surface-container-low: "#FFF1E3"
    surface-container: "#F9ECDE"
    surface-container-high: "#F3E6D8"
    surface-container-highest: "#EEE0D2"
    on-surface: "#211B12"
    on-surface-variant: "#4B454D"
    outline: "#7C757E"
    outline-variant: "#CDC3CE"
  dark:
    primary: "#DCBAEF"
    on-primary: "#3F2650"
    primary-container: "#3B224C"
    on-primary-container: "#F3DAFF"
    secondary: "#88D5C2"
    on-secondary: "#00382F"
    secondary-container: "#026354"
    on-secondary-container: "#B7FFEC"
    tertiary: "#F7BC62"
    on-tertiary: "#442C00"
    tertiary-container: "#614000"
    on-tertiary-container: "#FFDDB0"
    error: "#FFB4AB"
    on-error: "#690006"
    error-container: "#910810"
    on-error-container: "#FFDAD6"
    background: "#18120A"
    on-background: "#EEE0D2"
    surface: "#18120A"
    surface-container-lowest: "#130D06"
    surface-container-low: "#211B12"
    surface-container: "#251F16"
    surface-container-high: "#302920"
    surface-container-highest: "#3B342A"
    on-surface: "#EEE0D2"
    on-surface-variant: "#CDC3CE"
    outline: "#968E98"
    outline-variant: "#4B454D"
```

## Typography

**Red Hat Display** provides wide, unmistakable geometric letterforms for headings and primary actions. **Commissioner** serves all body copy, status rows, and controls with open counters and high legibility at large and scaled sizes. **Spline Sans Mono** is reserved for version numbers, model filenames (`mirage.cact`), and technical diagnostics.

Thin font weights (`< 400`) and tiny labels (`< 14px` for functional text) are forbidden. Every heading above `32px` defines a `-mobile` counterpart.

```yaml
typography:
  display-lg:
    fontFamily: "Red Hat Display"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 46px
    letterSpacing: -0.5px
  display-lg-mobile:
    fontFamily: "Red Hat Display"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 38px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: "Red Hat Display"
    fontSize: 34px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: -0.25px
  headline-lg-mobile:
    fontFamily: "Red Hat Display"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 34px
    letterSpacing: -0.2px
  headline-md:
    fontFamily: "Red Hat Display"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 30px
    letterSpacing: 0px
  title-lg:
    fontFamily: "Red Hat Display"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 26px
    letterSpacing: 0px
  title-md:
    fontFamily: "Commissioner"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  body-lg:
    fontFamily: "Commissioner"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 26px
    letterSpacing: 0px
  body-md:
    fontFamily: "Commissioner"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Commissioner"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0.1px
  label-md:
    fontFamily: "Commissioner"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0.15px
  mono-sm:
    fontFamily: "Spline Sans Mono"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
```

## Layout & Spacing

Mobile-first single-column **Fluid Grid** (`390px` base width) with generous `20px` page margins and `16px`–`24px` vertical rhythm on an `8px` base grid. Primary touch targets are at least `56px`–`64px` tall (`min-h-14` / `min-h-16`) so blind and low-vision users can activate them reliably outdoors.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  gutter-xl: 32px
  section: 40px
  page-margin: 20px
```

## Elevation & Depth

Hierarchy relies on **tonal ivory / obsidian surface steps** (`surface` → `surface-container-low` → `surface-container` → `surface-container-high`) and **crisp 1px–2px high-contrast borders** rather than drop shadows or glassmorphism. Backdrop blur is never used so text remains razor-sharp for low-vision users.

## Shapes

Generous, tactile rounding communicates approachability and clearly separates interactive buttons from informational cards. Primary action buttons use `16px`–`20px` corners or full pills; status chips use full pills.

```yaml
rounded:
  sm: 8px
  DEFAULT: 12px
  md: 16px
  lg: 20px
  xl: 28px
  full: 9999px
```

## Motion & Micro-interaction

Motion is calm, purposeful, and strictly honors `prefers-reduced-motion` and the in-app Reduced Motion toggle. No decorative looping animations or bouncing elements. Only `transform`, `opacity`, and color animate.

```yaml
motion:
  state-change:
    duration: 120ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 240ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 160ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
```

## Voice & Content Strategy

- **Tone:** Calm, direct, respectful, and safety-honest. Never overpromise ("guarantees safe crossing") and never use hype or AI buzzwords.
- **Capitalisation:** Sentence case for headings, labels, and alerts; Title Case only for product name (`Drishti AI`) and primary CTA (`Start Assistance`, `Stop Assistance`).
- **Terminology:** Always say `Cactus Mirage` (vision engine), `mirage.cact` (on-device model), `Assistance` (active mode), and `Spoken alerts` (audio output). Never mention YOLOX, ONNX, or cloud inference.
- **Status clarity:** Always pair an icon with a clear text status (`Ready`, `Available`, `Granted`, `Not granted`, `Required`, `Unavailable`).

## Components

The Component Kit provides reusable, self-contained HTML references under `components/`:

- `components/button.html`: `button-primary`, `button-primary-disabled`, `button-secondary`, `button-destructive`, `button-icon`, `button-with-icon`
- `components/card.html`: `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- `components/banner.html`: `banner-info`, `banner-error`, `banner-with-action`, `banner-dismissible`
- `components/toggle.html`: `toggle-standard`, `toggle-label`, `toggle-description`
- `components/tabs.html`: `tabs-horizontal`, `tabs-with-icon`
