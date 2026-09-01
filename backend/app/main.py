import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    admin,
    drivers,
    drivers_me,
    dropoff_requests,
    employee_requests,
    employees,
    pickup_requests,
    vehicles,
)
from app.scheduler import start_routing_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Background loop that auto-routes each week's requests after the
    # Saturday 11:59 PM deadline.
    scheduler_task = asyncio.create_task(start_routing_scheduler())
    try:
        yield
    finally:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Employee Routing System — Backend",
    version="1.0.0",
    description="Admin manages drivers, vehicles and request approvals",
    lifespan=lifespan,
)

# Allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(drivers_me.router)
app.include_router(drivers.router)

app.include_router(vehicles.router)
app.include_router(employee_requests.router)
app.include_router(pickup_requests.router)
app.include_router(dropoff_requests.router)
app.include_router(admin.router)
app.include_router(employees.router)



@app.get("/", tags=["Health"])
def health():
    return {"status": "ok"}

