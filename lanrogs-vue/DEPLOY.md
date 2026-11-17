# Publish: GitHub -> Vercel -> Google

Do the steps in order. Nothing here needs coding.

## 0. Before you start
- Free accounts at github.com, vercel.com, supabase.com.
- Node.js 18.18 or newer on your computer (only to test locally; Vercel has its own).

## 1. Supabase (accounts and database)
1. Supabase -> New project.
2. SQL Editor -> paste all of `supabase.sql` -> Run.
3. Project Settings -> API: copy **Project URL** and the **anon public** key. (Never copy service_role.)
4. Make yourself admin: sign up on your site first, then in SQL Editor run
   `update public.profiles set role='admin' where id = (select id from auth.users where email='YOUR-EMAIL');`
   (type your own email there; it stays in Supabase only).

## 2. Contact form to your email (FormSubmit)
1. Open https://formsubmit.co and send one test form to your email once; confirm the activation email.
2. Copy the **random ID address** they give: `https://formsubmit.co/ajax/xxxxxxxxxxxxxxxx`.
3. That whole address is `VITE_CONTACT_ENDPOINT`. Do not put your plain email anywhere.

## 3. GitHub
1. github.com -> New repository (name: `lanrogs`, Public or Private).
2. On your computer, in this folder:
   ```bash
   git init
   git add .
   git commit -m "Lanrogs"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/lanrogs.git
   git push -u origin main
   ```
   `.env.local` is ignored by git, so your keys are not uploaded.

## 4. Vercel
1. vercel.com -> Add New -> Project -> Import your GitHub repo.
2. Framework Preset: **Vite** (detected automatically). Build command `npm run build`, output folder `dist`. Leave them alone.
3. Environment Variables: add the 5 names from README.md (at least the Supabase two and the contact one).
4. Deploy. You get `https://something.vercel.app`.
5. Custom domain: Project -> Settings -> Domains -> add it, follow the DNS steps. Then set
   `VITE_SITE_URL` to `https://your-domain` and Redeploy.

## 5. Tell Supabase your address
Supabase -> Authentication -> URL Configuration:
- Site URL: your final address (`https://your-domain`)
- Redirect URLs: add `https://your-domain/login` (and the `.vercel.app` one if you use it)

Without this, confirmation and password-reset emails send people to the wrong place.

## 6. Google
1. https://search.google.com/search-console -> Add property -> your address -> verify (DNS record is easiest).
2. Sitemaps -> add `sitemap.xml`.
3. URL inspection -> your home page -> Request indexing.

## 7. Final test (2 minutes, on your phone)
- Home page opens, language switch works.
- Create account, add a flashcard, refresh: still there.
- Contact form: you receive the email.
- `/admin` opens for you only.
- Add to Home Screen works.

## Notes
- No `package-lock.json` is included; `npm install` creates it. Commit it afterward.
- If your Supabase URL is a custom domain (not `*.supabase.co`), add it to `connect-src` in `vercel.json`.
- Environment variables are baked in at build time: after changing one on Vercel, press Redeploy.
- Google reads this site after running its JavaScript (normal for Vue sites). Private pages are marked noindex on purpose.
- If a build error appears, copy the message and send it to me.
