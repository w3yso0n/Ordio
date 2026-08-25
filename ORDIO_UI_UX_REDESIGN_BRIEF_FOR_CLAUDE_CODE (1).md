# Ordio — Visual UI/UX Transformation Brief for Claude Code

> **Scope: VISUAL AND PRESENTATION LAYER ONLY.**
>
> This is not a feature project, backend project, architecture refactor, business-logic refactor, offline implementation, printer implementation, or data-model change.
>
> The goal is simple: **make Ordio look and feel exceptionally polished while preserving exactly what the product already does.**

---

# 0. VISUAL-ONLY CONTRACT — READ THIS FIRST

Before changing any code, inspect the existing application and understand the screens, components, routes, actions, and states that already exist.

Then redesign **only the presentation and user experience of those existing capabilities**.

## Allowed work

You may improve:

- Visual hierarchy.
- Layout and composition.
- Spacing and alignment.
- Typography.
- Color system.
- Icons.
- Borders, radii, surfaces, and subtle elevation.
- Buttons, inputs, cards, rows, tabs, sheets, dialogs, headers, navigation chrome, and other presentation components.
- Responsive/adaptive layout.
- Safe-area handling.
- Keyboard-aware presentation.
- Loading, empty, error, disabled, selected, pressed, success, warning, and informational **visual treatments for states that already exist**.
- Microcopy and labels when their meaning remains exactly the same.
- Motion and microinteractions that do not alter business behavior.
- Haptic feedback only where it is purely presentational and does not change control flow.
- Accessibility of the visual layer: contrast, touch targets, labels, focus, readable sizes.
- Reusable design tokens and presentational primitives.
- Visual consistency between screens.
- The perceived quality, clarity, speed, and confidence of the current user experience.

## Forbidden work

Do **not** change how Ordio works underneath the interface.

That means:

- Do not add, remove, or redesign product functionality.
- Do not change business logic, calculations, validations, state transitions, permissions, persistence, networking, authentication, payments, printing behavior, or synchronization behavior.
- Do not change data contracts, domain models, routes, or side effects.
- Do not use this redesign as an excuse for architecture or backend refactoring.
- Do not invent data, features, states, actions, or modules just to make the UI look richer.

Only redesign what the user **sees, reads, taps, and visually experiences**.

## Source of truth

The existing repository is the source of truth for behavior.

If the app currently does something in a specific sequence, preserve that sequence unless the change is purely presentational.

You may move, resize, regroup, restyle, relabel, or visually emphasize existing controls. You may not silently change what those controls do.

### Simple rule

> **Same application. Same capabilities. Same data. Same rules. Same behavior. Dramatically better interface.**

---

# 1. Product surfaces

Ordio has two interfaces that should feel like the same product without looking like copies of each other.

## Caja mobile — `apps/mobile`

The mobile application is a compact operational POS used on a phone.

Existing experiences include screens such as:

- Device activation / pairing.
- Cashier selection and PIN.
- Cash-session opening/closing.
- Product sale surface.
- Current ticket/cart.
- Payment selection.
- Payment/result feedback.
- Existing printer-related feedback.

Treat the app as **phone-first**.

It must feel exceptionally fast, direct, tactile, readable, and confident.

## Admin web — `apps/admin`

The admin is a desktop-oriented management interface.

Existing sections include:

- Login.
- Dashboard.
- Products.
- Users / cashiers.
- Sales.

The admin may be more information-dense than the mobile POS, but it should share the same visual DNA.

## Code scope

Focus implementation on the presentation code in `apps/mobile` and `apps/admin`. You may inspect the rest of the repository only to understand existing behavior. Treat non-UI code as read-only for this redesign.

---

# 2. Design objective

The redesign should make Ordio feel like a mature, premium commercial POS rather than an MVP, starter template, generic Expo app, or generic SaaS dashboard.

The target impression is:

- Fast.
- Precise.
- Calm.
- Premium.
- Modern.
- Tactile.
- Warm enough for a café environment.
- Professional enough to trust with money.
- Simple enough to learn immediately.

The interface should feel intentionally designed at every level:

- Page composition.
- Rhythm.
- Typography.
- Alignment.
- Component proportions.
- Empty space.
- States.
- Motion.
- Touch feedback.
- Numeric presentation.
- Iconography.

Do not make it merely “cleaner.” Make it feel like a coherent product with a recognizable design language.

---

# 3. Chosen visual direction

## Precision Utility with Tactile Warmth

Use this as the central aesthetic direction.

Imagine a combination of:

- High-quality café equipment.
- A precise physical cash register.
- Contemporary hospitality software.
- Matte industrial materials.
- Strong editorial typography.
- Warm, restrained brand character.

The interface should feel designed for repeated use rather than for a marketing screenshot.

### Visual qualities

Prefer:

- Warm neutral backgrounds instead of cold pure gray everywhere.
- High-contrast dark typography.
- One strong brand accent.
- Crisp separators.
- Clear surface hierarchy.
- Generous but controlled spacing.
- Carefully sized controls.
- Large, stable monetary totals.
- Subtle press feedback.
- Restrained rounded corners.
- Mostly flat surfaces with selective elevation.
- Strong alignment grids.
- Purposeful negative space.

Avoid:

- Glassmorphism.
- Excessive blur.
- Purple/blue AI gradients.
- Neon accents.
- Giant floating cards.
- Bento-dashboard styling on the POS.
- Decorative blobs.
- Oversized marketing headings.
- Generic Tailwind-dashboard aesthetics.
- Random shadows.
- Excessive pills.
- Excessive gradients.
- Visual gimmicks that reduce information density.

---

# 4. Design personality

Ordio should not look playful or childish, but it also should not look sterile.

Aim for:

**70% precision + 20% warmth + 10% personality.**

The personality should come from:

- Typography.
- Proportions.
- The brand accent.
- Product-tile treatment.
- The transaction-total area.
- Distinctive but restrained motion.
- Consistent visual rhythm.

Do not attempt to create personality by decorating every surface.

A user should recognize an Ordio screen even if the logo is hidden.

---

# 5. Visual hierarchy principles

Every screen should immediately answer:

1. Where am I?
2. What is the primary information here?
3. What is the primary action?
4. What has changed?
5. What requires my attention?

Use hierarchy through this order of preference:

1. Position.
2. Size.
3. Spacing.
4. Typography weight.
5. Surface contrast.
6. Color.
7. Iconography.
8. Motion.

Do not use color as the only hierarchy tool.

Do not put equal visual weight on every element.

The most important action on a screen should be visually unmistakable without making the rest of the interface loud.

---

# 6. Mobile POS — overall composition

The mobile POS is the visual priority of this redesign.

Treat portrait phone use as the default environment.

## Overall structure

Build a visually stable composition with clear zones:

```text
┌──────────────────────────────┐
│ compact operational header   │
│                              │
│ search / useful controls     │
│                              │
│ product/catalog content      │
│                              │
│                              │
├──────────────────────────────┤
│ transaction summary          │
│ primary checkout action      │
└──────────────────────────────┘
```

This diagram is a visual direction, not permission to change business flow.

## The transaction zone

Make the lower transaction area one of Ordio's visual signatures.

It should:

- Feel stable.
- Remain easy to scan.
- Give the total strong visual priority.
- Keep the primary existing checkout action unmistakable.
- Have enough separation from scrollable catalog content.
- Respect device safe areas.
- Feel integrated with the product, not like a floating ad banner.

Suggested visual form:

```text
┌──────────────────────────────┐
│ 4 artículos        $245.00   │
│                              │
│ [      COBRAR $245.00      ] │
└──────────────────────────────┘
```

Do not invent information that does not already exist in the screen state.

---

# 7. Mobile header

The POS header should be compact and operational.

Avoid a large app-title header that wastes vertical space.

Use the header to visually organize existing contextual information only when that information already exists or is already exposed by the UI.

Guidelines:

- Keep the Ordio identity subtle.
- Prioritize useful context over branding size.
- Use one-line labels whenever possible.
- Keep secondary status text visually quiet.
- Make icon buttons large enough to tap even when their icon is visually small.
- Avoid putting five unrelated controls in the header.
- Keep critical existing status indicators consistent across relevant screens.

---

# 8. Product catalog presentation

The product catalog should feel immediate and tactile.

## Product grid

Favor a product tile grid that is:

- Easy to scan.
- Dense enough for a small café catalog.
- Comfortable for thumbs.
- Consistent in height.
- Visually stable as products are added.
- Clear without requiring imagery.

Do not make each product look like an ecommerce product card.

A POS product tile does not need:

- Marketing descriptions.
- Large photos.
- Ratings.
- Badges everywhere.
- Excessive whitespace.

### Product tile hierarchy

Where available, prioritize:

1. Product name.
2. Price.
3. Existing availability/selection state.

The product name should be readable quickly.

Price should be visually secondary to name but still immediately legible.

Long product names should truncate or wrap predictably without changing the entire grid rhythm.

### Tile states

Design polished visual states for states the application already supports:

- Default.
- Pressed.
- Focused where relevant.
- Disabled/unavailable if applicable.
- Selected/added if that state is already represented.

The pressed state should feel tactile and immediate.

Avoid dramatic scale animations that make the grid jump.

---

# 9. Search and category controls

If search/categories already exist in the current UI, give them a deliberate visual treatment.

Search should look lightweight and fast rather than like a giant form field.

Use:

- Clear search icon.
- Comfortable input height.
- High legibility.
- Subtle surface differentiation.
- Predictable clear action if already supported.

Category controls should be easy to scan and should not resemble decorative tags.

Selected category state must be obvious without relying on a tiny color change.

Avoid excessive pill styling.

---

# 10. Cart / current ticket presentation

The ticket is a working surface, not a receipt preview.

Keep it visually structured and compact.

## Line-item hierarchy

Each existing cart line should clearly present the information already available, using hierarchy such as:

- Product name.
- Quantity.
- Unit/subtotal information where already shown.
- Existing line actions.

Do not add data purely for visual richness.

## Quantity controls

If existing quantity controls are present:

- Make them easy to hit.
- Give plus/minus equal visual geometry.
- Do not use tiny icons.
- Keep numeric quantity centered and stable.
- Use clear pressed states.

## Remove action

If the current UI exposes removal:

- Make it discoverable but visually secondary.
- Use danger styling only when necessary.
- Avoid placing it directly beside the primary checkout action.

Do not add new undo behavior if undo does not already exist.

## Total

The total should have excellent numeric typography.

Use tabular numerals when the existing font stack supports them.

The currency value should be among the strongest pieces of typography in the entire mobile application.

---

# 11. Pairing / activation screen

Treat activation as a polished first-run product experience, not a developer setup form.

Preserve exactly what the current pairing action does.

Visually improve:

- Ordio branding.
- Screen balance.
- Input size.
- Input label/help hierarchy.
- Primary CTA.
- Existing error message presentation.
- Loading presentation.
- Keyboard behavior and spacing.

The screen should feel reassuring and intentional.

Avoid:

- Huge illustration hero areas.
- Marketing copy.
- Multiple decorative cards.
- Technical jargon unless it already belongs in the product.

A simple, premium composition is better.

---

# 12. Cashier selection and PIN

This should feel fast, private, and professional.

Preserve the existing authentication behavior.

## Cashier selection

If multiple cashier choices are shown, use a clean selection pattern with:

- Strong name legibility.
- Large touch targets.
- Clear selected state.
- Consistent avatar/initial treatment if useful.

Do not invent profile pictures.

## PIN entry

The PIN screen should feel like a purpose-built POS, not a web form.

Prefer:

- Large visual digit indicators.
- A clean keypad if the current implementation uses one.
- Strong spacing.
- Tactile pressed states.
- Clear error treatment.
- Minimal distractions.

Do not change PIN validation, length, submission behavior, or authentication flow.

---

# 13. Open/close cash screens

Restyle the existing cash-session screens without changing their calculations, validation, or behavior.

Visually prioritize:

- Screen purpose.
- Monetary input.
- Primary confirm action.
- Existing explanatory values.
- Existing result/difference information.

Money entry should use strong typography and excellent spacing.

Avoid presenting a cash action as a generic settings form.

Use a focused transactional layout.

---

# 14. Payment presentation

Payment should visually feel like the decisive end of the sale.

Do not change payment behavior or available methods.

## Payment screen / sheet

Use only the payment methods already provided by the app.

Present them as large, clear actions.

Each option should have:

- Familiar icon where useful.
- Strong label.
- Comfortable hit area.
- Clear selected/pressed feedback.

Avoid creating overly decorative payment cards.

## Primary amount

The amount being paid should dominate the screen.

Recommended hierarchy:

```text
TOTAL
$245.00

[ existing payment option ]
[ existing payment option ]
```

The exact structure should adapt to the current implementation.

## Processing/loading

If the current flow has a loading state, make it calm and unambiguous.

Do not add fake multi-step processing stages.

Do not claim an operation is complete before the existing application considers it complete.

---

# 15. Success and result screens

Existing successful actions should feel satisfying but quick.

Use restrained success treatment:

- Strong confirmation symbol.
- Clear primary result text.
- Important amount where applicable.
- Existing secondary actions.

Avoid confetti, fireworks, or long blocking animations.

The user should be able to continue quickly using the existing flow.

If the current app exposes a print result or print action, visually distinguish it from the sale/payment result without changing printer behavior.

---

# 16. Error, loading, empty, disabled, and informational states

A premium UI is defined as much by edge states as by the happy path.

Redesign all **existing** states consistently.

## Loading

Prefer:

- Skeletons for content lists where appropriate.
- Small activity indicators for actions.
- Stable layouts that do not jump when data arrives.

Do not block the entire screen with a modal spinner unless the existing action truly requires blocking interaction.

## Empty states

Empty states should be compact and useful.

Use:

- Small icon or simple visual.
- Clear title.
- One-line explanation.
- Existing relevant action, if one already exists.

Do not add illustrations solely to fill space.

## Errors

Errors should be:

- Human-readable.
- Visually clear.
- Close to the affected control when possible.
- Consistent across mobile/admin.

Do not expose raw technical error text if the existing UI already has a user-facing message.

Do not create new retry behaviors unless retry already exists.

## Disabled states

Disabled controls must still be legible.

Do not reduce opacity so far that labels become inaccessible.

---

# 17. Design tokens

First inspect the existing styling/theme approach.

If a coherent token system already exists, improve it rather than duplicating it.

If not, establish a compact presentational token layer.

Do not refactor domain code to accomplish this.

## Spacing

Use a 4-point base rhythm.

Recommended scale:

- `4` — micro.
- `8` — tight.
- `12` — compact.
- `16` — standard.
- `20` — comfortable.
- `24` — section.
- `32` — major section.
- `40` / `48` — only for deliberate large separation.

Avoid arbitrary spacing values unless optical correction requires them.

## Radius

Use restrained rounding.

Suggested direction:

- 6 — tiny controls/tags.
- 10 — inputs/buttons.
- 12–14 — product tiles/cards/sheets.
- 18 — larger sheet/modal containers only where appropriate.

Do not turn every component into a pill.

## Borders

Prefer thin borders and subtle tonal separation.

Use borders to create structure, not decoration.

## Elevation

Use shadows sparingly.

Most structure should come from:

- Background layers.
- Dividers.
- Alignment.
- Spacing.
- Typography.

Reserve elevation for elements that actually sit above another interaction layer.

---

# 18. Color system

## First rule

Inspect existing Ordio brand assets/colors before changing the palette.

If the product already has a strong intentional brand color, preserve and refine it.

If the current palette is inconsistent or effectively unbranded, use this direction:

### Base palette direction

- Warm off-white application background.
- White or near-white primary surfaces.
- Soft warm gray secondary surfaces.
- Graphite/near-black primary text.
- Muted gray secondary text.
- A confident warm accent such as burnt orange / terracotta.
- Deep restrained green for success.
- Muted amber for warning.
- Deep red for destructive/error states.
- Restrained blue only for informational/focus use where needed.

Reference values if no better existing brand palette exists:

```text
background       #F6F5F1
surface          #FFFFFF
surfaceSecondary #EFEEE9
textPrimary      #191A18
textSecondary    #676963
border           #DDDCD6
brand            #F15A29
brandPressed     #D94C20
success          #187657
warning          #A96311
danger           #B42318
info             #2563EB
```

These are references, not permission to scatter hex values throughout components.

Use semantic tokens.

## Color discipline

The interface should remain mostly neutral.

Brand color should carry meaning and emphasis.

Do not color every category/action differently just to make the screen look more colorful.

Never rely on color alone to communicate an important state.

---

# 19. Typography

Typography should do significant design work.

The interface needs excellent readability at a glance.

## Preferred approach

First inspect the existing fonts and loading strategy.

If there is already a suitable brand font, keep it.

If there is no meaningful typography system, prefer a highly legible modern sans with a slightly technical/hospitality character.

Possible direction:

- Primary: system sans or IBM Plex Sans / Inter if already available and practical.
- Numeric styling: tabular numerals for money and metrics.

Do not add multiple font dependencies merely to appear designed.

## Suggested hierarchy

Mobile:

- 12–13 — metadata/helper.
- 14–15 — secondary UI.
- 16 — primary body/control text.
- 18–20 — section emphasis.
- 24 — screen/transaction emphasis.
- 30–36 — monetary total when space permits.

Admin:

- 12–13 — metadata/table helper.
- 14 — table/body.
- 16 — controls/body emphasis.
- 18–20 — card/section title.
- 24–30 — page title/key metric.

Avoid oversized 48px+ SaaS headings in operational screens.

## Numeric typography

Money, counts, totals, and metrics should visually align cleanly.

Use tabular numerals where supported.

Do not use thin font weights for critical numeric information.

---

# 20. Touch and control sizing

For mobile, interactive controls must be comfortable for rapid one-handed or two-handed use.

Target at least approximately **48 × 48dp** for interactive hit areas.

Recommended visual sizes:

- Utility icon button: 48dp hit area with 20–24dp icon.
- Standard control: 48–56dp height.
- Primary action: 56–64dp where appropriate.
- Product tile: large enough to tap confidently without sacrificing catalog density.

Do not create tiny `+`, `−`, back, close, delete, or overflow controls.

Admin may use denser desktop targets while remaining comfortably clickable.

---

# 21. Buttons

Create a small, coherent button system.

Suggested variants:

- Primary.
- Secondary.
- Ghost/subtle.
- Danger only where existing destructive actions require it.
- Icon button.

Each variant needs deliberate states:

- Default.
- Hover on web.
- Pressed.
- Focus-visible.
- Disabled.
- Loading if already applicable.

Primary buttons should be confident, not glossy.

Avoid gradients and oversized shadows.

Button labels should be concise and action-oriented.

---

# 22. Inputs

Inputs should feel precise and modern.

Use:

- Clear labels.
- Comfortable padding.
- Visible focus state.
- Subtle default border.
- Strong error treatment.
- Consistent helper text.

Do not use placeholder text as the only label.

On mobile, ensure inputs work correctly with the keyboard and safe area without altering their underlying submit behavior.

Numeric/money inputs should receive special visual care.

---

# 23. Sheets, dialogs, and overlays

Use overlays only where the current UI already needs them or where a presentational restructuring can preserve exactly the same action semantics.

## Mobile

Bottom sheets are appropriate for compact secondary presentation when supported by the existing architecture, but do not convert every screen into a sheet.

## Web

Dialogs should be focused and modest in width.

## Rules

- One clear title.
- Short supporting text.
- Clear primary action.
- Clear cancel/close action when applicable.
- Proper spacing.
- Do not stack dialogs.
- Avoid giant modals for simple forms.

Do not introduce a modal if doing so changes route or business behavior in a meaningful way.

---

# 24. Iconography

Use one icon family consistently.

Prefer the icon library already installed in the project.

Rules:

- 20–24px for most controls.
- Consistent stroke weight.
- Familiar metaphors.
- Pair important icons with text.
- Do not mix filled and outline icon styles randomly.
- Do not use emoji as production UI icons.
- Avoid custom icons for familiar actions unless Ordio already has a brand-specific symbol.

Icons should clarify, not decorate.

---

# 25. Motion and microinteractions

Motion should make Ordio feel responsive and premium without slowing a cashier down.

## Good uses

- Button press compression/tint.
- Product tile press feedback.
- Smooth cart/transaction-summary updates.
- Short sheet/dialog transitions.
- Subtle success state.
- Focus/selection transitions.
- Navigation transitions already supported by the app.

## Timing direction

Most interaction feedback should feel immediate:

- 80–120ms — press feedback.
- 140–200ms — small state change.
- 180–260ms — sheet/dialog transition.

Do not rigidly force these values if the framework's native motion feels better.

## Avoid

- Long entrance animations.
- Staggering every product tile.
- Decorative looping motion.
- Bouncy spring physics on serious transaction actions.
- Confetti.
- Full-screen animation after routine actions.
- Animations that delay the next tap.

Respect reduced-motion settings where practical.

---

# 26. Haptics

If haptics are already available in the mobile stack, use them only as a subtle presentational enhancement.

Potentially appropriate:

- Light feedback on high-confidence product selection.
- Selection feedback for an existing selector.
- Success feedback for an existing successful action.
- Warning/error feedback sparingly.

Do not make haptics necessary to understand state.

Do not introduce behavior differences based on haptics.

---

# 27. Mobile responsive behavior

Phone portrait is primary.

The design should gracefully adapt to:

- Small phones.
- Typical modern phones.
- Large phones.
- Landscape where currently supported.
- Tablet if the current app is usable there.

Do not create a separate tablet product or new feature set.

## Compact phone

Prioritize:

- Product visibility.
- Total visibility.
- Primary CTA.
- Compact header.
- Efficient vertical rhythm.

## Larger screen

Use added space to improve breathing room and information visibility, not to make everything enormous.

Where appropriate, an existing cart can become more persistently visible on wider screens **only if this is a presentational rearrangement of the same existing state and actions**.

---

# 28. Safe areas and keyboard

Mobile layouts must feel native to the device.

Verify:

- Status-bar spacing.
- Notches / Dynamic Island area.
- Bottom home indicator.
- Sticky transaction areas.
- Modal/sheet safe areas.
- Keyboard overlap.
- Numeric input usability.
- Scroll behavior with focused fields.

Do not fix visual overlap by changing business flow.

---

# 29. Admin web — visual system

The admin should share Ordio's design DNA while becoming more desktop-oriented and information-dense.

Avoid turning it into a generic enterprise dashboard template.

## Shell

Use a stable application shell with:

- Clear navigation.
- Compact logo/brand zone.
- Strong active section treatment.
- Consistent page gutters.
- Consistent page-title/header pattern.
- Responsive collapse behavior where needed.

A restrained sidebar is appropriate if it matches the existing navigation structure.

Do not add placeholder navigation items.

---

# 30. Admin login

Make login visually aligned with the mobile activation experience.

Use:

- Strong Ordio identity.
- Focused form composition.
- Excellent input states.
- Confident primary action.
- Minimal decoration.
- Good desktop/mobile responsiveness.

Avoid a split-screen stock-photo SaaS login unless the project already has intentional brand artwork.

---

# 31. Admin dashboard

Redesign only the dashboard information that already exists.

Do not invent metrics.

The dashboard should feel calm and executive rather than card-heavy.

## Metric presentation

Use a small number of strong metric blocks.

Prefer:

- Clear label.
- Strong number.
- Helpful existing context.
- Careful numeric alignment.

Avoid wrapping every metric in a huge floating rounded card.

## Charts

For charts that already exist:

- Reduce visual noise.
- Remove unnecessary borders/gridlines.
- Use the brand accent sparingly.
- Improve labels and tooltip presentation.
- Keep axes readable.
- Use consistent number formatting.

Do not add decorative charts or new analytics.

---

# 32. Admin products

Products should be visually efficient and professional.

Use the UI pattern that best matches the amount of existing information: table, compact rows, or current grid structure.

Improve:

- Page hierarchy.
- Existing filters/search if present.
- Add-product action prominence.
- Row spacing.
- Price alignment.
- Existing status treatment.
- Empty/loading states.
- Form consistency.

Do not introduce product fields that do not already exist.

Do not invent imagery for products.

---

# 33. Admin users / cashiers

Treat user management as a clean operational list.

Improve:

- Name hierarchy.
- Existing role/context display.
- Existing actions.
- Add-user form.
- Empty/error/loading states.

Do not invent permissions, roles, avatars, activity data, or employment metadata.

Initials may be used as a purely visual avatar treatment when names already exist.

---

# 34. Admin sales

Sales should emphasize scanability.

For existing sale fields, use strong table/list hierarchy.

Guidelines:

- Align monetary values to the right.
- Use tabular numerals.
- Keep secondary metadata subdued.
- Make row hover/focus polished.
- Use restrained separators.
- Avoid excessive card-per-sale layouts on desktop.
- Preserve existing actions and details exactly.

Do not invent sale statuses or new drill-down functionality.

---

# 35. Cross-product component language

Mobile and admin should share semantic visual concepts even if implementation primitives differ.

Shared concepts should include:

- Brand color.
- Typography hierarchy.
- Surface hierarchy.
- Border style.
- Radius language.
- Status colors.
- Button hierarchy.
- Input hierarchy.
- Money typography.
- Empty/error/loading visual language.
- Icon style.

Do not force identical component dimensions across touch mobile and desktop web.

They should feel related, not duplicated.

---

# 36. Accessibility as visual quality

Accessibility is part of polish.

Aim for:

- WCAG AA contrast where applicable.
- Approximately 4.5:1 for normal text.
- Approximately 3:1 for large text and important non-text boundaries where applicable.
- 48dp-ish minimum touch hit areas on mobile.
- Clear keyboard focus on admin web.
- Readable error messages.
- No information conveyed by color alone.
- Good text scaling behavior.
- Accessible labels for icon-only buttons.
- Reduced-motion respect where practical.

Do not “solve” accessibility by making the interface visually clumsy; refine it thoughtfully.

---

# 37. Microcopy

You may improve wording only when the meaning remains unchanged.

Prefer copy that is:

- Short.
- Human.
- Specific.
- Calm.
- Action-oriented.

Avoid:

- Technical implementation terminology.
- Overly cheerful fintech copy.
- Long explanatory paragraphs.
- Ambiguous button labels such as “Continuar” when a more specific existing action can be named.

Do not change legal/business meaning.

Do not invent functionality through wording.

---

# 38. Visual anti-pattern blacklist

Do not introduce:

- Generic purple/blue gradients.
- Glassmorphism.
- Excessive backdrop blur.
- Floating blobs.
- Huge rounded cards around every group.
- Bento dashboards for the POS.
- Excessive shadows.
- Marketing-page typography inside the app.
- Tiny gray text.
- Excessive pills.
- Random category colors.
- Decorative carousels.
- Icon-only critical actions.
- Stock illustrations.
- Stock photography.
- Fake device mockups inside operational screens.
- Emoji icons.
- Excessive animations.
- Novel gestures without visible controls.
- Dense walls of bordered cards.
- Default-looking unstyled HTML/admin tables.
- Components that appear copied from unrelated design systems.
- Visual changes that imply features the product does not have.

---

# 39. Avoid “AI-generated UI” aesthetics

The redesign should not look like a generic interface produced from a one-line AI prompt.

Before finalizing each major screen, explicitly critique it for common AI-design symptoms:

- Too many cards?
- Too much rounding?
- Too much empty space?
- Giant title?
- Generic gradient?
- Random icon boxes?
- Everything centered?
- Too many badges?
- Weak information hierarchy?
- Same component repeated everywhere?
- Dashboard aesthetic incorrectly applied to the POS?
- Decorative elements with no purpose?

If yes, simplify and refine.

Aim for a strong product designer's restraint.

---

# 40. Implementation approach

## Phase A — inspect only what is needed

Inspect:

- Existing mobile routes/screens.
- Existing admin routes/pages.
- Current reusable UI components.
- Current styling/theme approach.
- Existing icon libraries.
- Existing font setup.
- Existing assets/logo.
- Existing states displayed by each screen.
- Current responsive behavior.

Read other code only as necessary to avoid changing behavior.

Do not turn the audit into an architecture project.

## Phase B — establish visual foundations

Create or refine:

- Semantic colors.
- Typography scale.
- Spacing scale.
- Radius scale.
- Border/elevation rules.
- Button variants.
- Input variants.
- Surface/container patterns.
- Status treatment.
- Icon sizing rules.

Keep the system small and intentional.

## Phase C — mobile transformation

Restyle the existing mobile flow in this priority order:

1. Main sale screen.
2. Product tiles/catalog.
3. Transaction summary/cart.
4. Payment presentation.
5. Pairing.
6. Cashier/PIN.
7. Open/close cash screens.
8. Existing result/error/loading states.
9. Existing printer-related presentation.

Do not change what any of these screens actually do.

## Phase D — admin transformation

Restyle:

1. Application shell/navigation.
2. Login.
3. Dashboard.
4. Products.
5. Users/cashiers.
6. Sales.
7. Existing forms/dialogs/states.

Do not add modules.

## Phase E — consistency pass

Review the whole product for:

- Spacing inconsistencies.
- Misaligned text.
- Inconsistent control heights.
- Incorrect radii.
- Duplicate colors.
- Weak contrast.
- Inconsistent icons.
- Unbalanced layouts.
- Overuse of cards.
- Poor empty states.
- Jumpy loading states.
- Keyboard overlap.
- Safe-area issues.
- Poor responsive behavior.

Fix these before considering the redesign complete.

## Phase F — visual QA

If simulator/device/browser visual inspection is available, inspect actual rendered screens rather than trusting code alone.

Check at least:

### Mobile

- Small phone portrait.
- Typical phone portrait.
- Large phone portrait.
- Keyboard open on relevant input screens.
- Empty ticket.
- Populated ticket.
- Existing loading/error/success states.
- Long product names.
- Larger monetary totals.

### Admin

- Typical laptop viewport.
- Wide desktop.
- Narrow desktop/tablet-like width if supported.
- Empty lists.
- Populated lists.
- Long names.
- Loading/error states.
- Forms/dialogs.

When a screen merely looks “fine,” continue refining it until hierarchy, spacing, typography, and interaction states feel deliberate.

---

# 41. Engineering guardrails for a visual-only redesign

Run the project's normal typecheck/lint/build/tests as appropriate, but do not use this redesign as an excuse for unrelated refactors.

When modifying a component:

- Preserve the same data source.
- Preserve the same event/action handler semantics.
- Preserve the same submit behavior.
- Preserve the same route behavior.
- Preserve the same API interaction.
- Preserve the same validation behavior.
- Preserve the same business state transitions.

Presentation refactors are allowed.

Behavior refactors are not.

If a component mixes presentation and business logic, make the smallest safe presentational change possible rather than rewriting its domain behavior.

Do not edit non-UI code for aesthetic reasons.

---

# 42. Definition of done

The redesign is complete when:

## Visual quality

- Ordio no looks like a starter template or MVP.
- Mobile and admin clearly belong to the same brand.
- The POS looks purpose-built for a café.
- Typography has deliberate hierarchy.
- Spacing follows a consistent rhythm.
- Colors are semantic and restrained.
- The primary action is visually obvious on each screen.
- Money is especially easy to scan.
- Product tiles feel tactile and refined.
- Inputs and forms feel finished.
- Empty/loading/error states look intentional.
- Icons are consistent.
- Motion is subtle and useful.
- Responsive layouts feel composed rather than merely compressed.

## Mobile experience

- Main sale screen feels fast and uncluttered.
- Product grid is easy to scan and tap.
- Current ticket/total has strong visual presence.
- Checkout/payment presentation feels decisive and premium.
- Pairing and PIN look like part of the same product.
- Cash screens feel transactional rather than like generic forms.
- Safe areas and keyboard states look correct.

## Admin experience

- Navigation is coherent and polished.
- Dashboard communicates hierarchy without card overload.
- Products/users/sales are dense but readable.
- Tables/lists/forms share one visual language.
- Existing states are consistently presented.

## Behavior preservation

- No product functionality was added, removed, or altered.
- No non-UI behavior or business rule was changed.
- Existing user actions still produce the same effects as before.
- The redesign remains a presentation-layer transformation only.

---

# 43. Final self-critique before finishing

Before reporting completion, review every redesigned surface and answer internally:

### Does it look premium?

Not “does it have rounded cards?” — does it actually feel composed, deliberate, and mature?

### Does it look like a POS?

The mobile sale interface should look like a high-frequency tool, not a SaaS dashboard squeezed into a phone.

### Is it distinctive without being flashy?

There should be clear Ordio character, but no visual gimmicks.

### Did visual polish accidentally alter behavior?

If yes, revert the behavioral change and retain only the presentation improvement.

### Is anything present only because it looked good in a mockup?

If it has no basis in the existing application, remove it.

### Are the boring states polished?

Loading, empty, error, disabled, keyboard-open, long text, and small-screen states should receive the same care as the main screenshot-worthy screen.

### Is the design coherent across mobile and admin?

They should share visual DNA while respecting their different interaction environments.

---

# 44. Final instruction to Claude Code

Implement this as a **complete visual UI/UX transformation of the existing Ordio application**.

Do not stop at an audit, design proposal, or mockup. Apply the design to the real mobile and admin interfaces.

Your job is to make the existing product substantially more beautiful, polished, cohesive, readable, tactile, and professional.

Your job is **not** to redesign the system underneath it.

Keep the product behavior exactly as it is.

Focus your effort on:

- Visual hierarchy.
- Composition.
- Typography.
- Spacing.
- Color.
- Product tiles.
- Transaction/ticket presentation.
- Buttons and inputs.
- Payment presentation.
- Login/pairing/PIN presentation.
- Cash-screen presentation.
- Admin navigation.
- Dashboard presentation.
- Tables/lists/forms.
- Responsive quality.
- Loading/error/empty states.
- Motion and tactile feedback.
- Cross-screen consistency.
- Final visual QA.

Do not introduce unrelated refactors.

Do not add new business functionality.

Do not alter non-UI or product behavior.

Do not make assumptions about features that are not already present.

When finished, provide a concise summary containing:

1. Visual system created/refined.
2. Mobile screens visually transformed.
3. Admin screens visually transformed.
4. Reusable presentation components created/refined.
5. Responsive/accessibility improvements.
6. Visual QA performed.
7. Confirmation that product behavior and business logic were preserved.

The target is not merely “clean UI.”

The target is: **Ordio should look like a polished commercial product while remaining the exact same application underneath.**
