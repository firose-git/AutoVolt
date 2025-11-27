# 🎤 Microphone Permission Guide

## How to Enable Microphone Access in Your Browser

### For Microsoft Edge / Chrome:

#### Method 1: During First Use (Recommended)
1. Click the floating mic button (blue circular button)
2. Browser will show a popup: **"http://172.16.3.171:5173 wants to use your microphone"**
3. Click **"Allow"**
4. Done! You can now use voice commands

#### Method 2: Manual Settings
1. Look at the address bar (top of browser)
2. Click the **🔒 lock icon** or **camera/mic icon** next to the URL
3. Find **"Microphone"** in the dropdown
4. Select **"Allow"**
5. Refresh the page (F5)

#### Method 3: Browser Settings
1. Click the **⋮** (three dots) in top-right corner
2. Go to **Settings**
3. Search for **"Site permissions"** or **"Microphone"**
4. Find your site: `http://172.16.3.171:5173`
5. Set Microphone to **"Allow"**
6. Refresh the page

### For Firefox:

1. Click the mic button
2. Browser popup appears: **"Share your microphone?"**
3. Click **"Allow"**
4. Check **"Remember this decision"** (optional)
5. Done!

Or manually:
1. Click the **🔒 lock icon** in address bar
2. Click **"Connection secure"** → **"More information"**
3. Go to **"Permissions"** tab
4. Find **"Use the Microphone"**
5. Uncheck **"Use Default"**
6. Select **"Allow"**
7. Refresh the page

### For Safari:

1. Safari menu → **Preferences** (or press Cmd+,)
2. Go to **"Websites"** tab
3. Click **"Microphone"** in left sidebar
4. Find your site: `http://172.16.3.171:5173`
5. Select **"Allow"**
6. Refresh the page

---

## Troubleshooting

### Error: "not-allowed"
**This means:** Browser blocked microphone access

**Solutions:**
1. **Hard refresh the page:** Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear site permissions:** 
   - Edge/Chrome: Settings → Privacy → Site Settings → Clear permissions for `172.16.3.171`
   - Then reload and click "Allow" when prompted
3. **Check system microphone:**
   - Windows: Settings → Privacy → Microphone → Make sure it's ON
   - Make sure Edge/Chrome has permission in system settings

### No Microphone Popup Appears
1. **Check if microphone is connected** (if using external mic)
2. **Test microphone:** Open Windows Sound Settings → Input → Test your microphone
3. **Try another browser** to see if it's browser-specific
4. **Check antivirus/security software** - it might be blocking access

### Button is Disabled (Grayed Out)
This means you're not authenticated yet. Wait a few seconds for automatic login.

---

## Quick Test

After enabling permissions:

1. Look for the **blue mic button** (bottom-right corner)
2. **Click it** → Should turn **red and pulse**
3. **Say:** "Turn on classroom 1 light 1"
4. Should hear a **beep** and see toast notification
5. **Done!** ✅

---

## Important Notes

- ⚠️ **HTTPS Required:** Some browsers require HTTPS for microphone access. Your setup uses HTTP (local IP), which works for Chrome/Edge but might not work for all browsers.
- 🔒 **First-time only:** You only need to allow once. Browser remembers your choice.
- 🔄 **After clearing cache:** If you clear browser data, you'll need to allow again.
- 📱 **Mobile browsers:** Voice recognition may not work on all mobile browsers (iOS Safari has limited support).

---

## Supported Browsers

✅ **Chrome** (desktop) - Full support  
✅ **Edge** (desktop) - Full support  
✅ **Opera** (desktop) - Full support  
⚠️ **Firefox** (desktop) - Limited support (may need flags enabled)  
⚠️ **Safari** (desktop) - Limited support  
❌ **iOS Safari** - Not supported (Apple restriction)  
✅ **Chrome Android** - Full support

---

## Best Practice

**For first-time users:**
1. Login to the system
2. Wait 2-3 seconds for authentication
3. Click the mic button
4. Click "Allow" in browser popup
5. Start using voice commands!

That's it! 🎤🎉
