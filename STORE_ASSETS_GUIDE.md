# Chrome Web Store Assets Guide

## Required Assets for Store Submission

### 1. Extension Icons ✅ (Already Present)

Your extension already has all required icons:

- `images/icon-16.png` (16x16 pixels)
- `images/icon-32.png` (32x32 pixels)
- `images/icon-48.png` (48x48 pixels)
- `images/icon-128.png` (128x128 pixels)

### 2. Screenshots (Required: 1-5 images)

Create screenshots showing your extension in action:

**Recommended Screenshots:**

1. **Main Interface** - Show the popup with tab list and controls
2. **Settings View** - Show time threshold selection
3. **Before/After** - Show tabs before and after cleanup
4. **Dark Theme** - Show extension in dark mode
5. **Different States** - Show when no tabs need cleaning

**Screenshot Requirements:**

- Dimensions: 1280x800 or 640x400 pixels
- Format: PNG or JPEG
- Show actual extension functionality
- Use clear, readable text
- Avoid cluttered backgrounds

**How to Create Screenshots:**

1. Build your extension: `npm run build:prod`
2. Load it in Chrome (chrome://extensions/)
3. Open the popup
4. Take screenshots using browser dev tools or screenshot tools
5. Edit images to highlight key features

### 3. Promotional Images (Optional but Recommended)

**Small Promotional Tile:**

- Dimensions: 440x280 pixels
- Shows key features or branding
- Used in store search results

**Large Promotional Tile:**

- Dimensions: 920x680 pixels  
- More detailed feature showcase
- Used on extension detail page

**Marquee Promotional Tile:**

- Dimensions: 1400x560 pixels
- Used for featured extensions
- High-quality, eye-catching design

### 4. Store Listing Images

**Logo/Brand Image:**

- Use your existing `tab-cleaner-logo-512.png`
- Can be used as promotional material

## Asset Creation Tips

### Screenshot Best Practices

- Use a clean browser window
- Show realistic tab scenarios
- Highlight the extension's value proposition
- Use consistent styling and branding
- Add subtle annotations if helpful

### Promotional Image Tips

- Use your brand colors
- Include key feature icons
- Keep text minimal and readable
- Make it visually appealing
- Follow Chrome Web Store design guidelines

## Tools for Creating Assets

### Screenshot Tools

- Chrome DevTools (F12 → Screenshots)
- Browser extensions (Full Page Screen Capture)
- macOS: Cmd+Shift+4
- Windows: Snipping Tool

### Image Editing

- Canva (templates available)
- Figma (free design tool)
- GIMP (free alternative to Photoshop)
- Online tools like remove.bg

## Asset Checklist

### Before Submission

- [ ] All required icons present and properly sized
- [ ] 1-5 screenshots showing key functionality
- [ ] Screenshots are clear and professional
- [ ] Promotional images (if created) follow guidelines
- [ ] All images are optimized for web
- [ ] Images accurately represent the extension

### File Organization

```
store-assets/
├── screenshots/
│   ├── main-interface.png
│   ├── settings-view.png
│   ├── before-after.png
│   └── dark-theme.png
├── promotional/
│   ├── small-tile.png (440x280)
│   ├── large-tile.png (920x680)
│   └── marquee-tile.png (1400x560)
└── icons/ (already in images/)
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-128.png
```

## Next Steps

1. **Create Screenshots**: Take 3-5 screenshots of your extension
2. **Design Promotional Images**: Create promotional tiles (optional)
3. **Optimize Images**: Compress images for web
4. **Upload to Store**: Use these assets when creating your store listing

## Resources

- [Chrome Web Store Asset Guidelines](https://developer.chrome.com/docs/webstore/images/)
- [Chrome Web Store Design Guidelines](https://developer.chrome.com/docs/webstore/branding/)
- [Extension Screenshot Examples](https://chrome.google.com/webstore/category/extensions)
