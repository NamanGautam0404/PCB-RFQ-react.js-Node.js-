# PCB RFQ Tracker

A full-stack PCB Request For Quote (RFQ) management system built with React, Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication**: Secure login/registration with JWT tokens
- **RFQ Management**: Create, update, delete, and track RFQs through stages
- **Role-based Access**: Sales and Manager dashboards with different permissions
- **Quote Management**: Track supplier quotes and margins
- **Activity Logging**: Full audit trail of all changes
- **Responsive UI**: Modern interface with Tailwind CSS

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- Git

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/NamanGautam0404/PCB-RFQ-react.js-Node.js-.git
cd PCB-RFQ-react.js-Node.js-
```

### 2. Backend Setup
```bash
cd pcb-backend
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in `pcb-backend/`:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

## 🏃 Running Locally

### Start Backend (Terminal 1)
```bash
cd pcb-backend
npm start
```
Backend runs on http://localhost:5001

### Start Frontend (Terminal 2)
```bash
cd frontend
npm start
```
Frontend runs on http://localhost:3000

## 🚀 Deployment

### Deploy to Render (Recommended)

#### Backend Deployment:
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Build command: `cd pcb-backend && npm install`
4. Start command: `node server.js`
5. Add environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Secure random string
   - `JWT_EXPIRE`: 7d
   - `FRONTEND_URL`: Your frontend URL

#### Frontend Deployment:
1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Build command: `cd frontend && npm run build`
4. Publish directory: `frontend/build`
5. Add environment variables:
   - `REACT_APP_API_URL`: Your backend API URL

### Deploy to Vercel + Railway

**Backend (Railway):**
1. Create new project on Railway
2. Connect GitHub repo
3. Add MongoDB plugin
4. Set environment variables

**Frontend (Vercel):**
1. Import project in Vercel
2. Set build command: `npm run build`
3. Set output directory: `build`
4. Add `REACT_APP_API_URL` environment variable

## 📁 Project Structure

```
PCB TRACKER/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── utils/          # Helper functions
│   │   ├── api.js          # API configuration
│   │   └── App.js          # Main app component
│   └── package.json
├── pcb-backend/             # Express backend
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/     # Auth middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   └── utils/          # Helper functions
│   ├── server.js           # Entry point
│   └── package.json
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### RFQs
- `GET /api/rfqs` - Get all RFQs
- `POST /api/rfqs` - Create RFQ
- `GET /api/rfqs/:id` - Get single RFQ
- `PUT /api/rfqs/:id` - Update RFQ
- `DELETE /api/rfqs/:id` - Delete RFQ

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Backend port | No (default: 5001) |
| NODE_ENV | Environment mode | No (default: development) |
| MONGODB_URI | MongoDB connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| JWT_EXPIRE | Token expiration time | No (default: 7d) |
| FRONTEND_URL | Frontend origin for CORS | Yes |

## 📝 License

MIT License

## 👤 Author

Naman Gautam

