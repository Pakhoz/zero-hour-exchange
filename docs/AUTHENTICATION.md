# Authentication, request flow, credentials and tokens

## Finding

This repository is a standalone, static, single-player game. **It has no application authentication.** There is no login screen, identity provider, password database, session cookie, bearer token, refresh token, or backend authorization middleware. The initial workspace and target GitHub repository were empty; there was no earlier authentication implementation to preserve or explain.

## Components and code

| Component | Code | Responsibility |
| --- | --- | --- |
| Browser entry | `index.html`, `play.html` | Loads relative CSS and the ES module `src/app.js`. No credentials requested. |
| UI controller | `src/app.js`, `initialize`, `dispatch` | Loads local progress, acquires a Web Lock for a single writer, dispatches actions and saves resulting state. |
| Game engine | `src/core.js`, `act`, `settle` | Validates transactions against the current customer, funds and stock; closes completed encounters. These are game rules, not security authorization. |
| Save persistence | `src/storage.js`, `load`, `save`; `src/core.js`, `validate`, `migrate` | Reads V1/V2 saves, preserves a V1 backup before upgrading, then writes validated V2 JSON. Stores game state only. |
| V2 stories and audio | `src/stories.js`, `src/audio.js` | Settles story choices locally; synthesizes optional audio without network requests. Audio preferences are stored separately. |
| Service Worker | `sw.js` | Caches same-origin static assets for offline use. Does not perform login or attach authentication headers. |
| Development server | `scripts/serve.mjs` | Serves static files on loopback, with path containment checks. It is not an API or a production auth service. |
| CI deployment | `.github/workflows/pages.yml` | Uses GitHub-managed workflow permissions for Pages publication, outside the game's runtime. |

## Request and state flow

```mermaid
sequenceDiagram
    participant B as Browser / iPad Safari
    participant H as Static host / GitHub Pages
    participant SW as Service Worker cache
    participant UI as app.js
    participant G as core.js
    participant S as localStorage
    B->>H: GET index.html, CSS, ES modules, icons
    B->>SW: Register sw.js and cache core assets
    UI->>S: Load V1/V2 save; validate and migrate to V2
    B->>UI: Offer / accept / reject / sell / upgrade / end day
    UI->>G: act(state, action)
    G-->>UI: New state and result message
    UI->>S: JSON save after transition
    UI-->>B: Render updated cash, inventory, customer
    B->>SW: Later navigation / offline asset request
    SW-->>B: Cached static resources
```

Gameplay actions make **no HTTP requests**. An `action.customerId` matches the current encounter to reject stale or repeated UI actions; it is an identifier, not an authentication token. A day number similarly guards repeated daily settlement. Saved RNG state makes an interrupted negotiation resumable without a refresh reroll.

## Credential and token handling

- The game never asks for, transmits, or stores account credentials. Source and built assets contain no API keys, GitHub PATs, or service secrets.
- Saves include cash, inventory, hidden customer prices and authenticity. They are readable and editable by the device owner. This is acceptable for an offline single-player game, but cannot enforce fair multiplayer economies or trusted leaderboards.
- Data validation detects malformed or incompatible saves; it is **not encryption or tamper-proof authentication**. Web Locks prevent accidental concurrent writes, not malicious access.
- GitHub connector authorization belongs to the development tool's connected account. That credential is not available to the game and is not written into this repository.
- GitHub Actions supplies its ephemeral workflow credential and Pages identity in the runner. The build job has `contents: read`; the deploy job has `pages: write` and `id-token: write`. GitHub's Pages deployment actions consume those capabilities. They are not bundled into `dist/` or persisted in localStorage.
- Static hosting access controls, if configured by a host, are separate from this application. The game itself does not identify the player, synchronize devices, or protect saves from other users of the same browser profile.

Future cloud saves would require a separate authenticated backend, server-side authorization for each player's records, and a migration plan. No account infrastructure is necessary for V2's local play.
