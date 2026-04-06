# RedBrick

**Electricity credit, instantly.**

RedBrick is a buy-now-pay-later platform for prepaid electricity in Zambia. Customers can borrow ZESCO electricity tokens on credit via their mobile phone and repay later through MTN MoMo or Airtel Money.

---

## Repository Structure

```
redbrick/
├── backend/        Node.js API server
├── scoring/        Python credit-scoring engine
├── mobile/         Flutter mobile app
├── dashboard/      React web dashboard
├── database/       PostgreSQL schema & migrations
└── README.md
```

### `/backend` — API Server

Node.js + Express REST API that powers the platform. Handles authentication (OTP), meter validation, token issuance, payment processing, and webhook integrations with mobile-money providers (MTN MoMo, Airtel Money).

- **Runtime:** Node.js 20+
- **Framework:** Express
- **Auth:** JWT + OTP via SMS gateway
- **Entry point:** `src/index.js`

### `/scoring` — Credit Scoring Engine

Python service that evaluates a customer's creditworthiness based on repayment history, top-up patterns, and meter usage. Returns a credit limit (ZMW 0–250) and risk score for each borrower.

- **Runtime:** Python 3.11+
- **Framework:** FastAPI
- **ML:** scikit-learn / XGBoost
- **Entry point:** `src/main.py`

### `/mobile` — Mobile App

Flutter cross-platform app (Android + iOS) that customers use to log in, borrow electricity, view tokens, check transaction history, and make repayments via mobile money.

- **Framework:** Flutter 3.x / Dart
- **State management:** Riverpod
- **Entry point:** `lib/main.dart`

### `/dashboard` — Web Dashboard

React admin dashboard for internal operations. Shows customer accounts, outstanding loans, repayment rates, risk analytics, and system health. Used by the RedBrick team, not end customers.

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS
- **Entry point:** `src/main.jsx`

### `/database` — Database Schema & Migrations

PostgreSQL database schema definitions and versioned migrations. Contains table definitions for users, meters, loans, transactions, repayments, and credit scores.

- **Engine:** PostgreSQL 16+
- **Migrations:** SQL files, numbered sequentially
- **Seeds:** Sample data for development and testing

---

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd redbrick

# Backend
cd backend && npm install && npm run dev

# Scoring engine
cd scoring && pip install -r requirements.txt && uvicorn src.main:app --reload

# Mobile
cd mobile && flutter pub get && flutter run

# Dashboard
cd dashboard && npm install && npm run dev

# Database
cd database && psql -f migrations/001_initial_schema.sql
```

## License

Proprietary — RedBrick Ltd. All rights reserved.
