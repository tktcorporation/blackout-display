# Blackout Display

This repository contains a basic prototype of the **Blackout** application.
It uses **Tauri** with a React frontend. The application starts in fullscreen
and displays a black overlay. The opacity can be adjusted and the overlay can
be toggled with `Ctrl+Shift+B` or by double clicking the screen.

To run the application:

```bash
pnpm install
pnpm tauri dev
```

GitHub Actions will automatically build the application for macOS and Windows.
Build artifacts are uploaded for each platform when pushing to `main` or opening
a pull request.
