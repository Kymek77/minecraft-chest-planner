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

The app uses the public `minecraft-data` repository directly. If a future release is not available there yet, the coverage workflow will report the gap. `mcmeta` is the planned alternative source for future version coverage without adding a Java/Gradle generator to this project.
