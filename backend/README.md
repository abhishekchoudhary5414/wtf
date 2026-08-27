# Backend quick notes

This file explains the `FRONTEND_BASE_URL` environment variable used by the backend to build browser redirects.

Usage

- To make backend-issued redirects deterministic, set `FRONTEND_BASE_URL` to your frontend origin. Example:

  ```bash
  # from the repository root
  cd backend
  # add to .env or export in your shell
  echo "FRONTEND_BASE_URL=http://localhost:3000" >> .env
  # or export for current session
  export FRONTEND_BASE_URL=http://localhost:3000
  ```

- The backend will prefer this value when a browser form POST to `/admin/login` occurs and will redirect to
  `${FRONTEND_BASE_URL}/admin/dashboard?token=<token>` (the token is included as a query parameter so the frontend can capture it).

Notes & troubleshooting

- After changing `.env` or exporting the variable, restart the backend (from the `backend` directory):

  ```bash
  uvicorn app.main:app --reload --port 8000
  ```

- If you don't set `FRONTEND_BASE_URL`, the backend falls back to the request `Origin` header, then the `Referer` header.

- Security: embedding tokens in URLs has risks (they can appear in logs or referer headers). Consider a more secure handoff for production (e.g. server-set cookies with proper SameSite/HttpOnly or a short-lived redirect page that POSTs the token).

File: `app/config.py` defines the setting default. See `app/main.py` for redirect logic.
# WTF Backend

## Setup

1. Create a virtual environment:
   python -m venv .venv
   source .venv/bin/activate

2. Install dependencies:
   pip install -r requirements.txt

3. Configure environment:
   cp .env.example .env

4. Create PostgreSQL database:
   createdb wtf_db

5. Create tables:
   python create_tables.py

6. Run the API:
   uvicorn app.main:app --reload

## Default admin account

Register a user through the API:

POST /admin/register

Example body:

{
  "username": "admin@wtf.com",
  "password": "StrongPassword123!",
  "role": "admin"
}

Then login:

POST /admin/login
