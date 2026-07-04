# State Management & Client Stores

TemplateCraft manages global states using decentralized client contexts and a central Zustand store.

---

## 1. Zustand Global Store Slices

The global store (`useStore.js`) aggregates multiple slices to keep data flows predictable.

```
                  [ useStore (Zustand) ]
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
[ campaignSlice ]                         [ uiSlice ]
  - campaigns / loading state               - previewMode (viewport)
  - active campaign data                    - toasts / global loading
  - active page canvas DTO                  - screen reader announcer
  - API sync dispatchers                    - telemetry counters
```

### 1.1 Campaign State Slice (`campaignSlice.js`)
Handles database queries and edits for campaigns, pages, templates, and configurations.
- **State Fields**:
  - `campaigns`: List of all available campaigns.
  - `campaignsLoading`: Boolean loading spinner flag for campaigns lists.
  - `campaign`: The active campaign details (loaded on `/campaigns/:id`).
  - `campaignPage`: The specific campaign page slot configuration (GrapesJS JSON data, HTML, CSS).
  - `campaignLoadingId` / `campaignPageLoadingKey`: In-flight query lock keys to prevent duplicate network calls.
- **Action Operations**:
  - `fetchCampaigns()`: Loads campaigns list.
  - `loadCampaign(id)`: Loads campaign details.
  - `loadCampaignPage(campaignId, pageType)`: Fetches canvas content for editing.
  - `createCampaign(payload)`: Saves campaign.
  - `updateCampaign(id, payload)`: Modifies campaigns metadata.
  - `saveCampaignPageContent(campaignId, pageType, payload)`: Posts editor changes back to the API.
  - `applyCampaignDefaults(id)`: Replaces blank template pages with default HTML templates.

### 1.2 User Interface Slice (`uiSlice.js`)
Manages screen configurations, notification overlays, and logging.
- **State Fields**:
  - `previewMode`: Editor viewport layout emulator (`desktop`, `tablet`, `mobile`).
  - `loading` / `saving` / `error`: Central indicators for operations in progress.
  - `toasts`: Array of alert objects `{ id: string, message: string, type: 'info' | 'success' | 'error' }`.
  - `srAnnouncement`: Text announcement string captured by screen readers.
- **Action Operations**:
  - `addToast(message, type)`: Generates a toast alert and sets a 3.5-second auto-clear timer.
  - `removeToast(id)`: Manually clears a toast alert.
  - `announce(message)`: Triggers a screen reader announcement.

---

## 2. Telemetry Persistence (`persistence.js` & `localStorageAdapter.js`)

To track editor usage, a telemetry persistence system listens to changes and saves stats to `localStorage` under `templatecraft_metrics`:
- **Metrics Collected**: Projects created, blocks added, export files generated, file saves, and user session duration.
- **Automatic Storage**: The adapter serializes, parses, and validates inputs to prevent storage corruption.

---

## 3. React Context Providers

- **AuthContext (`AuthContext.jsx`)**:
  - Wraps the application root router.
  - Controls JWT auth token storage (`templatecraft_auth_token` in `localStorage`).
  - Stores the logged-in administrator profile state (`user`).
  - Exposes `login(credentials)` and `logout()` operations.
- **ThemeContext (`ThemeContext.jsx`)**:
  - Manages dark and light mode settings.
  - Appends the `.dark` class to `document.documentElement` and coordinates color variable changes.
- **EditorContext (`EditorContext.tsx`)**:
  - Wraps the GrapesJS editor session.
  - Exposes the raw `editor` instance, canvas zoom level, device selector, and `dragDebug` status object to custom panels.
