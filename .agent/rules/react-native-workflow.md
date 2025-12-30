---
trigger: always_on
---

# Antigravity Agent: Multi-Platform Development Rules

## 1. Context & Scope
This project is a high-performance fork of the Antigravity library, built with **React Native + Expo**. While the upstream source supports iOS, Android, and Tablets (including Landscape), this fork specifically targets the expansion into **tvOS** and **Android TV**. 

The primary mission is to implement **Focus Management** and **Remote Control Support** which are currently missing from the base architecture.

---

## 2. Platform Matrix
All development must be tested and verified across the following targets:
* **Mobile:** iOS, Android (Handset)
* **Tablet:** iPadOS, Android Tablet (Landscape Primary)
* **Television:** tvOS, Android TV (D-Pad Navigation)

---

## 3. Core Development Rules (C.R.A.F.T. Standards)

### A. Focus Management (The "TV First" Rule)
Since TVs rely on a "focused" state rather than a cursor or touch, all interactive elements must be focusable.
* **Action:** Use `Pressable` or `TouchableOpacity` with the `focusable={true}` prop.
* **Visual Feedback:** Every focused element must have a distinct `onFocus` style (e.g., scale increase, border highlight, or glow effect).
* **Logic:** Ensure the `nextFocusUp`, `nextFocusDown`, `nextFocusLeft`, and `nextFocusRight` props are utilized if the default focus engine fails to find the logical next neighbor.

### B. Input Handling (Remote & D-Pad)
* **D-Pad Support:** Navigation must be 100% functional using only 5-way D-pad inputs (Up, Down, Left, Right, Select).
* **Back Button:** On Android TV, the hardware "Back" button must be handled via `BackHandler` to prevent accidental app exits.
* **Menu Button:** On tvOS, ensure the Apple Remote "Menu" button behaves as expected (returning to the previous screen or exiting a modal).

### C. Layout & Orientation
* **Locking:** TV platforms are strictly **Landscape**. Ensure `app.json` reflects `orientation: "landscape"` for TV builds.
* **Safe Areas:** Use `react-native-safe-area-context`. TV screens often have "Overscan" where the edges of the UI are cut off. Use a minimum 5% margin (Safe Zone) for all critical UI elements.

### D. Code Architecture
* **Platform-Specific Logic:** Use the `.tv.tsx` or `.android.tsx` extensions for platform-specific overrides, or use the `Platform.isTV` constant.
* **Optimization:** Avoid heavy re-renders during focus transitions. TV hardware (especially budget Android TV sticks) is significantly weaker than modern smartphones.

---

## 4. Feature Requirements (The Gap List)
The Agent must prioritize the following implementations for this fork:
1.  **Focusable Menu:** Implement a sidebar or top-nav that responds to D-Pad navigation.
2.  **TV Input Manager:** Create a hook/provider to detect and manage remote control events globally.
3.  **Adaptive Assets:** Ensure icons and text are legible from 10 feet away (10ft UI design).

---

## 5. Definition of Done (DoD)
A task is only complete when it:
1.  Renders correctly on both **iOS/Android Mobile**.
2.  Maintains **Landscape** integrity on Tablets.
3.  Is fully navigable via **Keyboard/D-Pad** on tvOS and Android TV.
4.  Includes visual focus indicators for all interactive components.