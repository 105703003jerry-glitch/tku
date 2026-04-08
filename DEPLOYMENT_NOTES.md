# TKCLCLAB Deployment Notes

## Current Status

The project is ready to be deployed as a static site on Vercel.

Prepared files:

- `index.html`
- `main.js`
- `style.css`
- `js/siteData.js`
- `js/i18n.js`
- `vercel.json`

## Why deployment is blocked in the current terminal

This environment currently does not have:

- `node`
- `npm`
- `vercel` CLI
- a connected Vercel account token

Because of that, the final publish step cannot be completed from this terminal alone without installing tooling and authenticating against Vercel.

## Fastest manual Vercel path

1. Upload this folder to a GitHub repo or open it locally on a machine with Node.js.
2. Run:

```bash
npm i -g vercel
vercel
```

3. Choose the project root as this folder.
4. Accept the default static deploy settings.

## Alternative token-based CLI path

If a `VERCEL_TOKEN` is available, deployment can be automated by CLI without browser login.

Typical command:

```bash
vercel deploy --prod --token "$VERCEL_TOKEN"
```

## Expected Result

Once deployed, Vercel will provide:

- one preview or production URL
- optional custom domain mapping later
