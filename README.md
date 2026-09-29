# Minecraft Chest Planner

A version-aware Minecraft storage organizer for assigning item types to chest sections by class and subclass. It deliberately does not use item quantities.

## Local development

```powershell
npm install
npm run dev
```

The app loads the public Minecraft version manifest from Mojang and item data from `minecraft-data`. If the latest game release is newer than the available `minecraft-data` files, the planner reports that gap and uses the newest supported release.

## WIP deployment

The repository currently uses `develop` as the work-in-progress integration branch. The production `main` branch is intentionally not being used yet.

The repository includes GitHub Actions for a GitHub Pages preview deployment from `develop`. To enable it:

1. Push this project to the `develop` branch.
2. In the repository settings, open **Pages** and choose **GitHub Actions** as the source.
3. Push to `develop` or run **Deploy planner to GitHub Pages** manually.

The site will be available at:

```text
https://<github-user>.github.io/<repository-name>/
```

The Vite configuration detects the repository name automatically in Actions, so project-page asset paths work without a hardcoded repository name.

## Data coverage

The scheduled **Check Minecraft data coverage** workflow compares Mojang's latest public release with the latest release present in `minecraft-data`. This keeps the source gap visible in the Actions summary while the upstream generator and data repository catch up.

The manual **Generate Minecraft data** workflow follows the upstream generation process. Enter a Minecraft version under **Actions → Generate Minecraft data → Run workflow** to run the Java/Gradle generator and download its output as an artifact. This requires that `minecraft-data-generator` already supports that version; new releases may need upstream generator code changes before generation can succeed.

The scheduled **Auto-update Minecraft data** workflow runs daily and whenever `develop` changes. It checks Mojang's latest public release, runs the upstream generator when that version is supported, commits generated `items.json` data into `public/minecraft-data`, and pushes the update back to `develop`. The app prefers these generated files and falls back to the public `minecraft-data` repository when they are not present.
