# Secure Note-Taking Application

REST API + basic frontend with JWT authentication and role-based access control (User / Admin).

## Links

| | URL |
|---|-----|
| **Live App** | https://secure-note-taking-application-fron.vercel.app/ |
| **Backend (GitHub)** | https://github.com/Sou963/Secure-Note-Taking-Application |
| **Frontend (GitHub)** | https://github.com/Sou963/Secure-Note-Taking-Application-frontend |
| **API Health** | https://secure-note-taking-application.vercel.app/api/health |

## Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB + Mongoose (MongoDB Atlas on production)
- **Auth**: JWT + bcryptjs
- **Deploy**: Vercel (API + frontend)

## Project Structure

```text
secure-note-app/
├── backend/                              # API / backend repository
│   ├── server.js
│   ├── api/
│   │   └── index.js                      # Vercel serverless entry
│   ├── vercel.json
│   ├── .env                              # Local only; do not commit
│   ├── package.json
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Note.js
│   │   └── Post.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── admin.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── notes.js
│   │   ├── users.js
│   │   └── posts.js
│   └── controllers/
│
└── frontend/                             # Basic frontend repository
    ├── index.html
    ├── app.js
    └── style.css
```

## Setup (Local)

### 1. Install MongoDB

Install and start MongoDB on `127.0.0.1:27017`, or use MongoDB Atlas and put the connection string in `.env`.

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Configure environment

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/secure-note-app
JWT_SECRET=supersecretjwtkey_change_in_production_12345
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5000
```

Production (MongoDB Atlas) example:

```env
MONGO_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/secure-note-app?retryWrites=true&w=majority
```

### 4. Seed an admin user (optional)

```bash
node seed.js
```

Creates:

- Admin: `admin@example.com` / `admin123`
- User: `user@example.com` / `user123`

### 5. Start the server

From the `backend` folder:

```bash
npm start
```

Open:

**http://localhost:5000**

Do not open `index.html` directly as a `file://` URL. The API must be served by Express, or the frontend must point to the deployed backend URL.

## Frontend API URL

In `frontend/app.js`:

```js
// Production
const API = "https://secure-note-taking-application.vercel.app/api";

// Local development
// const API = "http://localhost:5000/api";
```

## If Register/Login Shows "Request failed"

| Cause | Fix |
|---|---|
| MongoDB not running / wrong URI | Fix `MONGO_URI` and restart the server |
| Opened HTML as a file | Use the deployed URL or `http://localhost:5000` |
| Backend not started | `cd backend && npm install && npm start` |
| Wrong API base in `app.js` | Point `API` to the live backend `/api` |
| CORS issue | Set `CLIENT_URL` to the frontend URL |

## Deploy (Vercel)

### Backend

1. Repository:  
   https://github.com/Sou963/Secure-Note-Taking-Application

2. Set the Vercel project root to the backend folder containing `vercel.json` and `api/index.js`.

3. Add these Environment Variables:

```text
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<your JWT secret>
JWT_EXPIRE=7d
CLIENT_URL=https://secure-note-taking-application-fron.vercel.app
```

### Frontend

1. Repository:  
   https://github.com/Sou963/Secure-Note-Taking-Application-frontend

2. Deploy it as a static site on Vercel.

3. In `app.js`, ensure the API points to:

```js
const API = "https://secure-note-taking-application.vercel.app/api";
```

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register (role forced to `user`) |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Private | Current user profile |

### Notes

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/notes?page=1&limit=10` | Private | List notes (own for user, all for admin) |
| GET | `/api/notes/:id` | Private | Get one note |
| POST | `/api/notes` | Private | Create note |
| PUT | `/api/notes/:id` | Private | Update note (owner or admin) |
| DELETE | `/api/notes/:id` | Private | Delete note (owner or admin) |

### Users (Admin only)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users?page=1&limit=10` | Admin | List all users |
| GET | `/api/users/:id` | Admin | Get user |
| POST | `/api/users` | Admin | Create user (can set role) |
| PUT | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| GET | `/api/users/group-by-interests` | Admin | **Aggregation**: group users by interests |

### Posts (Public)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/posts?page=1&limit=10` | Public | List all posts |
| POST | `/api/posts` | Private | Create post |
| GET | `/api/posts/user/:userId` | Public | **Aggregation + `$lookup`**: posts of a user |

## Indexes (via `schema.index()`)

Indexes are created only for the queries used by the application and aggregation tasks.

### User

- `{ email: 1 }` unique — login / uniqueness
- `{ role: 1, createdAt: -1 }` — admin user listing + pagination
- `{ interests: 1 }` — interest grouping/filtering support

### Note

- `{ user: 1, createdAt: -1 }` — user's own notes + pagination
- `{ createdAt: -1 }` — admin note listing + pagination

### Post

- `{ author: 1, createdAt: -1 }` — posts by a particular user + pagination
- `{ createdAt: -1 }` — public post listing + pagination

## Aggregation Constraints Met

### 1. Group by Interests

- Uses exactly one `User.aggregate([...])` call.
- No other collection methods are used for this aggregation task.

### 2. User Posts

- Uses a single aggregation pipeline.
- Includes a `$lookup` stage to retrieve posts for the requested user.
- Designed to work with the required supporting indexes.

## Pagination

All list operations use pagination:

```text
?page=1&limit=10
```

Examples:

```text
GET /api/notes?page=1&limit=10
GET /api/users?page=1&limit=10
GET /api/posts?page=1&limit=10
```

## Roles

### User

- Register and login
- Create notes
- View own notes
- Update own notes
- Delete own notes
- Create public posts

### Admin

Everything a User can do, plus:

- List all users
- View individual users
- Create users
- Update users
- Delete users
- View everyone's notes
- Group users by interests

## Security

- Passwords are hashed using `bcryptjs`.
- Authentication uses JWT.
- Protected routes require a valid JWT.
- Admin-only routes require the `admin` role.
- User registration cannot self-select the `admin` role.
- MongoDB URI and JWT secret are stored in environment variables.
- `.env` should never be committed to Git.

## Demo Accounts (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `admin123` |
| User | `user@example.com` | `user123` |
