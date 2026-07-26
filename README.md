src/
  ├── firebase.js                 # Firebase initialization & exports
  ├── App.jsx                     # Central router & navigation flow
  ├── pages/
  │     ├── AuthPage.jsx          # Login & Signup with eye toggle
  │     ├── AddStudentPage.jsx    # Smart student registration + sibling checks
  │     ├── StudentDetailsPage.jsx# Profile & month/year fee ledger modal
  │     └── AdminDashboard.jsx    # admin panel
  └── components/
        ├── common/
        │     └── PasswordInput.jsx
        ├── coaching/
        │     ├── CoachingView.jsx # Classes/Subjects builder
        │     └── RemindersTab.jsx # Cutoff auto-reminders
        └── dashboard/
              └── TeacherDashboard.jsx