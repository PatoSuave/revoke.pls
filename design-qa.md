source visual truth path: C:\Users\afils\.codex\generated_images\019f0aaa-4d86-7fb2-a9cd-d14ea308a8b1\ig_03012c2d06eb2018016a404678d4f48196b8b4b67fb87899ad.png
implementation screenshot path: C:\Users\afils\AppData\Local\Temp\revoke-orbit-qa\home-desktop.png
viewport: 1440x1200 desktop, with additional checks at 390x1200 mobile and /app desktop/mobile
state: default dark theme, unauthenticated, scanner preview state
full-view comparison evidence: reference image and implementation screenshots were opened and compared. Implementation preserves the selected Orbit Command direction: dark scanner surface, orbiting chain badges around a scanned address, address-first scanner command bar, chain rail, table preview, and spender details panel.
focused region comparison evidence: home desktop, home mobile, app desktop, and app mobile screenshots were inspected for clipped labels, orbit overlap, command bar layout, stacked mobile rhythm, and scanner intro continuity.

**Findings**
- No actionable P0/P1/P2 findings.

**Intentional Product Constraints**
- The implementation keeps the existing Pulse Revoke header, routes, typography system, and supported-chain metadata instead of recreating the mock navigation exactly.
- Unsupported mock chains were not copied into the product surface. The orbit uses existing supported EVM chain metadata and logos.
- The scanner table is a visual preview on the landing page. Existing revoke execution behavior and live scanner gates remain unchanged.

**Required Fidelity Surfaces**
- Fonts and typography: existing product typography is retained; hero scale, compact table text, and mobile wrapping are readable in captured viewports.
- Spacing and layout rhythm: desktop preview aligns as a scanner console; mobile stacks without overlapping controls or clipped orbit labels.
- Colors and visual tokens: implementation stays within the existing dark Pulse Revoke token system while matching the reference's cyan, purple, pink, and green scanner accents.
- Image quality and asset fidelity: no raster placeholder assets were introduced; existing chain logo assets render inside orbit nodes and rail rows.
- Copy and content: address-first, read-only scan, no custody, no seed phrase, wallet-confirmed revoke, and incomplete-verification messaging are present without adding new revoke claims.

**Patches Made Since QA**
- Added animated orbit map and scanner preview section.
- Replaced the home hero and /app intro with the Orbit Command treatment.
- Added reduced-motion handling for orbit and preview animations.

final result: passed
