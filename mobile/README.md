# MobileHealth Malawi

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

**Offline-first mobile health platform for Community Health Workers (CHWs) and Health Surveillance Assistants (HSAs) in rural Malawi.**

> 🇲🇼 _"No internet? No problem. Works offline. Syncs when signal appears."_

---

## 📱 Live Demo

| Component         | URL                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Web Dashboard** | [https://mobile-health-dashboard.vercel.app](https://mobile-health-dashboard.vercel.app)               |
| **Backend API**   | [https://mobile-health-api.onrender.com/api/health](https://mobile-health-api.onrender.com/api/health) |
| **Mobile App**    | Available via Expo Go (scan QR code)                                                                   |

### Demo Credentials

| Role                  | Phone Number | PIN    |
| --------------------- | ------------ | ------ |
| **Admin**             | `0999000001` | `1234` |
| **Nurse**             | `0999000002` | `1234` |
| **District Officer**  | `0999000003` | `1234` |
| **CCW (Mary Tembo)**  | `0999000004` | `1234` |
| **CCW (Peter Mwale)** | `0999000005` | `1234` |

---

## 📋 Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## 🚨 Problem Statement

Community Health Workers in rural Malawi face five critical challenges:

| Problem                                       | Impact                                   |
| --------------------------------------------- | ---------------------------------------- |
| **Paper records take weeks to reach clinics** | Disease outbreaks go undetected          |
| **No reliable household register**            | Impossible to track who has been visited |
| **Referrals disappear with no follow-up**     | Patients never reach clinics             |
| **Drug stock-outs invisible until critical**  | Malaria, ORS, antibiotics unavailable    |
| **Existing digital tools require internet**   | CHWs have intermittent 2G/3G at best     |

> **Manual paper registers are slow, error-prone, and often lost to rain or damage.**

---

## 💡 Solution

MobileHealth Malawi is an **offline-first** platform designed specifically for Malawi's health system:

| Feature                            | Benefit                                             |
| ---------------------------------- | --------------------------------------------------- |
| ✅ **Works 100% offline**          | No internet required for daily work                 |
| ✅ **Automatic sync**              | Data syncs when signal appears                      |
| ✅ **Follows Malawi's hierarchy**  | Region → District → TA → Zone → Village → Household |
| ✅ **DHIS2 compatible**            | One-click export for national reporting             |
| ✅ **Bilingual**                   | English and Chichewa support                        |
| ✅ **Low-cost Android compatible** | Runs on phones under $60                            |

---

## ✨ Features

### For CCWs (Community Case Workers)

| Feature                       | Description                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| 🏠 **Household Registration** | Register households with GPS, photos, and family members                   |
| 👨‍👩‍👧‍👦 **Member Management**      | Track pregnancies, chronic illnesses, disabilities                         |
| 🩺 **Patient Visits**         | Record symptoms, temperature, MUAC (nutrition), danger signs               |
| 🚑 **Referrals**              | Create referrals to clinics with urgency levels (Routine/Urgent/Emergency) |
| 💊 **Drug Stock**             | Manage personal drug kit, request restock when low                         |
| 💉 **Immunisations**          | Track child vaccines (BCG, OPV, DPT, PCV, ROTA, Measles)                   |
| 🤰 **ANC Tracker**            | Monitor pregnant women's 4 ANC visits                                      |
| 🔔 **Notifications**          | Receive feedback from nurses, stock updates                                |

### For Nurses / HSAs

| Feature                 | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| 📋 **Referral Queue**   | View incoming referrals, mark ARRIVED/TREATED, send feedback      |
| 📊 **Dashboard Map**    | See household visits and referrals on interactive map             |
| 📈 **Analytics**        | View disease trends, CHW performance, coverage rates              |
| 💊 **Stock Management** | Approve/fulfill CCW restock requests                              |
| 📑 **Reports**          | Export household, referral, visit, immunisation data to CSV/Excel |
| 📤 **DHIS2 Export**     | Generate DHIS2-compatible reports                                 |

### For District Officers / Admin

| Feature                 | Description                                        |
| ----------------------- | -------------------------------------------------- |
| 🗺️ **Geography Setup**  | Configure regions, districts, TAs, zones, villages |
| 👥 **User Management**  | Create CCW, Nurse, District Officer accounts       |
| 🔗 **Allocations**      | Assign CCWs to zones, HSAs to TAs                  |
| 💊 **Drug Formulary**   | Add/edit drugs, set minimum thresholds             |
| 📊 **System Analytics** | Monitor CHW activity, sync status, coverage        |

---

## 🏗️ System Architecture

┌─────────────────────────────────────────────────────────────────┐
│ MOBILEHEALTH MALAWI │
├─────────────────────────────────────────────────────────────────┤
│ │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│ │ Mobile App │ ──▶ │ Node.js API │ ──▶ │ PostgreSQL │ │
│ │ (React Native│ │ (Express) │ │ (Neon) │ │
│ │ + SQLite) │ ◀── │ + Prisma │ ◀── │ │ │
│ └──────────────┘ └──────────────┘ └─────────────┘ │
│ │ │ │ │
│ │ offline-first │ │ │
│ ▼ ▼ ▼ │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│ │ Sync Queue │ │ Web Dashboard│ │ DHIS2 Export│ │
│ │ (pending │ │ (React) │ │ (CSV/JSON) │ │
│ │ records) │ │ + Leaflet │ │ │ │
│ └──────────────┘ └──────────────┘ └─────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────┘

### Data Flow

1. **Offline:** CHW fills forms → Data saved to local SQLite → Added to sync queue
2. **Online:** App detects internet → Sends batched records to API → Server confirms receipt
3. **Download:** App pulls latest referrals, feedback, stock levels from server
4. **Real-time:** Web dashboard updates via WebSocket when new data arrives

---

## 🛠️ Tech Stack

| Component            | Technology                             | Why                                               |
| -------------------- | -------------------------------------- | ------------------------------------------------- |
| **Mobile App**       | React Native / Expo                    | Cross-platform, offline SQLite, camera/GPS        |
| **Mobile Database**  | SQLite + expo-sqlite                   | Offline-first, encrypted storage                  |
| **Backend API**      | Node.js + Express                      | Lightweight, fast, JavaScript ecosystem           |
| **Database**         | PostgreSQL + Prisma                    | Reliable, ACID compliance, Prisma for type safety |
| **Web Dashboard**    | React + TypeScript + Tailwind          | Type-safe, fast UI, responsive                    |
| **Maps**             | Leaflet.js + OpenStreetMap             | Free, no API key required                         |
| **State Management** | Zustand (mobile), TanStack Query (web) | Simple, performant                                |
| **Authentication**   | JWT + bcrypt                           | Secure PIN-based login                            |
| **File Storage**     | Local device (photos)                  | No cloud dependency                               |
| **Hosting**          | Vercel (web), Render (API), Neon (DB)  | Free tier, auto-deploy                            |

---

## 📁 Project Structure

---

## 🚀 Installation

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Android phone or emulator (for mobile testing)
- Expo Go app (for mobile development)

### Backend Setup

```bash
# Clone repository
git clone https://github.com/yourusername/mobile-health-malawi.git
cd mobile-health-malawi/backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database URL and JWT secret

# Run database migrations
npx prisma migrate dev --name init

# Seed database with demo data
npm run seed

# Start backend server
npm run devcd ../frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Set VITE_API_URL to your backend URL

# Start development server
npm run dev


cd ../mobile

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend URL

# Start Expo
npx expo start

# Scan QR code with Expo Go app on your phone


API Documentation
Authentication
Endpoint	Method	Description
/api/auth/login	POST	Login with phone + PIN
Households
Endpoint	Method	Description
/api/households	GET	List households (paginated, filtered)
/api/households	POST	Create household
/api/households/:id	GET	Get household with members
/api/households/:id	PATCH	Update household
Referrals
Endpoint	Method	Description
/api/referrals	GET	List referrals (filter by status)
/api/referrals	POST	Create referral
/api/referrals/:id	PATCH	Update status (ARRIVED/TREATED/COMPLETED/MISSED)
Sync
Endpoint	Method	Description
/api/sync	POST	Batch sync of offline records
/api/sync	GET	Get pending records (admin)
Reports
Endpoint	Method	Description
/api/reports/households	GET	Household report with date filter
/api/reports/referrals	GET	Referral report with CHW/village breakdown
/api/reports/visits	GET	Visit report with symptom analysis
/api/reports/immunisations	GET	Immunisation coverage report
/api/reports/export/csv	POST	Export report as CSV
Full API documentation available at /api/docs when server is running.

🗄️ Database Schema
Core Tables
Table	Description
users	System users (CCW, Nurse, DHO, Admin)
households	Registered households
household_members	Individual family members
visits	Patient visits (symptoms, MUAC, danger signs)
referrals	Referral records with full status tracking
immunisation_schedules	Vaccine schedules for children under 5
anc_visits	Antenatal care visits for pregnant women
drugs	Master drug formulary
drug_stock	Per-CHW drug stock levels
stock_requests	Restock requests from CCWs
notifications	In-app notifications
sync_queue	Offline sync queue
Geographic Hierarchy
Table	Description
regions	Southern, Central, Northern
districts	28 districts
traditional_authorities	TAs within districts
zones	Subdivisions within TAs
villages	Self-added by CHWs
facilities	Clinics and hospitals
🌐 Deployment
Backend (Render)# Connect your GitHub repository to Render
# Set environment variables:
# - DATABASE_URL
# - JWT_SECRET
# - PORT=5000

Frontend (Vercel)

# Connect repository to Vercel
# Set environment variable:
# - VITE_API_URL

Mobile (Expo EAS)

cd mobile
eas build --platform android --profile preview
📸 Screenshots
Mobile App
Login	Household List	Record Visit
Screenshot coming	Screenshot coming	Screenshot coming
Referrals	Drug Stock	Immunisations
Screenshot coming	Screenshot coming	Screenshot coming
Web Dashboard
Overview Map	Referral Queue	Drug Stock
Screenshot coming	Screenshot coming	Screenshot coming
Reports	User Management	DHIS2 Export
Screenshot coming	Screenshot coming	Screenshot coming
🗺️ Roadmap
Phase 1 – MVP (Complete ✅)
Household registration

Member management

Patient visits

Referrals (basic)

Offline sync

Web dashboard

Phase 2 – Current (Complete ✅)
Immunisation tracking

ANC tracking

Drug stock management

Stock requests

Notifications

Reports & DHIS2 export

Phase 3 – Future
SMS alerts (Africa's Talking)

Push notifications (FCM)

Bulk data import (Excel)

Audit logs viewer

Multi-language (Chichewa toggle)

Offline maps

🤝 Contributing
Contributions are welcome!

Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing-feature)

Open a Pull Request

📄 License
Distributed under the MIT License. See LICENSE for more information.

📧 Contact
Patrick Kulinji – kulinjipatricks@gmail.com

Project Link: https://github.com/patrick516/mobile-health

Live Demo: https://mob-health.vercel.app

🙏 Acknowledgements
Ministry of Health Malawi for DHIS2 standards

Community Health Workers who inspired this project

OpenStreetMap for free map tiles

Expo, Prisma, and all open-source contributors

Built with ❤️ for Malawi's Community Health Workers

🇲🇼 "Kulimbikitsa thanzi la anthu ku Malawi"



```
