# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Installation

### Windows
1. Download `TaskArena_2.0.0_x64-setup.exe` from the latest release
2. Run the installer - no admin rights needed, installs to user folder
3. Launch TaskArena from the Start Menu or Desktop shortcut
4. On first run, a setup wizard will guide you through:
   - Setting your name
   - Getting a free Groq API key (takes 30 seconds)
   - Creating your first course and task

### macOS
1. Download `TaskArena_2.0.0_x64.dmg`
2. Open the DMG and drag TaskArena to Applications
3. Right-click -> Open on first launch (macOS security)
4. Follow the setup wizard

### Getting a Free AI Key (Groq)
1. Go to https://console.groq.com/keys
2. Sign up (free - no credit card)
3. Create an API key
4. Paste it into TaskArena's setup wizard or Profile -> AI Settings

The free Groq tier is ~14,400 requests/day - more than enough for daily study use.

### Want to use a local model instead?
Install Ollama (https://ollama.com) and run:
  ollama pull qwen2.5:7b
Then in TaskArena: Profile -> AI Settings -> Ollama
