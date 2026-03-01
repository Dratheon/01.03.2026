"""
Client Log Router
Frontend'den gelen hata ve aktivite loglarını kaydeder
"""

import logging
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Request, Header
from pydantic import BaseModel

router = APIRouter(prefix="/logs", tags=["logs"])

# Log klasörü
LOG_DIR = Path(__file__).parent.parent.parent.parent / "md.data" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Python logger yapılandırması
def setup_logger(name: str, log_file: Path, level=logging.INFO):
    """Logger oluştur"""
    handler = logging.FileHandler(log_file, encoding='utf-8')
    handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    ))
    
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.addHandler(handler)
    return logger

# Loggerlar
client_logger = setup_logger('client', LOG_DIR / 'client.log')
error_logger = setup_logger('errors', LOG_DIR / 'errors.log', logging.ERROR)
api_logger = setup_logger('api', LOG_DIR / 'api.log')


class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    data: Optional[dict] = None
    url: Optional[str] = None
    userAgent: Optional[str] = None
    userId: Optional[str] = None


class ClientLogsRequest(BaseModel):
    logs: List[LogEntry]


@router.post("/client")
async def receive_client_logs(
    request: ClientLogsRequest,
    req: Request,
    authorization: Optional[str] = Header(None)
):
    """
    Frontend'den gelen logları kaydet
    """
    client_ip = req.client.host if req.client else "unknown"
    
    for log in request.logs:
        # Log formatı
        log_data = {
            "timestamp": log.timestamp,
            "level": log.level,
            "message": log.message,
            "url": log.url,
            "userId": log.userId,
            "ip": client_ip,
            "data": log.data,
        }
        
        log_line = json.dumps(log_data, ensure_ascii=False)
        
        # Seviyeye göre logla
        if log.level == "ERROR":
            error_logger.error(log_line)
            client_logger.error(log_line)
        elif log.level == "WARN":
            client_logger.warning(log_line)
        else:
            client_logger.info(log_line)
    
    return {"success": True, "count": len(request.logs)}


@router.get("/recent")
async def get_recent_logs(
    type: str = "all",
    limit: int = 100,
    authorization: Optional[str] = Header(None)
):
    """
    Son logları getir (admin paneli için)
    """
    # TODO: Admin yetkisi kontrolü eklenebilir
    
    logs = []
    log_file = LOG_DIR / "client.log"
    
    if type == "errors":
        log_file = LOG_DIR / "errors.log"
    elif type == "api":
        log_file = LOG_DIR / "api.log"
    
    if not log_file.exists():
        return {"logs": [], "total": 0}
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            # Son N satır
            recent_lines = lines[-limit:] if len(lines) > limit else lines
            
            for line in reversed(recent_lines):
                line = line.strip()
                if not line:
                    continue
                    
                # Parse log line
                try:
                    # Format: 2024-01-15 12:30:45 - INFO - {...}
                    parts = line.split(' - ', 2)
                    if len(parts) >= 3:
                        timestamp = parts[0]
                        level = parts[1]
                        data = json.loads(parts[2]) if parts[2].startswith('{') else {"message": parts[2]}
                        logs.append({
                            "logTimestamp": timestamp,
                            "level": level,
                            **data
                        })
                except:
                    logs.append({"raw": line})
                    
    except Exception as e:
        return {"logs": [], "error": str(e)}
    
    return {"logs": logs, "total": len(logs)}


@router.delete("/clear")
async def clear_logs(
    type: str = "all",
    authorization: Optional[str] = Header(None)
):
    """
    Log dosyalarını temizle (admin)
    """
    # TODO: Admin yetkisi kontrolü
    
    cleared = []
    
    if type in ["all", "client"]:
        client_log = LOG_DIR / "client.log"
        if client_log.exists():
            client_log.write_text("")
            cleared.append("client")
    
    if type in ["all", "errors"]:
        error_log = LOG_DIR / "errors.log"
        if error_log.exists():
            error_log.write_text("")
            cleared.append("errors")
    
    if type in ["all", "api"]:
        api_log = LOG_DIR / "api.log"
        if api_log.exists():
            api_log.write_text("")
            cleared.append("api")
    
    return {"success": True, "cleared": cleared}


# API request logger middleware için helper
def log_api_request(method: str, path: str, status: int, duration_ms: float, user_id: str = None):
    """API isteğini logla"""
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "method": method,
        "path": path,
        "status": status,
        "duration_ms": round(duration_ms, 2),
        "userId": user_id,
    }
    api_logger.info(json.dumps(log_data, ensure_ascii=False))


def log_api_error(method: str, path: str, error: str, user_id: str = None):
    """API hatasını logla"""
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "method": method,
        "path": path,
        "error": error,
        "userId": user_id,
    }
    error_logger.error(json.dumps(log_data, ensure_ascii=False))
    api_logger.error(json.dumps(log_data, ensure_ascii=False))
