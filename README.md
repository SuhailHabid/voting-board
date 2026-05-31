# Feature Voting Board

A webapp where team members can propose feature ideas and vote on the ones they want most.

Built with Django + Django REST Framework on the backend and React on the frontend.

---

## Stack

**Backend**
- Python + Django
- Django REST Framework
- DRF Token Authentication
- SQLite

**Frontend**
- React + Vite
- Axios
- React Query
- Tailwind CSS

---

## Running locally

### Backend

Make sure you have Python and Poetry installed.

```bash
From Root Folder:

cd voting-board-backend
python3 -m venv .venv
source .venv/bin/activate
poetry install
cd src
python manage.py migrate
python manage.py seed
python manage.py runserver 8001
```

The API will be running at `http://127.0.0.1:8001`

**Seeded user credentials:**
```
username: admin
password: password123
```

### Frontend

Make sure you have Node installed.

```bash
From Root Folder:

cd voting-board-frontend
npm install
npm run dev -- --port 5175
```

The app will be running at `http://localhost:5175`

---

## Running the test

```bash
cd voting-board-backend/src
python manage.py test
```

This runs the single focused test that verifies the one vote per user rule.

---

## Notes

- The backend and frontend run on different ports. CORS is configured in Django to allow requests from `http://localhost:5175`.
- No environment variables are needed to run locally.