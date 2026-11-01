# Decision Ticket: Brand Integration & Visual Polish for Session 1

**Parent**: [Wayfinder Map](../MAP.md)  
**Ticket ID**: `001-session-1-branding`  
**Type**: `wayfinder:task`  
**Status**: Closed  
**Assignee**: Antigravity  

---

## Question

How should the *Future Solutions* corporate logo and background template be integrated into Session 1 presentation slides (`ai-session-1-slides-ar.html`) so that:
1. The images are razor-sharp (crisp) across high-DPI retina displays, 4K projectors, and PDF exports.
2. The background and logo do not obstruct any cards, steps, text, or interactive elements across all 37 slides.
3. The instructor name is correctly set to `عبدالرحمن عيسى` and date to `جمادى الأولى 1448`.

---

## Resolution

1. **Logo De-matting & Vectorization**:
   - The user-provided assets contained JPEG compression noise and grey device-screenshot borders.
   - We extracted clean RGBA alpha masks, eliminated edge halos, and generated 2x/3x retina-ready transparent PNGs (`logo-transparent.png`, `logo-white-transparent.png`) and vector SVGs (`logo.svg`, `logo-white.svg`).
   - Cleaned `logo.jpg` with 98% quality on pure white background as a drop-in replacement.
2. **Widescreen 16:9 Background Template**:
   - Transformed `background.jpg` from a square 1080x1077 image into a pristine 1920x1080 widescreen 16:9 canvas.
   - Preserved the top and bottom geometric brand chevrons.
   - Lightened the central brand watermark to 4% opacity so it frames slides without obstructing cards or text.
   - Integrated smoothly with dark and teal slides using semi-transparent gradient overlays (`rgba(24,34,74,0.92)` / `rgba(10,118,111,0.92)`).
3. **Tasteful Logo Positioning**:
   - Positioned `.slide-brand` at `left: 4.5rem; top: 2.2rem;` on content slides, naturally balancing the Arabic title on the right.
   - Added defensive `padding-inline-end: 14rem;` to slide headers to prevent title overlap.
   - On dark and teal slides, applied CSS `filter: brightness(0) invert(1)` to render the logo in crisp white.
   - On the cover slide, integrated the brand logo above the course tag, with instructor `عبدالرحمن عيسى` and date `جمادى الأولى 1448`.
4. **Exported Fresh PDF**:
   - Rendered a fresh 37-page 16:9 presentation PDF using Playwright at `materials/session_1/ai-session-1-slides-ar.pdf`.
