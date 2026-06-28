source visual truth path: C:\Users\afils\.codex\generated_images\019f0aaa-4d86-7fb2-a9cd-d14ea308a8b1\ig_0bdd3a9b2ee7ec5d016a40747a04248194891549460946df66.png
implementation screenshot path: C:\Users\afils\AppData\Local\Temp\revoke-orbit-celestial-final-c28e9d6\home-desktop-670.png
implementation preview URL: https://revoke-pls-git-orbit-command-design-squikyus-8256s-projects.vercel.app/?_vercel_share=ieqPKd91tndONmiWxtqCmUx6I9M1VqwE
viewport: 1445x670 desktop, with additional mobile and /app desktop checks from the same branch preview flow
state: default dark theme, unauthenticated, landing hero with scanner command deck visible
full-view comparison evidence: C:\Users\afils\AppData\Local\Temp\revoke-orbit-celestial-final-c28e9d6\comparison-desktop-670.png
focused region comparison evidence: final 1445x670 desktop screenshot was inspected for orbit quality, readable chain labels, visible scanner command deck, CTA placement, and text overlap. Mobile and /app intro screenshots were checked during the same build iteration; no mobile-specific code changed after that pass.

**Findings**
- No actionable P0/P1/P2 findings.

**Intentional Product Constraints**
- The implementation keeps the existing Pulse Revoke header, routes, typography system, supported-chain metadata, and chain logo components instead of recreating the mock navigation exactly.
- The hero uses a generated background asset only for the orbital space backdrop; labels, controls, chain logos, CTAs, and scanner preview remain editable app UI.
- The landing scanner table is a visual preview. Existing scanner and revoke execution behavior remain unchanged.

**Required Fidelity Surfaces**
- Fonts and typography: existing product typography is retained; hero scale, compact scanner labels, and CTA copy remain readable at the checked desktop and mobile sizes.
- Spacing and layout rhythm: the orbit panel and scanner deck now read as a connected console on 1445x670 desktop, while mobile keeps a stacked rhythm without overlapping text.
- Colors and visual tokens: the implementation stays within the Pulse Revoke dark token system while matching the selected option's cyan, purple, pink, green, and warm orbit accents.
- Image quality and asset fidelity: a high-resolution generated orbital backdrop is used; existing chain logo assets render inside animated planet nodes instead of placeholder shapes.
- Copy and content: address-first, read-only scan, wallet-confirmed revoke, and incomplete-verification messaging remain present without adding new revoke or recovery claims.

**Patches Made Since QA**
- Added the generated orbital background asset at `public/images/orbit-system-bg.png`.
- Reworked the hero orbit into slower animated planet nodes with a brighter central scan core.
- Replaced the old three-card preview with a more integrated scanner command deck and compact preview area.
- Tucked the scanner command deck upward on desktop so it is visible in the first 1445x670 viewport; mobile keeps normal stacked spacing.
- Verified the /app intro orbit still uses the same existing component path and remains readable.

final result: passed
