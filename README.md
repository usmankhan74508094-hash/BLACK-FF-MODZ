# BLACK FF MODZ — Website starter

This is a deployable Node.js website with:
- Your supplied logo
- Public APK listing and download links
- Admin-only upload and delete controls
- Server-side session authentication (not a front-end-only password)
- APK extension check, 300 MB upload limit, login rate limit, and basic security headers

## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Set a unique `ADMIN_USERNAME`, a long unique `ADMIN_PASSWORD`, and a long random `SESSION_SECRET`.
4. In this folder, run `npm install`, then `npm start`.
5. Open `http://localhost:3000`.

## Publish online
Deploy to a Node.js host that supports persistent disk storage and HTTPS. Add the three environment variables from `.env.example` in the host's private environment settings. Do not upload `.env` to GitHub or share your admin password. Set `NODE_ENV=production` behind HTTPS.

Important hosting notes:
- This starter saves APKs and metadata on local disk. Some serverless/free hosts erase local files or use ephemeral storage; use a host with persistent storage or replace the upload store with object storage.
- For production, configure a persistent session store (the default Express MemoryStore is only suitable for a starter/small local test).
- Upload only APKs you own or are authorized to distribute, and avoid hosting malware or apps that violate platform/game terms.
- Visitors can download public APKs; only authenticated admin sessions can upload or delete. Anyone who obtains the admin password can act as admin, so use a strong secret and enable HTTPS.
- A website alone cannot guarantee that only you will ever access the admin area; secure credentials and hosting settings are essential.
