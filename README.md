# Smart Medical Reminder System

A modern, responsive, multilingual medicine reminder web application designed especially for patients, elderly individuals, and their caretakers. The system provides reliable daily dose scheduling, audible alarms, graceful snooze controls, adherence tracking, caretaker missed-dose notifications, English/Hindi/Telugu language support, and secure database persistence.

---

## 🌟 Key Features

### 1. Complete Medicine Management
- **Prescription Details**: Name, dosage amount, medicine form (tablet, capsule, syrup, drops, injection, cream), administration route, food instructions (before/after/with food), and notes.
- **Multiple Daily Doses**: Custom reminder times sorted automatically with distinct occurrence identifiers.
- **Duration Tracking**: Support for fixed treatment periods with inclusive calendar days or ongoing prescriptions.
- **Stock Tracking**: Remaining quantity countdowns with low-stock refill threshold alerts.
- **Prescriptions & Photos**: Attach medicine photos and prescription documents.

### 2. Scheduled Reminder & Alarm Engine
- **Audio & Visual Prompts**: Web Audio synthesizer alarms and prompt dialogs.
- **Dose Confirmation**: One-click **Taken** and **Skip** actions (with user-entered skip reasons).
- **3-Snooze Policy**: Exactly three 10-minute snoozes (or 15-second intervals in accelerated Test Mode).
- **Grace Period & Missed Doses**: A 5-minute unhandled grace period before an unresolved dose cleanly transitions to Missed.
- **Deterministic Scheduling**: Collision-free dose occurrence IDs (`dose_{medicineId}_{date}_{time}`) that prevent duplicate reminders upon page refreshes.

### 3. Caretaker Notifications & Alerts
- **Missed-Dose Dispatching**: Automatically alerts caretakers when a dose is missed after the grace period expires.
- **Multi-Channel Delivery**: Support for SMTP Email, Twilio SMS, and Webhooks.
- **Quiet Hours Suppression**: Respects customizable overnight quiet hours (`22:00` - `07:00`) to avoid sleep disruptions.
- **Honest Delivery Status**: Distinguishes `provider_not_configured`, `queued`, `sent`, `failed`, `quiet_hours_held`, and `disabled_by_user`. Never fakes delivery success.
- **Idempotency Protection**: Deduplication keys prevent duplicate alerts on network retries.

### 4. Comprehensive Multilingual Support
- **Three Supported Languages**:
  - English (`en`)
  - हिन्दी (`hi` - Hindi)
  - తెలుగు (`te` - Telugu)
- **Real-Time Switching**: Language changes take effect immediately across all navigation, modals, forms, and charts without reloading or resetting active reminder timers.
- **Native Typography**: Optimized font fallbacks for Windows Devanagari and Telugu typography (`Nirmala UI`, `Gautami`, `Mangal`).
- **Locale-Aware Formatting**: Localized calendar dates, 12-hour AM/PM times, and notification templates.

### 5. Adherence Reports & Data Export
- **Strict Adherence Metrics**: Adherence calculated as:
  $$\text{Adherence \%} = \frac{\text{Taken}}{\text{Taken} + \text{Missed} + \text{Skipped}} \times 100$$
  *(Pending, due, and future scheduled doses are strictly excluded from adherence calculations)*.
- **Interactive Reports**: Daily, weekly (7-day timeline), monthly, and per-medicine compliance breakdowns.
- **UTF-8 BOM CSV Exports**: Export dose histories and report summaries with UTF-8 Byte Order Mark (`\uFEFF`) ensuring Excel displays Hindi and Telugu characters without garbling.

### 6. User Accounts, Database & Data Privacy
- **Relational SQLite Database**: Powered by Node.js native `DatabaseSync` (`node:sqlite`) with WAL mode and foreign key cascading.
- **Cryptographic Security**: Passwords hashed with `scrypt` using unique 16-byte random salts and constant-time verification. Zero plain-text passwords.
- **Multi-Tenant Privacy**: Strict user-level partitioning. Users cannot read, modify, or delete another patient's medicines, history, caretaker alerts, or files.
- **Guest Mode & Local Migration**: Supports offline localStorage operation with an optional prompt to migrate existing browser records to a user account with a pre-migration backup snapshot.
- **Account Control**: One-click personal JSON data export archive and password-confirmed permanent account deletion.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 18, Vite 5, Vanilla CSS with custom properties & elderly-accessible typography |
| **Icons & Media** | Custom SVG icon library, Canvas-based image compression |
| **Audio & Alerts** | HTML5 Web Audio API (oscillators, chime patterns), HTML5 Notifications API |
| **Backend API** | Node.js native HTTP server (`node:http`), RESTful routing (zero bulky frameworks) |
| **Database** | Node.js native SQLite (`node:sqlite` via `DatabaseSync`), ACID transactions |
| **Security** | Node.js `node:crypto` (`scryptSync`, `randomBytes`, `timingSafeEqual`), Bearer Tokens |
| **Testing** | Automated verification suites covering scheduling, math formulas, templates, and isolation |

---

## 📂 Project Directory Structure

```text
smart-medical-reminder/
├── src/
│   ├── components/            # Reusable UI components (Modals, Cards, Header, Sidebar)
│   ├── context/               # Centralized AppContext provider & state orchestration
│   ├── i18n/                  # Multilingual dictionary & deep English proxy fallback
│   ├── pages/                 # Route pages (Dashboard, AddMedicine, History, Reports, Caretaker)
│   ├── services/              # Client services (Reminder engine, audio, API client, storage)
│   ├── styles/                # Accessible styles, Elder-friendly CSS, responsive breakpoints
│   └── utils/                 # Date/time utilities, strict adherence math, CSV formatting
├── server/
│   ├── data/                  # SQLite database (medical_reminder.db) & local fallback stores
│   ├── services/              # Auth service, data service, email/SMS carrier integrations
│   ├── uploads/               # Securely stored user medicine photos and prescriptions
│   ├── db.js                  # Database schema initialization & migrations
│   ├── index.js               # Native HTTP backend REST API endpoints
│   ├── templates.js           # Multilingual notification email & SMS templates
│   └── .env.example           # Example configuration for SMTP and Twilio carriers
├── scripts/
│   ├── verifyPhase3.js        # Reminder engine & 3-snooze limit test suite
│   ├── verifyPhase4.js        # History logs, Taken/Missed/Skipped distinction & adherence suite
│   ├── verifyPhase5.js        # Caretaker alerts & carrier honest reporting suite
│   ├── verifyPhase6.js        # Multilingual translation completeness suite
│   ├── verifyPhase7.js        # SQLite persistence, scrypt hashing & multi-tenant isolation suite
│   └── verifyPhase8.js        # Comprehensive end-to-end integration test suite
├── start.bat                  # One-click Windows startup launcher (frees ports & opens browser)
├── stop.bat                   # Clean shutdown script for background services
├── package.json               # Project manifest
├── vite.config.js             # Vite configuration
└── README.md                  # Comprehensive documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version `20.0.0` or higher (Node `22+` recommended; tested on Node `v24.19.0`).
- **Web Browser**: Chrome, Edge, Firefox, or Safari with Web Audio and Notification support.

### Installation

1. **Clone the repository**:
   ```bash
   git clone <YOUR_REPOSITORY_URL>
   cd smart-medical-reminder
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

---

## 💻 Running the Application

### Option A: One-Click Windows Launcher (Recommended)
Double-click `start.bat` in the project root, or execute:
```cmd
.\start.bat
```
*This script automatically frees occupied ports, starts the Backend API on port `3001`, starts the Vite Dev Server on port `3000`, and opens `http://localhost:3000` in your default browser.*

To stop the services, double-click `stop.bat` or run:
```cmd
.\stop.bat
```

### Option B: Manual Startup

1. **Start Backend Server**:
   ```bash
   node server/index.js
   ```
   *(Server starts on `http://localhost:3001`)*

2. **Start Frontend Server** (in a separate terminal):
   ```bash
   npm run dev
   ```
   *(Frontend starts on `http://localhost:3000`)*

3. Open **`http://localhost:3000`** in your web browser.

---

## 🧪 Running Automated Tests

Run the verification test suites using Node.js:

```bash
# Run the Master Phase 8 Integration Suite:
node scripts/verifyPhase8.js

# Run all test suites across all phases:
node scripts/verifyPhase3.js
node scripts/verifyPhase4.js
node scripts/verifyPhase5.js
node scripts/verifyPhase6.js
node scripts/verifyPhase7.js
node scripts/verifyPhase8.js
```

### Production Build
```bash
npm run build
```

---

## ⚙️ Environment Configuration (Optional)

The application functions completely out of the box without any external services. Local reminders, alarms, databases, and reporting run locally.

To enable real-world email or SMS delivery to caretakers:
1. Copy `server/.env.example` to `server/.env`:
   ```bash
   copy server\.env.example server\.env
   ```
2. Configure your carrier credentials:
   - **SMTP Email**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
   - **Twilio SMS**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
   - **Webhooks**: `EMAIL_WEBHOOK_URL`, `SMS_WEBHOOK_URL`.

---

## ⚠️ Known Limitations & Operating Notes

1. **Browser-Closed Reminders**: Client-side audio alarms and popup notifications rely on standard browser APIs. If the user closes their browser completely or their device goes into a low-power deep sleep, client-side alarms cannot trigger until the browser tab is reopened.
2. **Audio Autoplay Restrictions**: Modern browsers prevent web pages from playing audio until the user has interacted with the document (clicked or tapped). The application displays visual banners and prompts to enable sound.
3. **External Delivery Credentials**: When SMTP or Twilio credentials are not configured, missed-dose alerts are safely recorded in the database with status `provider_not_configured`, without falsely claiming delivery.

---

## 📄 License

This project is licensed under the MIT License - feel free to use and adapt it for educational and personal health companion purposes.
