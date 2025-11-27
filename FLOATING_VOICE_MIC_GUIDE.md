# 🎙️ **Floating Voice Microphone Button - User Guide**

## ✨ **New Feature: Draggable Voice Control!**

Instead of a fixed card, you now have a **floating, draggable microphone button** that you can move anywhere on your screen!

---

## 🎯 **Features:**

### **1. Compact Floating Button**
- **64x64px circular button** in bottom-right corner
- **Microphone icon** indicates voice control ready
- **Green dot** shows authentication status
- **Minimal space usage** - doesn't block your view

### **2. Draggable & Movable**
- **Click and drag** to move anywhere on screen
- **Stays within window bounds** - won't go off-screen
- **Position persists** while on the page
- **Non-intrusive** - place it where you want

### **3. Expandable Interface**
- **Click button** to expand full controls
- **320px panel** shows:
  - Voice transcript in real-time
  - Start/Stop listening button
  - Text-to-speech toggle
  - Authentication status
  - Command hints
- **Minimize button** to collapse back to compact mode

### **4. Visual Feedback**
- **Pulsing red** when listening
- **Spinning loader** when processing
- **Authentication indicator** (green dot)
- **Real-time transcript** display

---

## 🖱️ **How to Use:**

### **Compact Mode:**
1. See floating mic button in bottom-right corner
2. **Click once** to expand controls
3. **Green dot** = authenticated and ready

### **Expanded Mode:**
1. **Drag the panel** to move it anywhere
2. **Click "Speak"** to start voice command
3. **Say your command** (e.g., "turn on classroom 1 light 1")
4. See transcript in real-time
5. **Click "Stop"** to cancel listening
6. **Click minimize icon** (⊟) to collapse back

### **Quick Voice Command:**
1. **Click mic button** (compact mode)
2. Automatically expands and ready to listen
3. **Speak immediately**
4. Processes and executes command

---

## 🎨 **Button States:**

| State | Appearance | Meaning |
|-------|-----------|---------|
| **Normal** | Blue mic icon | Ready to use |
| **Authenticated** | Blue + green dot | Voice session active |
| **Listening** | Red + pulsing | Recording your voice |
| **Processing** | Spinning loader | Executing command |
| **Disabled** | Grayed out | Not authenticated |

---

## 📍 **Positioning:**

### **Default Position:**
- Bottom-right corner
- 100px from right edge
- 100px from bottom edge

### **Custom Position:**
1. **Expand the panel** (click button)
2. **Click and drag** the panel header
3. **Move anywhere** on screen
4. **Stays in bounds** - can't go off-screen

### **Position is Temporary:**
- Position resets on page refresh
- Each page has its own floating button
- Set preferred position each session

---

## 🎙️ **Voice Commands:**

Same commands work as before:

### **Turn On:**
- "Turn on classroom 1 light 1"
- "Switch on room 101 fan"
- "Enable projector"

### **Turn Off:**
- "Turn off classroom 1 light 1"
- "Switch off all lights"
- "Disable AC"

### **Status:**
- "Status of classroom 1"
- "Check room 101"

---

## 🔧 **Controls in Expanded View:**

### **Speak/Stop Button:**
- **Primary action** - start or stop listening
- Shows current state (Speak/Stop/Processing)
- Disabled when not authenticated

### **Volume Toggle:**
- **Speaker icon** (🔊) = TTS enabled
- **Muted icon** (🔇) = TTS disabled
- Click to toggle text-to-speech responses

### **Minimize Button:**
- **Dash icon** (⊟) = Collapse to compact mode
- Keeps voice session active
- Quick access to other controls

---

## ✅ **Advantages Over Card:**

| Feature | Card Layout | Floating Mic |
|---------|-------------|--------------|
| **Space Usage** | Large fixed area | Minimal 64x64px |
| **Positioning** | Fixed in page | Move anywhere |
| **Always Visible** | Must scroll to | Always on screen |
| **Distraction** | Takes up space | Compact & minimal |
| **Accessibility** | Fixed location | User-defined position |

---

## 🎯 **Best Practices:**

### **For Teachers:**
1. **Position in corner** for minimal obstruction
2. **Keep expanded** during active teaching
3. **Collapse when not needed**
4. **Quick access** - always visible

### **For Admins:**
1. **Position near controls** you frequently use
2. **Use compact mode** for monitoring
3. **Expand when needed** for specific commands

---

## 🚨 **Troubleshooting:**

### **Button not visible:**
- Check browser window size (button might be off-screen)
- Refresh the page to reset position
- Check if speech recognition is supported

### **Can't drag the button:**
- Make sure you're in **expanded mode**
- Click the button first to expand
- Then drag from the header area

### **Button stuck off-screen:**
- Refresh the page (resets to default position)
- Resize browser window

### **No green authentication dot:**
- Wait a moment for session creation
- Check that you're logged in
- Try clicking the button to trigger authentication

---

## 🎨 **Customization Options:**

### **Change Default Position:**
Edit `FloatingVoiceMic.tsx`:
```typescript
const [position, setPosition] = useState({
  x: window.innerWidth - 100,  // Change this
  y: window.innerHeight - 100  // Change this
});
```

### **Change Button Size:**
```typescript
// Compact size
width: '64px',  // Change this
height: '64px'  // Change this

// Expanded width
width: '320px'  // Change this
```

### **Change Colors:**
Button uses Tailwind classes - modify as needed:
- Normal: `bg-primary`
- Listening: `bg-red-500`
- Success: `bg-green-500`

---

## 💡 **Tips:**

1. **Double-click** compact button for quick voice command
2. **Position strategically** based on your workflow
3. **Keep expanded** if using voice frequently
4. **Minimize** when focusing on other tasks
5. **Green dot** = ready to use immediately

---

## ✨ **Future Enhancements:**

Possible improvements:
- [ ] Remember position across page reloads
- [ ] Multiple button positions (presets)
- [ ] Resize the expanded panel
- [ ] Keyboard shortcuts (e.g., Ctrl+M for mic)
- [ ] Voice command history in expanded view
- [ ] Customizable button appearance

---

Your floating voice mic is ready to use! **Try it now** - drag it around and see how convenient it is! 🎙️✨
