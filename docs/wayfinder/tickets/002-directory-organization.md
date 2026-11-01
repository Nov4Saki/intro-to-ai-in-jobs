# Decision Ticket: Project Directory Organization

**Parent**: [Wayfinder Map](../MAP.md)  
**Ticket ID**: `002-directory-organization`  
**Type**: `wayfinder:task`  
**Status**: Closed  
**Assignee**: Antigravity  

---

## Question

How should the project repository be structured to maintain a clean separation of concerns between:
1. Static Next.js interactive student stations.
2. Presentation slide decks (HTML and PDF).
3. Corporate assets and branding templates.
4. Trainer-only source materials.

---

## Resolution

1. **Asset Architecture**:
   - `assets/formal templates/`: Contains master high-resolution corporate branding files (`background.jpg`, `logo.jpg`, transparent PNGs, and SVGs). Preserved exact user paths for direct backward compatibility.
   - `public/assets/formal-templates/`: Synced mirror for Next.js web application and GitHub Pages deployments.
   - `sessions/session_1/assets/`: Synced mirror for standalone offline viewing of `ai-session-1-slides-ar.html`.
2. **Materials Standardization**:
   - Renamed unformatted browser download `ai-session-1-slides-ar-edited (2).pdf` to standardized `ai-session-1-slides-ar.pdf` in `materials/session_1/`.
   - Excluded `materials/` from public repository git tracking via `.gitignore` to protect trainer answer keys.
3. **Strict YAGNI Compliance**:
   - Avoided speculative creation of empty folders for Sessions 2-5, keeping the codebase lean and free of bloat until those sessions are actively developed.
