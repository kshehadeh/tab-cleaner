# Chrome Extension Testing Checklist

## Pre-Submission Testing

### ✅ Basic Functionality
- [ ] Extension loads without errors
- [ ] Popup opens when clicking the extension icon
- [ ] All UI elements are visible and properly styled
- [ ] Extension works in both light and dark browser themes
- [ ] All buttons and interactive elements respond correctly

### ✅ Tab Management Features
- [ ] Extension correctly identifies inactive tabs
- [ ] Time threshold settings work (5min, 15min, 30min, 1hr, custom)
- [ ] Preview shows correct tabs to be closed
- [ ] "Clean Tabs" button successfully closes inactive tabs
- [ ] Extension handles edge cases (no inactive tabs, all tabs inactive)
- [ ] Settings are saved and restored between sessions

### ✅ Browser Compatibility
- [ ] Tested on Chrome (latest version)
- [ ] Tested on Chrome Beta
- [ ] Extension works with different numbers of tabs (1, 10, 50+)
- [ ] Works with different types of tabs (regular, pinned, incognito)

### ✅ Performance Testing
- [ ] Extension loads quickly (< 2 seconds)
- [ ] Popup opens instantly
- [ ] No memory leaks during extended use
- [ ] Minimal impact on browser performance

### ✅ Security Testing
- [ ] No console errors or warnings
- [ ] No network requests to external servers
- [ ] Content Security Policy is properly configured
- [ ] No sensitive data is logged or exposed

### ✅ User Experience
- [ ] UI is responsive and works on different screen sizes
- [ ] Text is readable and properly formatted
- [ ] Icons and images are crisp and properly sized
- [ ] Error messages are user-friendly
- [ ] Loading states are handled gracefully

### ✅ Edge Cases
- [ ] Extension works when browser is first opened
- [ ] Handles tabs that are being loaded
- [ ] Works with tabs that have alerts or prompts
- [ ] Gracefully handles permission changes
- [ ] Works after browser restart

## Store Submission Checklist

### ✅ Required Files
- [ ] manifest.json is valid and complete
- [ ] All required icons are present (16x16, 32x32, 48x48, 128x128)
- [ ] Privacy policy is accessible
- [ ] Extension package is properly zipped

### ✅ Store Listing
- [ ] Extension name is clear and descriptive
- [ ] Description accurately describes functionality
- [ ] Screenshots show key features
- [ ] Category is appropriate (Productivity)
- [ ] Keywords are relevant
- [ ] Privacy policy URL is provided

### ✅ Final Verification
- [ ] Extension works in a fresh Chrome profile
- [ ] No console errors in developer tools
- [ ] Extension follows Chrome Web Store policies
- [ ] All permissions are justified
- [ ] Extension is free of malware or suspicious code

## Testing Commands

```bash
# Build the extension
npm run build:prod

# Test locally
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the project folder

# Create package for store
npm run package
```

## Common Issues to Check

- [ ] Extension icon appears in toolbar
- [ ] Popup dimensions are appropriate (not too large/small)
- [ ] CSS styles are properly applied
- [ ] JavaScript errors don't break functionality
- [ ] Extension doesn't interfere with other extensions
- [ ] Works with Chrome's built-in tab management features
