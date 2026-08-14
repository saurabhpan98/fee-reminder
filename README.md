# 🎓 TuitionManager - Smart Fee Tracking & Coaching Analytics System

> An all-in-one digital workspace engineered for independent tutors, educators, and coaching institute administrators to streamline student enrollments, automate fee tracking, process subscription payments, and monitor financial analytics.

---

## 🌟 Overview & Key Highlights

**TuitionManager** bridges the administrative gap between coaching center owners, teachers, and system administrators. Instead of wrestling with fragmented spreadsheets or paper registers, TuitionManager provides a real-time, responsive web interface to manage multi-batch class structures, subject-wise ledgers, instant PDF receipt generation, and end-to-end encrypted admin communications.

---

## 🔥 Key Features

### 🏢 Multi-Institute & Batch Hierarchy
* **Flexible Coaching Structures:** Organize multiple coaching institutes, class levels (e.g., 11th, 12th, Engineering), and individual subject batches with assigned instructors.
* **Smart Student Registration:** Detect existing enrolled students via phone number matching to streamline multi-batch or sibling enrollments without data duplication.
* **Enrollment Management:** Track student statuses (*Active*, *Unassigned*, or *Left*) per subject with historic logs.

### 💰 Fee Management & Interactive Ledgers
* **Real-time Fee Ledgers:** Track monthly tuition dues with granular statuses (*Paid*, *Partially Paid*, *Unpaid*).
* **Automated Cutoff Reminders:** Automatically detect overdue students when the monthly cutoff date (e.g., 7th of the month) passes.
* **1-Click WhatsApp Fee Payload:** Trigger pre-formatted WhatsApp fee statements directly to parents or students with payment breakdowns.

### 📊 Advanced Financial Analytics & Growth Insights
* **Revenue Metrics:** Real-time visibility into Expected Revenue, Collected Revenue, and Pending Dues across all managed coaching centers.
* **Collection Efficiency Rates:** Visual progress bars displaying month-over-month collection health percentages.
* **6-Month Historical Trends:** Lightweight, responsive SVG bar graphs charting long-term revenue growth.
* **Status Ratio Breakdown:** Instant visual breakdown of Fully Paid, Partially Paid, and Completely Unpaid enrollments.

### 💳 Tiered Subscription & Payment Verification Portal
* **Plan Gatekeeping:** Feature access controlled by user subscription tiers (**Starter Teacher** vs. **Pro Academy**).
* **Payment Submissions & Approvals:** Users submit subscription or custom payment details (Txn ID, mode, remarks). System Admins review, verify, and approve/reject submissions with historic audit trails.
* **Auto-Pause Protection:** System automatically pauses Pro Plan accounts if the current month's subscription payment remains unpaid past the 7th of the month.
* **Flexible Navigation Mode:** Paused accounts retain access to direct admin messaging, profile settings, and payment portals while restricting core workspace edits.

### 🔒 Encrypted Direct Messaging & Export Reporting
* **E2E Encrypted Chat:** Secure, AES-encrypted direct chat room between users and system administrators featuring rich-text formatting and message replies.
* **Official PDF Receipts:** Generate single-month or date-range official PDF payment receipts complete with center details, student profiles, and teacher signatures.
* **CSV & PDF Summary Exports:** Export full coaching-wide financial summary reports with one click.

---

## 🏷️ Subscription Tiers & Pricing Model

| Feature / Capability | 🟢 Starter Teacher (Free) | ⚡ Pro Academy (₹1,200 / mo) |
| :--- | :---: | :---: |
| **Max Enrolled Students** | Up to 50 Students | **Unlimited Students** |
| **Coaching Centers** | 1 Institute | **Up to 5 Institutes** |
| **Monthly Fee Ledgers** | Included | Included |
| **Single-Month PDF Receipts** | Included | Included |
| **Range Date PDF Receipts** | 🔒 Upgrade Required | **Included** |
| **1-Click WhatsApp Payloads** | 🔒 Upgrade Required | **Included** |
| **Encrypted Admin Chat** | 🔒 Upgrade Required | **Included** |
| **CSV / PDF Summary Exports**| 🔒 Upgrade Required | **Included** |

---

## 🔒 Security, Privacy & Data Integrity

TuitionManager prioritizes data confidentiality, user privacy, and strict permission compliance:

* **End-to-End Encryption (E2E):** Direct messages between educators and system administrators are encrypted on the client side using **AES (CryptoJS)** before transmission over the network.
* **Firebase Authentication:** Secure email-and-password session management with protected route state persistence.
* **Role-Based Access Control (RBAC):** Admin-only operational routes are restricted via administrative email credentials and database rules.
* **Strict Privacy Protocols:** System identifiers, sensitive tokens, and personal credentials are never exposed publicly or echoed in client-side logs.

---

## 🛠️ Tech Stack & Architecture

### **Frontend & User Interface**
* **React 19:** Component-driven UI architecture built with React Hooks and context patterns.
* **Vite:** High-performance, lightning-fast bundler and development server.
* **Tailwind CSS v4:** Modern utility-first styling with custom glassmorphism, gradient accents, and responsive layout primitives.
* **Lucide React:** Consistent icon design system.

### **Backend & Database Services**
* **Firebase Firestore:** Real-time NoSQL cloud database for active listeners, live document updates, and payment request queues.
* **Firebase Authentication:** Managed identity service for authentication flows.

### **Document & Export Utilities**
* **jsPDF & jsPDF-AutoTable:** Client-side vector PDF document generation engine for receipts and formal reports.
* **CryptoJS:** AES Encryption and Decryption utility for secure direct chat payloads.

---

## 📂 Project Directory Structure
```
fee-reminder/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminAnalyticsSection.jsx   # System-wide admin metrics & charts
│   │   ├── coaching/
│   │   │   ├── CoachingView.jsx            # Class, Subject & Roster Manager
│   │   │   ├── ExportReportModal.jsx       # CSV & PDF export modal
│   │   │   └── RemindersTab.jsx            # Cutoff date defaulters list
│   │   ├── common/
│   │   │   ├── ForgotPasswordModal.jsx     # Password recovery modal
│   │   │   ├── PasswordInput.jsx           # Toggleable password input
│   │   │   └── UpgradePlanModal.jsx        # Plan upgrade & downgrade request modal
│   │   ├── dashboard/
│   │   │   ├── AnalyticsSection.jsx        # Teacher-level revenue analytics
│   │   │   └── TeacherDashboard.jsx        # Primary educator dashboard
│   │   └── ChatModal.jsx                   # E2E encrypted admin direct messaging
│   ├── pages/
│   │   ├── AddStudentPage.jsx              # Smart student enrollment form
│   │   ├── AdminDashboard.jsx              # System administration portal
│   │   ├── AdminPaymentRequestsPage.jsx    # Payment verification queue
│   │   ├── AuthPage.jsx                    # Sign in & Account creation
│   │   ├── ClassDetailsPage.jsx            # Individual class view & roster
│   │   ├── LandingPage.jsx                 # Public landing page & FAQ
│   │   ├── StudentDetailsPage.jsx          # Student profile & fee ledger
│   │   ├── SubjectDetailsPage.jsx          # Subject batch detail view
│   │   └── UserPaymentsPage.jsx            # User subscription payment portal
│   ├── utils/
│   │   ├── cryptoUtils.js                  # AES encryption/decryption helpers
│   │   ├── exportUtils.js                  # PDF & CSV generation routines
│   │   ├── helpers.js                      # Date formatting & constants
│   │   └── planUtils.js                    # Subscription plan configurations
│   ├── App.jsx                             # Central router & state manager
│   ├── firebase.js                         # Firebase initialization & exports
│   └── main.jsx                            # Application entry point
├── package.json
└── vite.config.js
```

---

## 🚀 Installation & Local Setup

Follow these steps to run **TuitionManager** on your local environment:

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **npm** or **yarn** or **pnpm**
* A **Firebase Project** with Authentication and Firestore Database enabled.

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/tuition-manager.git](https://github.com/your-username/tuition-manager.git)
cd tuition-manager
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Configure Firebase Credentials
Open src/firebase.js and update your Firebase project configuration credentials:

```bash
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```
### 4. Start the Development Server
```bash
npm run dev
```
Open http://localhost:5173 in your browser to view the application.


## 🧑‍💻 Developer & Author
* Developer: Saurabh Panchal
* Project Name: TuitionManager / Fee-Reminder

## 📄 License
NOT FOR USE