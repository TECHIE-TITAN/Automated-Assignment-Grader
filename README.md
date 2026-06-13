# Assignment Grader

A full-stack web application for automated code grading with support for Python submissions, custom rubrics, and real-time feedback.

## Features

- **Role-based Authentication**: Separate interfaces for teachers and students
- **Classroom Management**: Create and manage multiple classrooms
- **Assignment System**: Create assignments with custom grading rubrics
- **Automated Grading**: Python code execution with test case validation
- **Real-time Feedback**: Instant grading results with detailed breakdowns
- **Secure**: JWT authentication, bcrypt password hashing

## Tech Stack

**Frontend:**
- React 18
- Axios for API calls
- CSS3 for styling

**Backend:**
- Node.js & Express
- MongoDB Atlas (cloud database)
- Mongoose ODM
- JWT authentication
- Python execution pipeline

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (free tier available)
- Python 3.x (for code execution)

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd assignment-grader
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

4. Configure environment variables:
   ```bash
   cd ../backend
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your actual credentials:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Generate a secure random key
   - `DB_TYPE`: Set to `mongodb`

5. Run the migration to populate database:
   ```bash
   node scripts/migrateToMongoDB.js
   ```

### Running the Application

**Start Backend (Terminal 1):**
```bash
cd backend
node server.js
```
Backend runs on http://localhost:5000

**Start Frontend (Terminal 2):**
```bash
cd frontend
npm start
```
Frontend runs on http://localhost:3000

### Demo Credentials

**Teacher:**
- Email: `teacher@university.edu`
- Password: `teacher123`

**Student:**
- Email: `cse001@university.edu` (or cse002-cse115, ece001-ece100, dd001-dd135)
- Password: `student123`

## Project Structure

```
assignment-grader/
├── backend/
│   ├── config/          # Database configurations
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── scripts/         # Utility scripts
│   └── server.js        # Entry point
├── frontend/
│   ├── public/          # Static files
│   └── src/
│       ├── components/  # React components
│       └── services/    # API service
└── sample/              # Sample test files
```

## API Endpoints

### Authentication
- `POST /api/auth/student/login` - Student login
- `POST /api/auth/teacher/login` - Teacher login
- `GET /api/auth/profile` - Get current user profile

### Classrooms
- `GET /api/classrooms/teacher` - Get teacher's classrooms
- `GET /api/classrooms/student` - Get student's enrollments
- `POST /api/classrooms` - Create classroom
- `GET /api/classrooms/:id` - Get classroom details

### Assignments
- `GET /api/assignments/classroom/:id` - Get classroom assignments
- `POST /api/assignments` - Create assignment
- `POST /api/assignments/:id/submit` - Submit assignment

### Rubrics
- `POST /api/rubrics/:assignmentId` - Create/update rubric
- `GET /api/rubrics/:assignmentId` - Get assignment rubric

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Author

Vansh Goyal

## Acknowledgments

- Built as part of work experience at Anacodic AI
- MongoDB Atlas for cloud database hosting
