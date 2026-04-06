# JNTU Auto Seating Allotment Management System

A premium, automated solution for managing university examination seating arrangements, invigilator assignments, and student notifications.

## 🚀 Features

- **Multi-Step Scheduling Dashboard**: A smooth, 4-step wizard for staff to schedule exams efficiently.
  - **Batch Selection**: Select multiple years and branches.
  - **Room Allocation**: Intelligent room selection with capacity warnings and auto-selection logic.
  - **Faculty Assignment**: Automated calculation of required invigilators (1 per 30 students).
  - **Visual Preview**: Interactive 2D seating matrix preview before submission.
- **Intelligent Student Import**:
  - Supports `.xlsx` and `.xls` files.
  - Automatically scans all cells for JNTU-format roll numbers (10 characters, alphanumeric).
  - Handles **Supply Students** by appending them to the end of the seating pool.
- **Export Capabilities**: Approved seating arrangements can be exported back to Excel for printing.
- **Role-Based Access Control**:
  - **Admin**: User management and system configuration.
  - **Staff**: Scheduling and submission of seating plans.
  - **HOD & Principal**: Review, approval, and rejection of submitted plans.
- **Notifications Support**:
  - NEW: Database support for student **phone numbers** to facilitate future SMS/WhatsApp exam alerts.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5/CSS3 (Modern UI with Glassmorphism, CSS Grid, and Flexbox), JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **Database**: MySQL (MariaDB/XAMPP compatible).
- **Libraries**:
  - [SheetJS (XLSX)](https://sheetjs.com/) for Excel processing.
  - [Font Awesome](https://fontawesome.com/) for iconography.
  - [Google Fonts (Inter)](https://fonts.google.com/) for premium typography.

---

## ⚙️ Setup & Installation

### 1. Database Configuration
1. Start your MySQL server (via XAMPP or native installation).
2. Create the database:
   ```sql
   CREATE DATABASE jntu_exam_management;
   ```
3. Run the initialization script to set up tables:
   ```bash
   node database/init_db.js
   ```

### 2. Running Migrations
If you have an existing database and need the latest schema updates (like the new `phone_number` column), run:
```bash
node database/migrate_db.js
```

### 3. Start the Server
```bash
node backend/server.js
```
The application will be available at `http://localhost:3000`.

---

## 📊 Database Schema (Core Tables)

Detailed Entity-Relationship diagrams and generation steps can be found in [docs/ER_DIAGRAMS.md](file:///C:/Users/GAYATHRI/projectpro/docs/ER_DIAGRAMS.md).

| Table | Description |
|---|---|
| `staff` | User accounts with roles (admin, staff, hod, principal). |
| `students` | Student directory including Roll No, Name, Branch, and **Phone Number**. |
| `rooms` | Physical examination halls with dimensions (Rows x Columns). |
| `allocations` | The master record of scheduled exams, including full 2D seat matrices in JSON. |
| `exam_logs` | Audit trail of all actions performed in the system. |

---

## 📋 File Import Format (Supply Students)

The Excel upload for supply students is highly flexible:
- **Format**: `.xlsx` or `.xls`.
- **Requirements**: No specific headers needed.
- **Logic**: The script scans every cell for a 10-character string (e.g., `21XW1A0501`). Any matching string is treated as a valid candidate for the supply student batch.

---

## ⚖️ Seating Logic

The system uses **Vertical Column-Major Filling** to ensure clean alternating patterns:
1. Students from different branches/years are alternated in the grid.
2. Supply students are prioritized to be seated at the end of the pool.
3. The logic ensures no two students from the same batch are seated adjacent to each other whenever possible.
