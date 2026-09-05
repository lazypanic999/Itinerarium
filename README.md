<div align="center">

<img src="assets/logo.png" width="170">

# Itinerarium

### Travel planning for web and Android

Itinerarium is a travel planner for building day-by-day itineraries, keeping trip details together, and exploring a destination from one interface.

![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Android-black?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)

</div>

---

# Overview

The app supports itinerary building, activity management, interactive maps, weather forecasts, currency conversion, trip archives, and travel notes. A shared HTML, CSS, and JavaScript codebase is packaged for Android with Capacitor.

---

# Features

## Trip Planner

- Create personalized travel itineraries
- Build and update a day-by-day schedule
- Organize activities for every travel day
- Edit and manage travel plans easily

---

## Maps

- Explore destinations using Leaflet maps
- Visualize attractions and routes
- Responsive map interface

---

## Travel Tools

- Weather forecast
- Currency converter
- Travel utilities
- Trip document management

---

## Trip Management

- Save previous itineraries
- Organize trip history
- Access travel plans anytime

---

## Cross-Platform

- Responsive Web Application
- Native Android Application
- Shared codebase with Capacitor

---

## Interface

- Roman-inspired premium design
- Elegant typography
- Mobile-first interface
- Dark luxury theme
- Fast and lightweight

---

# Screenshots


## Demo

<p align="center">
<img src="screenshots/demo.gif" width="900">
</p>

---

## Home

<p align="center">
<img src="screenshots/home.jpeg" width="900">
</p>

<p align="center">
The entry point for browsing destinations and starting a trip.
</p>

---

## Trip Planner

<p align="center">
<img src="screenshots/plan.jpeg" width="900">
</p>

<p align="center">
Create personalized itineraries with an intuitive day-by-day planner.
</p>

---

## Travel Tools

<p align="center">
<img src="screenshots/tool.jpeg" width="900">
</p>

<p align="center">
Built-in weather forecast, currency converter and interactive maps.
</p>

---

## Past Plans

<p align="center">
<img src="screenshots/pastplans.jpeg" width="900">
</p>

<p align="center">
Access and manage previously created travel plans.
</p>

---

## Travelogue

<p align="center">
<img src="screenshots/travelogue.jpeg" width="900">
</p>

<p align="center">
Document memorable moments and keep your travel experiences organized.
</p>

---

# Technology

## Frontend

- HTML5
- CSS3
- JavaScript (ES6)

## Mobile

- Capacitor
- Android Studio

## Libraries

- Leaflet.js

## AI-Assisted Route Planning

The route generator uses a small Node.js service. The browser and Android client never receive the NVIDIA API key.

```text
Itinerarium UI → /api/ai-itinerary → verified place tools → NVIDIA NIM → validated itinerary JSON
```

Before requesting a plan, the service resolves the destination and gathers attraction, museum, viewpoint, café, and restaurant candidates from OpenStreetMap. The model prioritizes this verified set instead of inventing venues, coordinates, or routes. The server validates its output before returning the itinerary to the app.

### Local setup

1. Copy `.env.example` to `.env`.
2. Set `NVIDIA_API_KEY` to your NVIDIA Build key. Do not commit or place it in `runtime-config.js`.
3. Optionally set `NVIDIA_MODEL`. The default begins with `openai/gpt-oss-20b` at low reasoning effort, then tries the next entry if NVIDIA retires one with a `404` or `410` response.
4. Run `npm start`, then open `http://localhost:3000`.

Use **AI ile Oluştur** to provide starting location, daily budget, trip type, interests, food preferences, walking limit, and pace. The main planner supplies destination, start date, and duration.

### Android / deployed backend

Deploy the Node backend to a server that can reach NVIDIA NIM and OpenStreetMap. Put that public HTTPS backend address (without any secret) in `www/runtime-config.js` as `window.ITINERARIUM_API_URL`, then run `npx cap copy android` and build as usual. For web deployments, host the `www` files from the same Node server or set the same public URL in `runtime-config.js`.

## Version Control

- Git
- GitHub

---

# Getting Started

Clone the repository

```bash
git clone https://github.com/lazypanic999/Itinerarium.git
```

Navigate into the project

```bash
cd Itinerarium
```

Install dependencies

```bash
npm install
```

Sync Capacitor

```bash
npx cap sync
```

Run Android Studio

```bash
npx cap open android
```

---

# Build the Android APK

Copy the latest web assets

```bash
npx cap copy android
```

Build Debug APK

```bash
cd android

./gradlew assembleDebug
```

APK output

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

# Highlights

- Responsive Web Application
- Native Android Application
- Shared Web & Mobile Codebase
- Interactive Maps
- Weather Forecast Integration
- Currency Converter
- Travel Planner
- Roman-inspired visual style
- Modern Responsive Design

---

# Author

## Doğukan Sağlık

Computer Engineering Student  
Ostim Technical University

### GitHub

https://github.com/lazypanic999

### LinkedIn

https://www.linkedin.com/in/do%C4%9Fukan-sa%C4%9Fl%C4%B1k-4515a5288/

---

<div align="center">

Built by **Doğukan Sağlık**.

</div>
