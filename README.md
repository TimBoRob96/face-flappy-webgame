# Face Flappy

A Flappy Bird-style web game where the bird uses your uploaded face image.

## Run locally (no Docker)

Open `index.html` directly, or run a static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Run locally with Docker

```bash
docker build -t face-flappy .
docker run --rm -p 8080:8080 face-flappy
```

Then open `http://localhost:8080`.

## Deploy to Fly.io

Prereqs:
- GitHub repo for this project
- `flyctl` installed and authenticated (`fly auth login`)

Use these commands from this folder:

```bash
git init
git add .
git commit -m "Initial Face Flappy game"
# create a GitHub repo, then set origin:
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main

# Create Fly app if needed (or skip if app already exists):
fly apps create face-flappy-webgame

# Deploy
fly launch --no-deploy
fly deploy
```

## Auto-Deploy from GitHub Actions

This repo includes `.github/workflows/fly-deploy.yml` to deploy automatically on every push to `main`.

One-time GitHub setup:

1. In your Fly account, create/reuse an API token:

```bash
fly tokens create deploy
```

2. In GitHub, open your repo: `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`.
3. Add secret name `FLY_API_TOKEN` with the token value from step 1.

After that, each push to `main` triggers deployment automatically.

After deploy, Fly will print your URL.

### Notes
- If `face-flappy-webgame` is taken, change `app` in `fly.toml` and use that name in `fly apps create`.
- You can redeploy anytime with:

```bash
fly deploy
```
