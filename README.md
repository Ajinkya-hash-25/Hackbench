# Hackbench

![GitHub release](https://img.shields.io/github/v/release/Ajinkya-hash-25/Hackbench)
![GitHub downloads](https://img.shields.io/github/downloads/Ajinkya-hash-25/Hackbench/total)
![License](https://img.shields.io/github/license/Ajinkya-hash-25/Hackbench)

Offline-first developer toolkit with 17+ privacy-focused utilities. No data leaves your machine.

Built with Electron, React, TypeScript & Tailwind CSS.

## Tools

| Category | Tools |
|----------|-------|
| Encoding | Base64 Encoder/Decoder, URL Encoder/Decoder, JWT Decoder |
| Formatting | JSON Formatter, SQL Formatter, Markdown Preview, HTML Viewer |
| Generators | UUID Generator, QR Code Generator, Data Generator, Hash Generator |
| Testing | API Tester, Regex Tester |
| Converters | Color Converter, Timestamp Converter |
| Utilities | Diff Checker, Cron Parser |

## Download

Grab the latest release for your platform from the [releases page](https://github.com/Ajinkya-hash-25/Hackbench/releases/latest):

| Platform | File |
|----------|------|
| Windows | `.exe` portable |
| macOS | `.dmg` / `.zip` |
| Linux | `.AppImage` / `.deb` |

> All releases: [github.com/Ajinkya-hash-25/Hackbench/releases](https://github.com/Ajinkya-hash-25/Hackbench/releases)

## Install from Source

```bash
git clone https://github.com/Ajinkya-hash-25/Hackbench.git
cd Hackbench
npm install
```

## Development

```bash
npm run electron:dev
```

## Build

```bash
# Windows (portable .exe)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (.AppImage + .deb)
npm run build:linux

# All platforms
npm run dist
```

Built artifacts are output to the `release/` directory.

## Tech Stack

- **Electron 28** - Desktop shell
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## License

MIT
