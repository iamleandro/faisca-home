# Cutover checklist

Going live with the new faisca.gg. **Every step here is yours** — they are
GitHub and DNS settings I have no access to and have not touched.

Do not start until you have reviewed the site and are happy with it.

---

## What is live right now

Confirmed from the GitHub API on 2026-09-04, not assumed:

| | |
|---|---|
| Repo serving faisca.gg | `iamleandro/faisca-landing` |
| Branch and path | `main`, `/` |
| Pages source | **Deploy from a branch** (`build_type: legacy`) |
| Custom domain | **`faisca.gg`** — the apex |
| HTTPS | enforced; certificate covers `faisca.gg` and `www.faisca.gg`, expires 2026-11-24 |
| This repo (`faisca-home`) | **no Pages site at all** |

DNS today, and it already supports both hosts, so **no DNS change is needed**:

```
faisca.gg.        A      185.199.108.153  .109.153  .110.153  .111.153
www.faisca.gg.    CNAME  iamleandro.github.io.
```

## What changes

The new site claims **`www.faisca.gg`** (`public/CNAME`), per the brief. The
apex will 301 to `www`. That flips the canonical host from what is live today
— worth knowing before you start, though it costs nothing in DNS.

The old site keeps running untouched until step 4. Nothing before that point
affects it.

---

## Before you start

- [ ] Review the branch: `git checkout redesign && npm ci && npm run build && npm run preview`
- [ ] Read `FIDELITY.md` — there are **four deviations and three accessibility
      findings** waiting on a decision from you or the designer. None blocks
      cutover; all are cheap to change now and awkward later.
- [ ] Decide the two open questions in `FIDELITY.md` A1 and A2 (contrast and
      heading order). Both are one-line changes.
- [ ] Merge `redesign` into `main` **in this repo**. That is safe: `faisca-home`
      serves nothing.

## 1. Point Pages at this repo

- [ ] `iamleandro/faisca-home` → **Settings → Pages**
- [ ] **Source: GitHub Actions** (not "Deploy from a branch")
- [ ] Leave **Custom domain empty for now.** Two Pages sites cannot hold the
      same domain, and `faisca-landing` still has the apex.

## 2. First deploy, on the github.io URL

- [ ] **Actions → Deploy to GitHub Pages → Run workflow**, branch `main`
- [ ] Wait for it to go green
- [ ] Open `https://iamleandro.github.io/faisca-home/` and check the site
      renders. **Sub-path assets will 404 here** — the build is configured for
      a domain root, not a sub-path. That is expected. You are only confirming
      the workflow runs and publishes.

## 3. Release the domain from the old site

- [ ] `iamleandro/faisca-landing` → **Settings → Pages** → clear the custom
      domain field and save
- [ ] The temp site stays reachable at `iamleandro.github.io/faisca-landing/`.
      **Do not delete the repo or the branch** — it is the rollback.

## 4. Attach the domain to the new site

- [ ] `iamleandro/faisca-home` → **Settings → Pages** → Custom domain:
      `www.faisca.gg` → Save
- [ ] Wait for the DNS check to pass (usually under a minute; the records are
      already correct)
- [ ] Tick **Enforce HTTPS**. It may be greyed out for a few minutes while the
      certificate is reissued — wait, do not skip it.
- [ ] Re-run the deploy workflow once so the site publishes under the domain

## 5. Verify

Check every one of these, on a phone as well as a laptop:

- [ ] `https://www.faisca.gg/` — loads, Signal Lock plays
- [ ] `https://faisca.gg/` — redirects to `www`
- [ ] `https://www.faisca.gg/support/dead-air/` — **the preserved URL**
- [ ] `https://www.faisca.gg/privacy/dead-air/` — **the preserved URL**
- [ ] `https://www.faisca.gg/games/dead-air/`, `/about/`, `/contact/`
- [ ] A URL that does not exist renders the 404 page
- [ ] `https://www.faisca.gg/sitemap-index.xml` and `/robots.txt`
- [ ] The padlock is green and HTTPS is enforced
- [ ] Play a full 60-second round on a real phone, portrait and landscape

If anything is wrong, go to **Rollback** — do not try to fix it live.

## 6. Only then, switch the trigger to push

Once the site has been up and correct for a day or so:

- [ ] Edit `.github/workflows/deploy.yml`:

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
```

- [ ] Commit, push, and confirm the resulting run deploys cleanly

Until you do this, **every deploy is a manual button press**, which is the
right default while the site is new.

---

## Rollback

If step 5 turns up something you cannot live with:

1. `iamleandro/faisca-home` → Settings → Pages → **clear the custom domain**
2. `iamleandro/faisca-landing` → Settings → Pages → **Custom domain:
   `faisca.gg`** → Save → tick **Enforce HTTPS**
3. Confirm `https://faisca.gg/` is serving the old page again

DNS never changed, so this is a settings flip on both repos and propagates as
fast as GitHub reissues the certificate. Nothing about the old site was
modified at any point in this checklist — its repo, branch and files are
exactly as they were.

**Do not delete `faisca-landing` until the new site has been live and healthy
for a good while.**
