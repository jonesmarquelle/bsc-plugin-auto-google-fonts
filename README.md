# Auto Google Fonts

A BrighterScript plugin that makes it easy to use Google Fonts in your Roku SceneGraph applications. Simply reference any Google Font by name, and the plugin automatically downloads and bundles it with your app.

## Features

- **Simple Syntax**: Use `googleFont:FontName` to reference any Google Font
- **Automatic Downloads**: Fonts are automatically downloaded from Google Fonts GitHub repository
- **Smart Selection**: Automatically chooses the best font variant (prioritizes variable fonts, then regular weights)
- **Build-Time Processing**: Fonts are downloaded and bundled during the build process
- **XML & BrightScript Support**: Works in both SceneGraph XML components and BrightScript code
- **Caching**: Downloaded fonts are cached to speed up subsequent builds

## Installation

```bash
npm install google-fonts-roku
```

## Usage

### 1. Configure BrighterScript

Add the plugin to your `bsconfig.json`:

```json
{
  "plugins": [
    "google-fonts-roku"
  ]
}
```

### 2. Use Google Fonts in Your App

#### In XML Components

```xml
<Label 
  text="Hello, World!" 
  font="googleFont:Roboto" 
  fontSize="48" 
/>
```

#### In BrightScript Code

```brightscript
sub init()
    label = CreateObject("roSGNode", "Label")
    label.text = "Hello, World!"
    label.font = "googleFont:Roboto"
    label.fontSize = 48
    m.top.appendChild(label)
end sub
```

### 3. Build Your Project

When you build your project with BrighterScript, the plugin will:

1. Scan your code for `googleFont:` references
2. Download the specified fonts from the Google Fonts repository
3. Replace `googleFont:FontName` with `pkg:/fonts/FontName.ttf`
4. Copy the fonts to your staging directory

## Supported Font Names

You can use any font from [Google Fonts](https://fonts.google.com/). Use the exact font family name as shown on the Google Fonts website.

Examples:
- `googleFont:Roboto`
- `googleFont:Open Sans`
- `googleFont:Lato`
- `googleFont:Montserrat`
- `googleFont:Playfair Display`

## How It Works

The plugin operates during the BrighterScript build process:

1. **Scanning Phase** (`beforePrepublish`): Scans all `.brs` and `.xml` files for `googleFont:` references
2. **Download Phase**: Downloads fonts from the [Google Fonts GitHub repository](https://github.com/google/fonts) to your project's `fonts/` directory
3. **Transform Phase** (`beforeFileTranspile` / `afterFileTranspile`): Replaces `googleFont:FontName` with `pkg:/fonts/FontName.ttf` in your code
4. **Copy Phase** (`afterPrepublish`): Copies all downloaded fonts to the staging directory

### Font Selection Logic

When multiple font files are available for a font family, the plugin automatically selects the best one using this priority:

1. Variable fonts with `[wght]` axis (most flexible)
2. Other variable fonts
3. Regular static fonts
4. Any available font file

## Requirements

- [BrighterScript](https://github.com/rokucommunity/brighterscript) ^0.69.4
- Node.js (with `curl` available in PATH)

## Project Structure

```
your-roku-project/
├── bsconfig.json        # BrighterScript configuration
├── source/              # Your BrightScript source files
├── components/          # Your SceneGraph XML components
├── fonts/               # Downloaded fonts (auto-generated)
└── out/
    └── staging/
        └── fonts/       # Fonts copied to staging (auto-generated)
```

## Demo

A working demo is included in the `demo/` directory. To run it:

```bash
npm run build
# Deploy the demo/ directory to your Roku device
```

The demo shows how to use both system fonts and Google Fonts side by side.

## Configuration

The plugin uses these directories (relative to your `rootDir` in `bsconfig.json`):

- **Fonts Directory**: `fonts/` - where downloaded fonts are stored
- **Staging Directory**: Specified by `stagingDir` in your BrighterScript config

## Troubleshooting

### Font Not Found

If a font fails to download, check:

1. The font name matches exactly with [Google Fonts](https://fonts.google.com/)
2. The font is in the `ofl/`, `apache/`, or `ufl/` directories of the Google Fonts repository
3. Your internet connection is working
4. `curl` is installed and available

### Font Not Loading on Roku

Ensure:

1. The font file was copied to `pkg:/fonts/` in your deployed app
2. The font format is `.ttf` (Roku supports TrueType fonts)
3. The font file isn't corrupted (check file size)

## Development

To work on this plugin:

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes
npm run watch
```

## Credits

This plugin downloads fonts from the [Google Fonts GitHub repository](https://github.com/google/fonts), which contains fonts licensed under open source licenses (OFL, Apache, UFL).

