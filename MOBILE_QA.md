# entre. — Mobile QA

Automated local Chromium/Playwright responsive visual testing across widths 320, 360, 375, 390, 414, 430, 600, 768, 820, 900, 901, and 1024px.

Tested nine independently rendered states: homepage, Google login, dashboard, connecting, searching, timed chat, conversations, profile, and settings. 117 viewport/state cases; no unintended horizontal overflow after the patch.

Fixed: landing title and CTA min-content overflows at 320–390px, long participant names causing chat headers to expand, profile editor overflow at 768px, mobile composer hidden below fold, and adaptive navigation up to 900px.

The test uses local simulated sessions to inspect layout. It is *not* an authentication or real multi-user integration test. Production OAuth configuration and physical-device testing are separate tasks.
