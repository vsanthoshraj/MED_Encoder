# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript app entry and features. Key files include `src/main.tsx`, `src/App.tsx`, and shared utilities in `src/lib/`.
- `src/assets/` and `public/` contain static assets; prefer `src/assets/` for files imported by code and `public/` for direct URL access.
- `android/` is the Capacitor Android project. Treat it as generated output unless you are making native changes intentionally.
- `dist/` is the build output (ignored by ESLint) and should not be committed.
- Tooling lives in `vite.config.ts`, `tsconfig*.json`, and `capacitor.config.ts`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server with HMR for local development.
- `npm run build`: type-check with `tsc -b` and produce a production build in `dist/`.
- `npm run preview`: serve the production build locally for validation.
- `npm run lint`: run ESLint across the codebase.

## Coding Style & Naming Conventions
- Language: TypeScript with React function components.
- Naming: components in `PascalCase` (e.g., `PatientCard.tsx`), hooks in `useCamelCase`, and files that export a single component should match the component name.
- Formatting: no formatter is configured; follow the existing spacing and import style in nearby files.
- Linting: adhere to `eslint.config.js` rules; fix lint warnings before submitting.

## Testing Guidelines
- No automated test runner is configured yet. If you add tests, also add a script to `package.json` and document how to run it.
- Prefer colocated tests with a `*.test.tsx` or `*.test.ts` suffix once a framework is introduced.

## Commit & Pull Request Guidelines
- Git history is minimal and does not establish a strict convention. Use concise, imperative commit messages (e.g., "Add PDF export flow").
- PRs should include:
- A short summary of the change and rationale.
- Steps to verify (commands or manual checks).
- Screenshots or screen recordings for UI changes.
- Links to relevant issues or tickets if available.

## Configuration & Security Notes
- Review `capacitor.config.ts` before changing app identifiers or native config.
- Avoid committing secrets; use environment-specific configs where applicable.
