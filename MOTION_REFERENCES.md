# entre. — Framer + Dribbble Motion Notes

The live app stays on GitHub Pages. The Framer project is an editable design and motion studio, not an alternate login or a mock replacement for live chat.

## References and design takeaways
- [Live Streaming and Social Dating Onboarding — Dribbble](https://dribbble.com/shots/26214743-Onboarding-for-Live-Streaming-and-Social-Dating-App): visual introduction with a focused CTA. Adopted the principle of low-friction arrival, **not swipe behavior**.
- [Dating App Onboarding Screen — Dribbble](https://dribbble.com/shots/27089292-Dating-app-onboarding-screen): layered depth and step-by-step storytelling; translated to the unique 5-minute live model.
- [Dating App Onboarding Screens — Lumeaf Designs](https://dribbble.com/shots/27006190-Dating-App-Onboarding-Screens-UI-UX-Design): pacing and clear explanatory states.
- [Dating App Animation collection — Dribbble](https://dribbble.com/search/dating-app-animation): small button reaction and match feedback, without cloning motion assets.
- [Chat Loading collection — Dribbble](https://dribbble.com/search/chat-loading): restrained waiting and progress state.

## Applied to GitHub site (implementation)
- Click or tap feedback with position-aware ripple on all existing CTA, filter, Google login and navigation buttons.
- Viewport-triggered reveal for editorial page sections, cards and content; each section animates once.
- Lightweight floating two-person scene and soft timer glow.
- Improved searching ring visual feedback and distinct connected-chat surface.
- Brief abstract match celebration ONLY after a user's affirmative vote and an actual connected pair (never simulates a successful match).
- Reduced motion behavior respected.
- No dependencies; motion.js and motion.css run on the actual web app and don't change the account, queue or server code.

## Framer
Editable project: https://framer.com/projects/OAd3Vc78F1KGMhGLrx0j

The Framer canvas contains a fresh editorial landing cover, animated controls and layered five-minute encounter visual, plus a three-stage story and a direct CTA to the actual GitHub app.

## Product limits
Google OAuth still requires Google Cloud and Supabase provider configuration. Framer cannot replace GitHub Pages/Supabase for authenticated, persistent 1:1 chats.
