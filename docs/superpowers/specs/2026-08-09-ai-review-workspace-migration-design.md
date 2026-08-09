# AI Review Workspace Migration Design

## Goal

Move the Chinese AI review workspace from the standalone
`jiaxuan-tao/ai-review-workspace` repository into `vibe-coding-lab` as a
maintained top-level project. The migrated project must preserve the useful
review workflow, disclose its Shiori origin, remove unrelated legacy systems,
and run from the Vibe Coding Lab GitHub Pages site.

## Product Scope

The project is a Chinese study review workspace built around one focused loop:

1. Read and organize study material.
2. Turn the material into a review plan.
3. Reinforce key points with flashcards.
4. Complete a knowledge quiz.
5. Use weak-point feedback to choose the next review action.

The migrated version keeps the existing demo-first experience and the optional
browser-local Qwen API key flow. It does not reintroduce the original Shiori
school-management scope.

## Migration Approach

Use a focused source migration rather than copying the entire standalone
repository or importing its Git history.

Create `ai-review-workspace/` at the root of `vibe-coding-lab`. Move the current
frontend into a conventional standalone Vite layout:

```text
ai-review-workspace/
├── README.md
├── LICENSE
├── THIRD_PARTY_NOTICES.md
├── package.json
├── package-lock.json
├── index.html
├── public/
├── src/
└── docs/images/
```

The original repository remains the historical record. After the migration is
published and verified, change that repository from public to private. Do not
delete it.

## Included Code

Keep only code required by the active Chinese review experience:

- Vite application entry and shared styles.
- Review dashboard and demo initialization.
- Notes, study plans, flashcards, and quiz pages.
- Components and stores imported by the active route tree.
- Browser-local Qwen settings and the deterministic sample fallback.
- Public application icons and manifest files that match the migrated product.

Remove unreachable modules only when static import analysis confirms that the
active application does not depend on them. The production build is the final
dependency check.

## Excluded Legacy Scope

Do not migrate systems that belong to the original broad Shiori product and are
not part of the current review workflow:

- Google OAuth, GitHub OAuth, and custom authentication callbacks.
- Google Classroom, Gmail, and Calendar integrations.
- Stripe checkout, subscriptions, and webhook handling.
- Express server routes and Supabase server administration.
- Chrome extension and MCP server.
- Growth, launch, funding, issue-template, and upstream marketing material.
- Hidden pages for assignments, grades, analytics, habits, focus mode,
  leaderboard, syllabus import, profile, settings, and Pro billing.

This exclusion prevents previously identified OAuth and unauthenticated API
risks from being copied into the monorepo.

## Routing And Deployment

The application will be deployed at:

`https://jiaxuan-tao.github.io/vibe-coding-lab/ai-review-workspace/`

Configure Vite with the `/vibe-coding-lab/ai-review-workspace/` base path. Use a
hash-based client router so direct navigation and refresh work under GitHub
Pages without a server-side rewrite.

Extend `.github/workflows/pages.yml` to:

1. Install dependencies from `ai-review-workspace/package-lock.json`.
2. Run the project's automated checks and production build.
3. Copy the generated `dist/` directory into
   `_site/ai-review-workspace/`.
4. Copy a verified project screenshot into the shared `_site/assets/` area for
   the showcase page.

No serverless function, backend, account, or paid service is required for the
published demo.

## Repository Integration

Update only the integration surfaces required by the Vibe Coding Lab rules:

- Root `README.md`: add the project, a concise description, and the live link.
- `projects/README.md`: add the new project directory entry.
- `site/index.html`: add a showcase item following the current visual pattern.
- `.github/workflows/pages.yml`: build and publish the application.

Do not restructure or rewrite unrelated projects.

## Project README

Write `ai-review-workspace/README.md` using the established project format:

1. Product title and concise positioning.
2. Live demo and verified screenshot.
3. The user problem and focused review loop.
4. Usage steps and core behavior.
5. AI behavior, local fallback, and privacy boundaries.
6. Local development, tests, and production build.
7. Technical implementation and project structure.
8. Capability boundaries.
9. Vibe Coding development note.
10. Open-source origin and license.

The README must describe the implemented product rather than the original
Shiori feature set. It must not retain upstream badges, upstream demo links, or
claims about disabled features.

## Attribution And License

Preserve the upstream MIT license. Add `THIRD_PARTY_NOTICES.md` that identifies
`kaorii-ako/Shiori-v1`, links to the upstream repository, states that the
current project is a focused Chinese adaptation, and summarizes the major
changes.

Do not present the codebase as wholly original. The project README must name
the upstream foundation and distinguish reused architecture from the product,
workflow, copy, interface, and deployment changes made in this repository.

## Validation

Before publishing:

- Install dependencies from the committed lock file.
- Run the available automated tests.
- Run the production Vite build with the GitHub Pages base path.
- Scan active imports to confirm excluded legacy modules are not required.
- Check all local Markdown links in the project and repository indexes.
- Verify the app with Playwright at desktop and mobile viewports.
- Verify the full review loop and browser refresh under the nested Pages path.
- Capture a screenshot from the migrated build, not from the old Shiori demo.
- Confirm no standalone `---` appears at the start of the new README.
- Confirm no secrets, tokens, `.env` files, or build artifacts are committed.

After the commit is pushed and GitHub Pages succeeds, verify the public URL.
Only then change `jiaxuan-tao/ai-review-workspace` to private. Changing
repository visibility does not delete the repository or its history. The old
Vercel deployment is outside this migration and must not be deleted without a
separate explicit decision.

## Success Criteria

- `vibe-coding-lab` contains a self-contained `ai-review-workspace/` project.
- Its README matches the repository's documentation style and accurately
  credits Shiori.
- The application builds and works from the nested GitHub Pages URL.
- The root README, project index, showcase page, and Pages workflow include the
  project.
- No legacy OAuth, payment, Google integration, backend, extension, or MCP code
  is migrated.
- The standalone `ai-review-workspace` repository is private only after the
  migrated version is publicly verified.
