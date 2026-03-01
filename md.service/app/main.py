import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .routers import (
    activities,
    archive,
    assembly,
    auth,
    colors,
    customers,
    dashboard,
    documents,
    finance,
    folders,
    jobs,
    logs,
    notifications,
    personnel,
    planning,
    production,
    purchase,
    reports,
    roles,
    settings,
    stock,
    suppliers,
    tasks,
    teams,
    users,
)
from .routers.logs import log_api_request, log_api_error

app = FastAPI(
    title="MD Service",
    description="Modüler FastAPI backend; veri kaynağı md.data klasörü.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(activities.router)
app.include_router(dashboard.router)
app.include_router(jobs.router)
app.include_router(tasks.router)
app.include_router(customers.router)
app.include_router(notifications.router)
app.include_router(personnel.router)
app.include_router(roles.router)
app.include_router(teams.router)
app.include_router(planning.router)
app.include_router(stock.router)
app.include_router(purchase.router)
app.include_router(suppliers.router)
app.include_router(finance.router)
app.include_router(archive.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(colors.router)
app.include_router(documents.router)
app.include_router(folders.router)
app.include_router(production.router)
app.include_router(assembly.router)
app.include_router(users.router)
app.include_router(logs.router)


# API Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Her API isteğini logla"""
    start_time = time.time()
    
    # User ID'yi header'dan al (varsa)
    user_id = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # Token'dan user_id çıkarılabilir ama şimdilik basit tutalım
        pass
    
    try:
        response = await call_next(request)
        
        # Süreyi hesapla
        duration_ms = (time.time() - start_time) * 1000
        
        # Sadece API isteklerini logla (static dosyalar hariç)
        path = request.url.path
        if not path.startswith("/docs") and not path.startswith("/openapi") and path != "/health":
            # Hata durumlarını ayrı logla
            if response.status_code >= 400:
                log_api_error(
                    request.method,
                    path,
                    f"HTTP {response.status_code}",
                    user_id
                )
            elif response.status_code >= 200:
                log_api_request(
                    request.method,
                    path,
                    response.status_code,
                    duration_ms,
                    user_id
                )
        
        return response
        
    except Exception as e:
        # Exception durumunda logla
        duration_ms = (time.time() - start_time) * 1000
        log_api_error(
            request.method,
            request.url.path,
            str(e),
            user_id
        )
        raise


@app.get("/health", tags=["meta"])
def health():
  return {"status": "ok"}

