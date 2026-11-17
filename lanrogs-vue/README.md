# Lanrogs (Vue version)

Language-learning site: flashcards, quizzes, accounts (Supabase), profile, admin dashboard,
contact form, English / Russian / Uzbek, installable on phones (PWA).

Built with Vue 3 + Vue Router + Vite. Hosted on Vercel.

## Run it on your computer

```bash
npm install
cp .env.example .env.local     # then open .env.local and fill it in
npm run dev                    # http://localhost:5173
```

Build like the server does:

```bash
npm run build
npm run preview
```

## Settings (environment variables)

Copy `.env.example` to `.env.local` (computer) or add them in Vercel -> Settings -> Environment Variables.
After changing them on Vercel, press Redeploy (they are put into the site when it is built).

| Name | What it is |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** key (never the service_role key) |
| `VITE_CONTACT_ENDPOINT` | FormSubmit random-ID address, so messages reach your email without showing it |
| `VITE_GITHUB_URL` | Optional: your GitHub link shown on the Contact page |
| `VITE_SITE_URL` | Your real address, e.g. `https://lanrogs.com` (for Google). Optional on Vercel |

The site also works with nothing filled in (data stays in the browser, no accounts, no contact).

## Folders

- `src/pages/` the 9 screens, `src/components/` shared parts, `src/lib/` data, translations, helpers
- `src/router.js` addresses, login guard, page titles and "do not index" for private pages
- `public/` icons, logo, service worker, web-app manifest
- `vercel.json` security headers + "open index.html for every address"
- `vite.config.js` also creates `sitemap.xml` and `robots.txt` when building
- `supabase.sql` run once in Supabase (SQL Editor)

## Security

- Only the public anon key is used. Row-level security keeps every user's data private.
- Admins can see the account list and messages, never other people's flashcards or quizzes.
- Strict security headers in `vercel.json`: scripts only from your own site, no framing, no sniffing, HSTS.
- Pictures are checked (jpeg/png/webp only) before they are shown.
- Your email address is not in the code. Messages go through the private FormSubmit ID.
