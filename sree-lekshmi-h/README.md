
# IdeaForge

## Project Name
IdeaForge – AI-Powered Hackathon Idea Generator

## What It Does

IdeaForge is an AI-powered web application that helps users generate hackathon project ideas based on their:

- Hackathon theme
- Skills
- Team size
- Experience level
- Available time
- Additional requirements

The application uses Google Gemini to generate five unique and practical hackathon project ideas. Each idea includes a problem statement, proposed solution, tech stack, MVP features, difficulty level, and elevator pitch.

## Screenshots

### Home Page
<img width="863" height="497" alt="image" src="https://github.com/user-attachments/assets/0809eba0-5355-4d8f-b1c7-c57daa54f2ca" />


### Idea Generation
<img width="765" height="511" alt="image" src="https://github.com/user-attachments/assets/198df865-2137-4f8f-a21e-206e0c645dca" />

### Generated Ideas
<img width="752" height="506" alt="image" src="https://github.com/user-attachments/assets/715dc0f2-45af-409d-91a7-d0358ff7b5c3" />

## Tech Stack

### Backend
- Python
- FastAPI
- Google Gemini API
- Pydantic
- JWT Authentication
- SlowAPI for rate limiting
- SQLAlchemy
- SQLite / PostgreSQL

### Frontend
- HTML
- CSS
- JavaScript

### Deployment
- Backend: Render
- Frontend: Vercel

## Features

- Generate five AI-powered hackathon project ideas
- Customize ideas based on skills and experience level
- Specify team size and available time
- Add additional requirements
- User registration and login
- JWT-based authentication
- Password hashing for secure credential storage
- Rate limiting for API requests
- Input validation on the frontend and backend
- Loading and error handling
- Simple and responsive web interface

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Checks whether the backend is running |
| POST | `/register` | Creates a new user account |
| POST | `/login` | Authenticates a user |
| POST | `/generate` | Generates five hackathon ideas (JWT required) |

## Live URLs

**Frontend:** [IdeaForge Frontend](https://month-01-sprint-b-projects-frontend-ochre.vercel.app)

**Backend:** [IdeaForge Backend](https://ideaforge-3ij8.onrender.com)

**API Documentation:** [FastAPI Swagger UI](https://ideaforge-3ij8.onrender.com/docs)

> Note: The Render free plan may put the backend to sleep after inactivity. The first request may take some time while the service starts.

## How to Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/sreelekshmi-h/month-01-sprint-B-projects.git
cd month-01-sprint-B-projects/sree-lekshmi-h
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the project directory and add the required environment variables:

```env
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your_secret_key
DATABASE_URL=your_database_url
```

Generate a secure secret key using:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

For local development, SQLite can be used if the application is configured to use it when `DATABASE_URL` is omitted.

**Important:** Never upload your `.env` file or expose your API keys on GitHub.

### 5. Start the Backend

```bash
uvicorn backend:app --reload
```

The backend will run at:

http://127.0.0.1:8000

Access the API documentation at:

http://127.0.0.1:8000/docs

### 6. Open the Frontend

Open `login.html` in your browser or serve the frontend files using a local static server.

Ensure the frontend is configured to communicate with `http://127.0.0.1:8000` during local development.

### 7. Use IdeaForge

1. Create an account.
2. Log in with your credentials.
3. Enter the hackathon theme and team details.
4. Click **Generate Ideas**.
5. Explore the five generated project ideas.

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `SECRET_KEY` | Secret key used for JWT authentication |
| `DATABASE_URL` | Optional database connection URL for PostgreSQL in production |

## Security

- Passwords are stored as salted PBKDF2-SHA256 hashes.
- JWT tokens are used to protect the idea generation endpoint.
- Authentication tokens expire after 30 minutes.
- Rate limits are applied to API requests.
- Sensitive configuration values are stored in environment variables.



---

*IdeaForge – Turn your hackathon theme into your next big idea.*
