# Wayfinder Map: الذكاء الاصطناعي في العمل (5-Session Training Course)

**Canonical Issue / Label**: `wayfinder:map`  
**Tracker**: Local Markdown Tracker  
**Instructor**: عبدالرحمن عيسى  
**Date**: جمادى الأولى 1448  
**Organization**: شركة حلول المستقبل للتدريب (Future Solutions)

---

## Destination

Deliver a complete, polished 5-session corporate AI training curriculum for *Future Solutions*, comprising interactive Next.js activity stations, branded 16:9 widescreen HTML/PDF slide decks, and trainer guide materials with unified visual identity and zero content obstruction.

---

## Notes

- **Domain**: Corporate workplace training on Practical AI for office workers and managers.
- **Visual Identity**: Formal templates from Future Solutions (Coral `#db6b62`, Teal `#349689`, Ivory `#fbf8f2`, Navy `#18224a`).
- **Design Rule**: High-DPI crisp imagery, pure alpha transparency, no JPEG artifacts, zero content obstruction across all light and dark slides.
- **Architectural Reference**: Multi-route static Next.js activity hub (`docs/adr/0001-static-multi-route-activity-hub.md`).
- **Skills & Standing Preferences**: Adhere strictly to YAGNI/YANGI (zero speculative boilerplate), Arabic RTL typography standards (no em-dashes/en-dashes in curriculum text), and interactive station diversity (minimum 3 mixed mechanics per part).

---

## Decisions so far

- [Brand Integration & Visual Polish for Session 1](tickets/001-session-1-branding.md): Cleaned company logo into high-resolution transparent PNG and SVG, rendered crisp 16:9 widescreen formal background with subtle watermark framing, updated instructor to عبدالرحمن عيسى and date to جمادى الأولى 1448 across all 36 presentation slides (with mentor-only notes excluded), enlarged logo, and replaced 'موسيقى' with 'أناشيد'.
- [Project Directory Organization](tickets/002-directory-organization.md): Structured asset hierarchy into `assets/formal templates/` and `public/assets/formal-templates/`, standardized PDF names in `materials/session_1/`, and ensured backward compatibility for local file viewing and static web exports.
- [Session 2 Curriculum & Interactive Architecture](tickets/003-session-2-curriculum-design.md): Built 30-slide presentation deck `sessions/session_2/ai-session-2-slides-ar.html` and 30-page high-DPI PDF `materials/session_2/ai-session-2-slides-ar.pdf` with formal branding, enlarged logo, instructor عبدالرحمن عيسى, date جمادى الأولى 1448, and 6 multi-mechanic interactive stations in `src/content/session-2.ts`.
- [Multi-Session Hub & Dynamic Routing Integration](tickets/003-session-2-curriculum-design.md): Unified content registry in `src/content/index.ts`, upgraded `src/app/[slug]/page.tsx` to dynamically prerender all 14 activity routes across Sessions 1 and 2, and introduced client-side session switcher in `src/components/session-hub-view.tsx` with zero em-dashes and 100% static export coverage (18/18 pages).
- [Session 3 Curriculum Design & Workplace AI Tools](tickets/004-session-3-curriculum-design.md): (Active) Charting 30-slide presentation deck, high-DPI PDF, and multi-mechanic interactive stations focusing on office productivity copilots, spreadsheet automation, document summarization, and workflow safeguards.

---

## Not yet specified

- **Session 4 Practical Workflows & Prompt Engineering**: Advanced prompting patterns, multi-step chains, error handling, and human-in-the-loop review.
- **Session 5 Governance, Policy & Future Trends**: Corporate policies, data privacy/leakage safeguards, intellectual property, and ethical AI adoption.

---

## Out of scope

- Speculative creation of empty mock folders for future sessions before curriculum outlines are established (violates YAGNI).
- Direct hosting of proprietary answer keys in the public client bundle (retained strictly in trainer-only `materials/`).
