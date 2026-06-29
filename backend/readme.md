# Backend Quickstart

FastAPI backend for the Data-Driven Employee Routing System.

## Setup

Create and activate a virtual environment inside `backend`:

```powershell
python -m venv myenv
.\myenv\Scripts\activate
pip install -r requirements.txt
```

Copy the environment example:

```powershell
copy .env.example .env
```

Fill in `SUPABASE_URL`, `SUPABASE_KEY`, and `JWT_SECRET_KEY` in `.env`.

## Run

From the `backend` folder:

```powershell
uvicorn app.main:app --reload
```

Open the API docs:

```text
http://127.0.0.1:8000/docs
```

## Login

Use `POST /auth/login`:

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

The user must have `status = "Active"` in the Supabase `users` table.

Copy `tokens.access_token`, click **Authorize** in Swagger, and enter:

```text
Bearer <access_token>
```

## Main Admin APIs

- `GET /drivers/`
- `POST /drivers/`
- `GET /drivers/{driver_id}`
- `PUT /drivers/{driver_id}`
- `DELETE /drivers/{driver_id}`
- `GET /vehicles/`
- `POST /vehicles/`
- `GET /vehicles/{vehicle_id}`
- `PUT /vehicles/{vehicle_id}`
- `DELETE /vehicles/{vehicle_id}`
- `POST /pickup-requests/{pickup_id}/approve`
- `POST /pickup-requests/{pickup_id}/reject`
- `GET /dropoff-requests/`
- `GET /dropoff-requests/{dropoff_id}`
- `POST /dropoff-requests/{dropoff_id}/approve`
- `POST /dropoff-requests/{dropoff_id}/reject`

Use list endpoints first to find IDs.
