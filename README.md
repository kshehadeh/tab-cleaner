# Tab Cleaner Extension

A beautiful browser extension to clean inactive tabs with a modern UI built using React and shadcn/ui components.

## Features

- Clean tabs that have been inactive for a chosen amount of time
- Beautiful, modern UI with shadcn/ui components
- Dark/light theme support
- Real-time preview of tabs to be closed
- Responsive design optimized for browser extension popups

## Development

### Prerequisites

- Node.js 16+
- npm

### Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# For development
npm run dev
```

### Building

The extension is built using:

- **React 18** - Modern React with hooks
- **TypeScript** - Type safety and better development experience  
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible UI components
- **Radix UI** - Unstyled, accessible UI primitives
- **Lucide React** - Beautiful icons

### Project Structure

```
src/
├── components/
│   ├── ui/          # shadcn/ui components (Button, Card, Select, etc.)
│   └── TabCleaner.tsx  # Main extension component
├── lib/
│   ├── utils.ts     # Utility functions
│   └── tab-utils.ts # Chrome tabs API utilities
├── App.tsx          # Root App component
├── main.tsx         # React entry point
├── globals.css      # Global styles with Tailwind
└── popup.html       # Extension popup HTML template
```

### Installation

1. Build the extension: `npm run build`
2. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this project folder

The extension will use the built files in the `dist/` directory.
