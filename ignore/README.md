projectpro
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── server.js
├── config/
│   └── database.js
├── controllers/
│   ├── allocationController.js
│   └── authController.js
├── css/
│   └── style.css
├── database/
│   ├── migrate_db.js           # Latest cloud-ready migration script
│   ├── mysql_setup.sql         # Core database schema
│   ├── seed_allocations.js
│   ├── seed_faculty.js
│   └── sync_rooms.js
├── docs/                       # Project Documentation
│   ├── IMPLEMENTATION_CHAPTER.md
│   ├── PROJECT_STRUCTURE.md
│   └── ER_DIAGRAMS.md
├── html/                       # Dashboard Views
│   ├── admin-dashboard.html
│   ├── hod.html
│   ├── homepage.html
│   ├── principal.html
│   └── staff.html
├── images/
│   ├── logo.jpg
│   └── output.png
├── js/                         # Frontend Logic
│   ├── admin.js
│   ├── auth.js
│   ├── db.js
│   ├── hod.js
│   ├── principal.js
│   └── staff.js
├── models/
│   └── allocationModel.js
├── routes/
│   └── api.js
├── .env                        # Environment Configuration (TiDB Cloud)
├── package.json
└── README.md
