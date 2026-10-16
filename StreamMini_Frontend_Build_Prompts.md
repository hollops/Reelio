# StreamMini — Frontend Build Prompts for Claude Code

How to use this: paste these into your Claude Code chat in VS Code **in order, one at a time (or a few at a time within a phase)**. Let it finish and review each step before moving to the next — don't dump all 100 at once. Each prompt assumes React + TypeScript + Tailwind, matching the tech stack in the PRD. Adjust names/paths if your project differs.

Frontend and backend can be built in parallel: Phase 0 sets up a **mock API layer** matching the real contract, so every later feature is built against fake-but-realistic data. When the real backend is ready, only the API client file needs to change.

---

## Phase 0 — Project Setup & Mock API Layer (Prompts 1–8)

1. Initialize a new React + TypeScript project using Vite, with Tailwind CSS configured and a clean starter folder structure (src/components, src/pages, src/features, src/lib, src/hooks).
2. Set up ESLint and Prettier with a sensible default config for a React + TypeScript project, and add npm scripts for lint and format.
3. Create a `src/lib/apiClient.ts` file that wraps `fetch`, injects a bearer token from local storage into headers, has a base URL from an environment variable, and centralizes error handling.
4. Create a mock data layer in `src/lib/mockApi.ts` that simulates every endpoint from this API contract with realistic JSON responses and artificial network delay: POST /auth/register, POST /auth/login, GET /titles, GET /titles/:id, GET /search, GET /me/list, POST /me/list, DELETE /me/list/:id, GET /me/progress, POST /me/progress, POST /titles/:id/comments, POST /admin/titles, PUT /admin/titles/:id, DELETE /admin/titles/:id.
5. Add a feature flag or environment variable (`VITE_USE_MOCK_API`) that switches `apiClient` between the mock layer and real HTTP calls, so we can toggle this later without rewriting components.
6. Generate 20 realistic mock title objects (mix of movies and series with episodes) with poster URLs (use placeholder image service), genres, cast, synopsis, and duration, and store them as seed data for the mock API.
7. Set up React Router with placeholder routes for: Home, TitleDetail, Search, Login, Register, Player, Admin, and a 404 page.
8. Create a base layout component with a persistent NavBar and an outlet for page content, and wire it into the router.

## Phase 1 — Design System / UI Kit (Prompts 9–18)

9. Design a color palette and typography scale in the Tailwind config for a dark-themed streaming app (dark background, high-contrast text, one accent color), and document it in a short README section.
10. Build a reusable `Button` component with primary, secondary, and ghost variants, plus loading and disabled states.
11. Build a reusable `Input` component with label, error message support, and password visibility toggle for password fields.
12. Build a reusable `Modal` component with backdrop, close-on-escape, and a slot for custom content.
13. Build a reusable `Spinner` and `Skeleton` loading component set for use while data is fetching.
14. Build a `Badge` component for genre tags and content-type labels (Movie / Series).
15. Build an `Avatar` component that shows a user's initials or profile image with a fallback.
16. Build a `Toast` / notification system for success and error messages, with a hook like `useToast()` to trigger them from anywhere.
17. Build an `EmptyState` component (icon, message, optional call-to-action button) for empty search results, empty watchlists, etc.
18. Create a `Container` and responsive grid/layout helper components used to keep consistent page padding and max-widths across the app.

## Phase 2 — App Shell, Routing & Auth Guarding (Prompts 19–24)

19. Build the NavBar with logo, search bar entry point, and a profile dropdown menu (My List, Admin if applicable, Logout).
20. Create an `AuthContext` that holds the current user and token, exposes `login`, `logout`, and `register` functions, and persists the session in local storage.
21. Create a `ProtectedRoute` wrapper component that redirects unauthenticated users to the login page.
22. Create an `AdminRoute` wrapper that only allows access if the current user has an admin role, redirecting everyone else.
23. Wire `AuthContext` into the router so the app shows a loading state while checking for an existing session on first load.
24. Add a global error boundary component that catches render errors and shows a friendly fallback UI instead of a blank screen.

## Phase 3 — Authentication (Prompts 25–34)

25. Build the Register page with name, email, and password fields, client-side validation, and a link to the login page.
26. Build the Login page with email and password fields, a "remember me" checkbox, and a link to the register page.
27. Wire the Register form to call `authClient.register` and redirect to the home page on success, showing field-level errors on failure.
28. Wire the Login form to call `authClient.login`, store the returned token via `AuthContext`, and redirect to the home page.
29. Add form-level loading states (disable submit button, show spinner) while auth requests are in flight.
30. Build a Logout action in the NavBar profile menu that clears the session and redirects to the login page.
31. Build a simple Profile page showing the user's name, email, and an editable avatar/display name field.
32. Wire the Profile page's edit form to an update-profile mock endpoint and show a success toast on save.
33. Add basic password strength validation (minimum length, at least one number) to the Register form with inline feedback.
34. Add a "Forgot password" link on the Login page that opens a modal collecting an email and shows a confirmation message (mock only, no real email sending needed yet).

## Phase 4 — Home Page & Catalog Browsing (Prompts 35–46)

35. Build a `TitleCard` component showing poster image, title, and a hover state that reveals a play button and "add to list" button.
36. Build a `RowCarousel` component that horizontally scrolls a list of `TitleCard`s with left/right scroll buttons that appear on hover.
37. Build a `HeroBanner` component for the top of the home page featuring one highlighted title with a background image, title, short synopsis, and Play/More Info buttons.
38. Build the Home page layout combining `HeroBanner` and multiple `RowCarousel`s: Trending, Continue Watching, and one row per genre.
39. Wire the Home page to fetch titles from the mock API and group them into the appropriate rows client-side (by genre and by trending flag).
40. Add skeleton loading placeholders for the Home page rows while data is loading.
41. Make `TitleCard` clickable, navigating to the Title Detail page for that title.
42. Add a quick "add to My List" toggle button directly on `TitleCard` that updates without navigating away, with optimistic UI update.
43. Handle the empty state where a user has no Continue Watching items yet (hide the row or show a friendly empty state).
44. Add horizontal scroll snapping and touch/swipe support to `RowCarousel` for mobile devices.
45. Add keyboard accessibility to `RowCarousel` (arrow keys move focus between cards, Enter opens the focused title).
46. Polish the Home page responsive layout so rows and the hero banner adapt cleanly from desktop down to a 360px-wide mobile viewport.

## Phase 5 — Title Detail Page (Prompts 47–56)

47. Build the Title Detail page layout: banner image, title, genre badges, synopsis, cast list, and primary Play button.
48. Wire the Title Detail page to fetch a single title's full data from the mock API using the route's `:id` parameter.
49. Build an `EpisodeList` component for series titles, showing episode number, thumbnail, title, and duration, with a Play button per episode.
50. Add an "Add to My List" / "Remove from My List" toggle button on the Title Detail page reflecting current list membership.
51. Build a `SimilarTitlesRow` on the Title Detail page that shows other titles sharing at least one genre tag.
52. Build a `CommentsSection` component showing a list of existing comments (author, text, timestamp) and a form to add a new one.
53. Wire the comment form to post to the mock API and optimistically add the new comment to the list.
54. Add a "like" button with a count on the Title Detail page, wired to a mock like/unlike endpoint with optimistic UI update.
55. Handle the loading and not-found states for the Title Detail page (e.g., invalid ID shows a friendly "title not found" message).
56. Make the Title Detail page responsive, stacking the banner content and episode list cleanly on mobile widths.

## Phase 6 — Search (Prompts 57–64)

57. Build a `SearchBar` component in the NavBar with a text input and a debounced onChange handler.
58. Build the Search results page showing a grid of `TitleCard`s matching the query.
59. Wire the Search page to call the mock search endpoint as the user types, with a minimum 300ms debounce.
60. Add genre and content-type (Movie/Series) filter chips above the search results that narrow the current result set.
61. Add an empty state for zero search results, suggesting the user try different keywords or browse genres instead.
62. Add a type-ahead dropdown under the NavBar search bar showing up to 5 quick matches before the user presses Enter.
63. Persist the current search query and filters in the URL query string so results are shareable/bookmarkable.
64. Add loading skeletons to the Search results grid while a query is in flight.

## Phase 7 — Video Player (Prompts 65–76)

65. Build a custom `VideoPlayer` component wrapping the native HTML5 `<video>` element with a styled custom control bar (play/pause, seek bar, volume, fullscreen, current time / duration).
66. Add keyboard shortcuts to `VideoPlayer`: space to play/pause, arrow keys to seek, "f" for fullscreen, "m" to mute.
67. Build the Player page that loads a `VideoPlayer` full-screen with the title's video source from the mock API.
68. Implement resume-from-last-position: on player load, fetch saved progress for this title and seek to that timestamp before playing.
69. Implement a `ProgressReporter` that posts the current playback position to the mock progress endpoint every 10 seconds while playing.
70. Add a "Next Episode" overlay that appears in the last 20 seconds of an episode for series titles, with a countdown and cancel button.
71. Wire the Next Episode overlay's autoplay action to navigate to the next episode's player route and start playback automatically.
72. Add a quality selector menu (e.g., 480p/720p) to the player controls, even if the mock data only provides one rendition for now.
73. Add a "Back" button on the player that returns to the previous page instead of the home page.
74. Handle player error states gracefully (e.g., video fails to load) with a retry button.
75. Add a loading spinner overlay on the player while the video is buffering.
76. Make the player controls responsive and touch-friendly, hiding automatically after a few seconds of inactivity and reappearing on tap/mouse-move.

## Phase 8 — Personalization: My List & Continue Watching (Prompts 77–84)

77. Build a "My List" page showing all titles the user has added, using the same `TitleCard` grid layout as search results.
78. Wire the My List page to fetch from the mock `/me/list` endpoint and support removing items directly from the page.
79. Build the "Continue Watching" row's card variant that shows a progress bar overlay on the poster indicating percent watched.
80. Wire the Continue Watching row on the Home page to the mock `/me/progress` endpoint, sorted by most recently watched.
81. Add a "Remove from Continue Watching" option (small "x" on hover) that clears progress for that title.
82. Add an empty state for the My List page encouraging the user to browse and add titles.
83. Sync "My List" add/remove state across the Home page, Title Detail page, and My List page using shared state (context or query cache) so the UI never shows stale data.
84. Add a subtle toast confirmation whenever a title is added to or removed from My List.

## Phase 9 — Admin / Content Management (Prompts 85–92)

85. Build an Admin dashboard page listing all titles in a table with columns for title, type, genre, and actions (edit/delete).
86. Build a `TitleForm` component for creating and editing a title's metadata (name, synopsis, genres, cast, type, poster URL).
87. Wire the "Create Title" flow to the mock admin create endpoint and refresh the table on success.
88. Wire the "Edit Title" flow to pre-fill `TitleForm` with existing data and submit updates to the mock update endpoint.
89. Add a delete confirmation modal before removing a title, wired to the mock delete endpoint.
90. Build a `MediaUploader` component that accepts a video file and poster image, shows upload progress, and previews the selected files (mock the actual upload with a fake progress bar for now).
91. Build a simple episode manager within `TitleForm` for series, allowing the admin to add, reorder, and remove episodes.
92. Add basic table sorting and a text filter to the Admin title list for quickly finding a specific title.

## Phase 10 — Responsiveness, Accessibility & Polish (Prompts 93–98)

93. Do a full responsive pass across every page (Home, Title Detail, Search, Player, My List, Admin) at 360px, 768px, and 1280px widths, fixing any layout breaks.
94. Add proper alt text to all images and aria-labels to icon-only buttons across the app.
95. Ensure all interactive elements are reachable and operable via keyboard alone (tab order, focus rings, escape closes modals).
96. Run a color contrast check across the design system and adjust any text/background combinations that fail WCAG AA.
97. Add page transition/loading states so navigating between routes never shows a blank white flash.
98. Review and reduce unnecessary re-renders in list-heavy components (RowCarousel, Search results, Admin table) using memoization where it meaningfully helps.

## Phase 11 — Swapping in the Real Backend & Deployment (Prompts 99–100+)

99. Replace the mock implementations in `apiClient.ts` with real `fetch` calls to the live backend base URL from an environment variable, keeping the exact same function signatures used by every component so nothing else needs to change.
100. Add a `.env.example` file documenting required environment variables (API base URL, feature flags), and write a short README section on how to run the frontend against the mock API versus the real backend.

**Optional extras if you have time left:**
101. Add a dark/light theme toggle stored in local storage.
102. Add basic unit tests (Vitest + React Testing Library) for the Auth forms and the VideoPlayer's play/pause logic.
103. Set up a GitHub Actions workflow that runs lint and tests on every pull request.
