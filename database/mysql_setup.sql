-- Create Database
CREATE DATABASE IF NOT EXISTS jntu_exam_management;
USE jntu_exam_management;

-- Staff Table (Users)
CREATE TABLE IF NOT EXISTS staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    role ENUM('admin', 'staff', 'hod', 'principal') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    branch VARCHAR(100),
    year VARCHAR(50),
    section VARCHAR(10),
    email VARCHAR(255),
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Rooms Table (Renamed from exam_halls)
CREATE TABLE IF NOT EXISTS rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    total_rows INT NOT NULL,
    total_columns INT NOT NULL,
    capacity INT NOT NULL
);

-- Seed Initial Rooms
INSERT IGNORE INTO rooms (room_name, building, total_rows, total_columns, capacity) VALUES 
('Room 101', 'Main Block', 10, 6, 60),
('Room 102', 'Main Block', 7, 6, 42),
('Room 103', 'Main Block', 8, 5, 40),
('Drawing Hall 201', 'Admin Block', 10, 10, 100),
('Seminar Hall 202', 'Admin Block', 12, 10, 120),
('Room 301', 'Main Block', 10, 6, 60),
('Lab 1', 'CS Block', 5, 6, 30),
('Lab 2', 'CS Block', 6, 5, 30),
('Room 104', 'Main Block', 10, 6, 60),
('Room 105', 'Main Block', 10, 6, 60),
('Room 203', 'Main Block', 8, 5, 40),
('Room 204', 'Main Block', 8, 5, 40),
('Room 205', 'Main Block', 10, 5, 50),
('Room 302', 'Main Block', 10, 6, 60),
('Room 303', 'Main Block', 10, 6, 60),
('Room 304', 'Main Block', 8, 6, 48),
('Room 401', 'Main Block', 10, 7, 70),
('Room 402', 'Main Block', 10, 7, 70),
('Lab 3 (CS)', 'CS Block', 5, 6, 30),
('Lab 4 (CS)', 'CS Block', 5, 6, 30),
('Lab 5 (ECE)', 'ECE Block', 6, 6, 36),
('Lab 6 (ECE)', 'ECE Block', 6, 6, 36),
('Lab 7 (MECH)', 'MECH Block', 8, 5, 40),
('Auditorium A', 'Main Block', 20, 10, 200),
('Auditorium B', 'Main Block', 20, 10, 200),
('Exam Hall 1', 'Main Block', 15, 10, 150),
('Exam Hall 2', 'Main Block', 15, 10, 150),
('Exam Hall 3', 'Main Block', 15, 10, 150);

-- Exam Log Table
CREATE TABLE IF NOT EXISTS exam_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action TEXT NOT NULL,
    performed_by INT,
    exam_date DATE,
    exam_time TIME,
    exam_type VARCHAR(100),
    batch TEXT,
    created_by INT,
    approved_by INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES staff(staff_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES staff(staff_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- Seating Allocations Table
CREATE TABLE IF NOT EXISTS allocations (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    exam_date DATE NOT NULL,
    exam_time TIME NOT NULL,
    exam_type VARCHAR(100) NOT NULL,
    batch TEXT NOT NULL,
    rooms_json JSON NOT NULL,
    faculties_json JSON,
    hod_remark TEXT,
    created_by INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    roll_number VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roll_number) REFERENCES students(roll_no) ON DELETE CASCADE
);

-- Seed Default Admin
INSERT IGNORE INTO staff (username, name, email, password, role, status) 
VALUES ('admin', 'Admin User', 'admin@gmail.com', 'admin123', 'admin', 'approved');

-- Seed Other Initial Users for testing
INSERT IGNORE INTO staff (username, name, email, password, role, status) 
VALUES ('principal', 'Principal Dr.', 'principal@gmail.com', 'prin123', 'principal', 'approved');
INSERT IGNORE INTO staff (username, name, email, password, role, status) 
VALUES ('hod', 'HOD Dr.', 'hod@gmail.com', 'hod123', 'hod', 'approved');
