# MyRentPal

A full-stack rental management platform built with the MERN stack (MongoDB, Express, React, Node.js). MyRentPal is designed to connect **landlords** and **tenants**, providing a dedicated platform for managing rental properties and tenancies.

---

## Project Status

> Full backend complete. React frontend scaffolded with Vite — pages and routing are in place.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Node.js, Express.js                 |
| Database  | MongoDB Atlas (via Mongoose)        |
| Frontend  | React 18 + Vite, React Router DOM   |
| HTTP      | Axios                               |
| Dev Tools | Nodemon, dotenv, Vite dev server    |

---

## Project Structure

```
MyRentPal/
├── client/                  # React + Vite frontend
│   ├── index.html
│   ├── vite.config.js           # Vite config + API proxy
│   └── src/
│       ├── main.jsx             # React entry point
│       ├── App.jsx              # Routes & layout
│       ├── index.css
│       ├── context/
│       │   └── AuthContext.jsx  # Auth state, login, register, logout
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── PrivateRoute.jsx # Redirects unauthenticated users
│       └── pages/
│           ├── HomePage.jsx
│           ├── LoginPage.jsx
│           ├── RegisterPage.jsx
│           ├── PropertiesPage.jsx  # Browse & apply for listings
│           └── DashboardPage.jsx   # Role-aware: landlord or tenant view
└── server/
    ├── server.js            # Entry point — Express app setup
    ├── package.json
    ├── .env                 # Environment variables (not committed)
    ├── config/
    │   └── db.js            # MongoDB connection logic
    ├── models/
    │   ├── userModel.js              # Mongoose User schema
    │   ├── propertyModel.js          # Mongoose Property schema
    │   └── rentalApplicationModel.js # Mongoose RentalApplication schema
    ├── middleware/
    │   └── authMiddleware.js         # JWT protect + role-based restrictTo guards
    └── routes/
        ├── userRoutes.js             # User registration & login routes
        ├── propertyRoutes.js         # Property CRUD routes
        └── rentalApplicationRoutes.js # Tenant application routes
```

---

## API Endpoints

### Base URL: `http://localhost:5000`

| Method | Endpoint             | Description              | Access |
|--------|----------------------|--------------------------|--------|
| GET    | `/api`               | Health check             | Public |
| POST   | `/api/users/register`| Register a new user      | Public |
| POST   | `/api/users/login`   | Login and receive a JWT  | Public |
| GET    | `/api/properties`              | Get all available listings (filterable) | Public |
| GET    | `/api/properties/:id`          | Get a single listing by ID              | Public |
| POST   | `/api/properties`              | Create a new listing                    | Landlord only |
| GET    | `/api/properties/my-listings`  | Get the logged-in landlord's listings   | Landlord only |
| PUT    | `/api/properties/:id`          | Update a listing                        | Listing owner only |
| DELETE | `/api/properties/:id`          | Delete a listing                        | Listing owner only |
| POST   | `/api/applications/:propertyId`        | Submit a rental application             | Tenant only |
| GET    | `/api/applications/my-applications`    | View own submitted applications         | Tenant only |
| GET    | `/api/applications/received`           | View all received applications          | Landlord only |
| PUT    | `/api/applications/:id/status`         | Approve or reject an application        | Landlord only |
| DELETE | `/api/applications/:id`                | Withdraw a pending application          | Tenant only |

### POST `/api/users/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "yourpassword",
  "role": "tenant"
}
```
> `role` must be either `"landlord"` or `"tenant"`

**Responses:**
- `201 Created` — User registered successfully
- `400 Bad Request` — User already exists
- `500 Internal Server Error` — Server error

---

## User Model

```
name      — String, required
email     — String, required, unique
password  — String, required  (hashed with bcrypt before storage)
role      — String, required, enum: ['landlord', 'tenant']
createdAt — Auto-generated timestamp
updatedAt — Auto-generated timestamp
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account and cluster

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd MyRentPal
```

### 2. Set Up the Server

```bash
cd server
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `server/` folder:

```env
MONGO_URI=your_mongodb_atlas_connection_string
PORT=5000
JWT_SECRET=replace_with_a_strong_random_secret
```

### 4. Run the Server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

The server will be running at `http://localhost:5000`.

### 5. Set Up the Client

```bash
cd ../client
npm install
```

### 6. Run the Client

```bash
npm run dev
```

The frontend will be running at `http://localhost:3000` and will automatically proxy `/api` requests to the backend on port 5000.

---

## Roadmap

- [x] Express server setup
- [x] MongoDB Atlas connection
- [x] User model (landlord / tenant roles)
- [x] User registration endpoint
- [x] Password hashing (bcrypt)
- [x] User login + JWT authentication
- [x] Auth middleware (`protect` + `restrictTo` role guard)
- [x] Property listing model & routes (full CRUD)
- [x] Tenant-landlord relationship management (rental applications)
- [x] React frontend — Vite + React, routing, auth context, all pages
- [x] Protected routes & role-based dashboard (landlord vs tenant)
- [ ] Styling / UI polish
- [ ] Image uploads for property listings
- [ ] Deployment (Railway / Render for backend, Vercel for frontend)

---

## Known Issues / TODO

- **JWT_SECRET** in `.env` is a placeholder — replace with a strong random secret before deploying to production.
- The frontend uses inline styles — a UI library (e.g. Tailwind CSS or MUI) should be added for a polished look.
- No image upload support yet — the `images` field on properties stores URLs only.
