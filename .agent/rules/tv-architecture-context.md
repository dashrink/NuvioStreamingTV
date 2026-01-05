# React Native Unified TV Architecture (Expo + TVOS)

## Context & Goal
This project is a React Native application built with **Expo**.
**Goal:** Support Android Mobile, Android Tablet, iOS, iPadOS, **Android TV**, and **Apple TV (tvOS)** from a single codebase while maintaining high code reusability.

## 1. Core Technology Stack
* **Framework:** Expo (Managed Workflow with Prebuild).
* **TV Engine:** `react-native-tvos` (Fork).
* **TV Integration:** `@react-native-tvos/config-tv` (Expo Config Plugin).
* **Navigation:** Expo Router / React Navigation.

## 2. Configuration Strategy (Prebuild)
Do not eject. Use the Config Plugin pattern to swap the runtime engine.

### app.json / app.config.js
Ensure the config plugin is present to handle the swap from `react-native` to `react-native-tvos` during the `npx expo prebuild` phase.

```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-tvos/config-tv",
        {
          "isTV": true,
          "tvosDeploymentTarget": "15.0",
          "removeScrollView FromResponder": true
        }
      ]
    ]
  }
}