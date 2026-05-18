# Attendance System - MongoDB Backend

This project has been migrated from Firebase/Firestore to MongoDB.

## Architecture Changes

### Backend (Server)
- **Old**: Firebase Admin SDK + Firestore
- **New**: Express.js + MongoDB

### Frontend (Client)
- **Old**: Firebase Authentication + Firestore SDK + Google Sign-In
- **New**: Username/Password authentication via backend API

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v5.0 or higher)
- npm (v6 or higher)

## Installation & Setup

### 1. Install MongoDB

**Windows**:
- Download from: https://www.mongodb.com/try/download/community
- Follow the official installer
- MongoDB typically runs on `mongodb://127.0.0.1:27017` by default

**Mac**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux**:
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### 2. Install Server Dependencies

```bash
cd server
npm install
```

### 3. Install Client Dependencies

```bash
cd client
npm install
```

## Configuration

### Server Configuration (.env)

Create or update `server/.env` with:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=attedence
JWT_SECRET=your_jwt_secret_key_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### Client Configuration (.env)

Create `client/.env` with:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Running the Application

### Start the Backend Server

```bash
cd server
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:5000`

### Start the Frontend Client

In a new terminal:

```bash
cd client
npm run dev
```

The client will typically run on `http://localhost:5173`

## Database Collections

The application uses the following MongoDB collections:

- **admins**: Admin user accounts
- **students**: Student accounts and enrollment info
- **attendance**: Daily attendance records
- **attendanceCodes**: Attendance marking codes (expires in 20 mins)
- **leaves**: Leave requests and approvals
- **config**: System configuration (slots, settings)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/profile` - Get current user profile

### Admin
- `GET /api/admin/students` - List all students
- `POST /api/admin/students` - Create new student
- `PUT /api/admin/students/:id` - Update student
- `DELETE /api/admin/students/:id` - Delete student
- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/alerts` - Attendance alerts for low attendance
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update system settings

### Attendance
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/day/:date` - Get attendance for a specific day
- `GET /api/attendance/month/:year/:month` - Get monthly attendance
- `POST /api/attendance/admin-update` - Admin update attendance

### Attendance Codes
- `POST /api/admin/generate-code` - Generate attendance code
- `GET /api/admin/active-codes` - Get active codes for today

### Student Dashboard
- `GET /api/student/dashboard` - Get student dashboard data

## Default Credentials

**Fallback Admin Login** (when no database users exist):
- Username: `admin`
- Password: `admin123`

These can be changed in `server/.env`

## Database Seeding

To seed sample data, you can use MongoDB Compass or the command line:

```bash
mongosh
use attedence

# Create a sample admin
db.admins.insertOne({
  username: "admin",
  password: "$2a$10$...", // bcrypt hash of "admin123"
  email: "admin@example.com",
  role: "admin"
})

# Create sample students
db.students.insertOne({
  studentId: "STU001",
  fullName: "John Doe",
  username: "student1",
  password: "$2a$10$...", // bcrypt hash
  email: "student1@example.com",
  role: "student",
  joinDate: new Date()
})
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running on `127.0.0.1:27017`
- Check `MONGODB_URI` in `server/.env`
- Verify MongoDB is listening: `mongosh --version`

### Login Fails
- Check credentials in database or use fallback admin (admin/admin123)
- Verify JWT_SECRET is set in `.env`
- Check server logs for detailed error messages

### CORS Errors
- Ensure `vite.config.js` has the proxy configuration for `/api`
- Verify client `.env` has correct `VITE_API_BASE_URL`

## Project Structure

```
.
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context (Auth)
│   │   └── main.jsx
│   ├── vite.config.js     # Vite configuration with API proxy
│   ├── .env               # Environment variables
│   └── package.json
│
└── server/                # Express backend
    ├── config/
    │   └── db.js          # MongoDB connection
    ├── controllers/       # Route handlers
    ├── middleware/        # Authentication, etc.
    ├── routes/            # API routes
    ├── utils/             # Utility functions
    ├── server.js          # Express server
    ├── .env               # Environment variables
    └── package.json
```

## Technology Stack

**Frontend**:
- React 19.2
- Vite 8.0
- Axios (HTTP client)
- Tailwind CSS (styling)
- React Router (navigation)

**Backend**:
- Node.js + Express 5.2
- MongoDB 5.13
- JWT (authentication)
- bcryptjs (password hashing)
- date-fns (date utilities)

## Notes

- The system has migrated from Firebase Firestore to MongoDB
- All authentication is now handled via JWT tokens
- Google authentication has been removed (username/password only)
- The application uses MongoDB ObjectId for document identification
- All API endpoints are relative to the base URL configured in the client

## Support

For issues or questions, check the server logs:

```bash
# Server logs will show MongoDB connection status and API errors
npm run dev
```

And browser console logs for client-side errors (F12 in browser).
