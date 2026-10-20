# CI / CD

`.github/workflows/ci-cd.yml` is the executable configuration.

- Pull requests and main pushes run tests, Astro checks, Worker type checks, production builds, SEO checks, and a Wrangler dry run without Cloudflare credentials.
- Only a validated main push or a manual run on main can deploy. Deployment requires repository variable `DEPLOY_ENABLED=true` and credentials in the `production` Environment. Without that variable, CI runs and deployment is explicitly skipped.
- Production deployment is serialized and does not cancel a deployment in progress. A queued run checks the latest main SHA before deploying, so rerunning an old commit does not roll production back.
- The deployed site is checked over HTTP after publication. A failed smoke check fails the run; it does not automatically roll back database or image data.

## One-time activation

1. Create a dedicated Cloudflare deployment API token, restricted to the target account and Worker where supported. Use the permissions needed to deploy this Worker's assets and existing D1, R2 and AI bindings; do not grant account administration or use a global API key. Do not copy a local Wrangler OAuth token into GitHub.
2. In GitHub Settings → Environments → `production`, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as Environment secrets. The environment's deployment branch policy allows only the main branch, not tags.
3. Set repository Actions variable `DEPLOY_ENABLED` to `true`, then run CI / CD on main and confirm both jobs succeed.

Secrets should be entered through GitHub's secret UI or `gh secret set --env production` using its masked prompt. Never put token values in source, command-line arguments, chat, or logs. Rotate/revoke the token when no longer needed.

## Security boundaries

- Default token permission is `contents: read`; checkout does not persist GitHub credentials.
- External Actions are pinned to complete commit SHAs. Dependabot proposes updates for review; updates are not automatically merged.
- Uses `pull_request`, never `pull_request_target` or a privileged `workflow_run`. PR jobs cannot access production secrets and never deploy.
- The deployment job uses a clean runner and does not consume PR artifacts or dependency caches. Cloudflare credentials are passed only to the deployment step, after dependency installation and build.
- Production Environment secrets are restricted to main. Anyone able to merge arbitrary code into main can still change the deployment workflow; repository write access and review remain part of the trust boundary.
- CI does not read the production Bot D1, generate reports, apply remote migrations, or modify R2 objects. Normal Worker runtime bindings remain unchanged.

Deployment setup reference: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
