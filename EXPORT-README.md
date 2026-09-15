# Mind Mirror 2.0 Source Export

This archive contains the frontend and backend source code for the Mind Mirror 2.0 website.

## Included

- Mind Mirror frontend UI in `client/index.html`, `client/public/script.js`, and `client/public/style.css`
- Hosted Express/tRPC backend under `server/`
- Managed SQL schema and migration under `drizzle/`
- API tests under `server/appApi.test.ts`

## Setup

1. Run `pnpm install`.
2. Configure server environment variables, including `DATABASE_URL` and `JWT_SECRET`.
3. Apply the reviewed database migration using the project migration workflow.
4. Run `pnpm dev` for development, or `pnpm build && pnpm start` for production.

## Verification

The project was verified with TypeScript checks, Vitest tests, frontend JavaScript syntax checks, a production build, and hosted API health/validation/protected-route checks.

## Security

This export excludes `.env` files, database passwords, service-account keys, `node_modules`, build output, and git metadata. Never commit production secrets to source control.
