"""
Notifications Router - Uygulama içi bildirim sistemi
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import json
import os
import uuid

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Data dosyası yolu
DATA_DIR = os.path.join(os.path.dirname(__file__), "../../../md.data")
NOTIFICATIONS_FILE = os.path.join(DATA_DIR, "notifications.json")


def generate_id():
    return f"NOTIF-{uuid.uuid4().hex[:8].upper()}"


def load_notifications() -> List[dict]:
    """Tüm bildirimleri yükle"""
    if not os.path.exists(NOTIFICATIONS_FILE):
        return []
    try:
        with open(NOTIFICATIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []


def save_notifications(notifications: List[dict]):
    """Bildirimleri kaydet"""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(NOTIFICATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(notifications, f, ensure_ascii=False, indent=2)


# ==================== MODELS ====================

class NotificationCreate(BaseModel):
    type: str  # job_created, job_completed, payment_received, task_assigned, etc.
    title: str
    message: str
    link: Optional[str] = None  # İlgili sayfa linki
    userId: Optional[str] = None  # Belirli bir kullanıcı için (None = tüm kullanıcılar)
    targetRole: Optional[str] = None  # Belirli bir rol için (admin, manager, etc.)
    priority: Optional[str] = "normal"  # low, normal, high
    relatedId: Optional[str] = None  # İlgili kayıt ID'si (jobId, orderId, etc.)
    relatedType: Optional[str] = None  # job, order, payment, task, etc.
    createdBy: Optional[str] = None  # Bildirimi oluşturan kullanıcı


class NotificationUpdate(BaseModel):
    read: Optional[bool] = None


# ==================== NOTIFICATION TYPES ====================
NOTIFICATION_TYPES = {
    # İş bildirimleri
    "job_created": {"icon": "assignment", "color": "primary"},
    "job_completed": {"icon": "check_circle", "color": "success"},
    "job_cancelled": {"icon": "cancel", "color": "danger"},
    "payment_received": {"icon": "payments", "color": "success"},
    
    # Randevu bildirimleri
    "measure_scheduled": {"icon": "event", "color": "info"},
    "measure_rescheduled": {"icon": "update", "color": "warning"},
    "assembly_scheduled": {"icon": "event", "color": "warning"},
    "assembly_completed": {"icon": "build", "color": "success"},
    "assembly_rescheduled": {"icon": "update", "color": "warning"},
    
    # Teklif bildirimleri
    "offer_sent": {"icon": "request_quote", "color": "primary"},
    "offer_approved": {"icon": "handshake", "color": "success"},
    "offer_rejected": {"icon": "thumb_down", "color": "danger"},
    
    # Üretim bildirimleri
    "production_started": {"icon": "precision_manufacturing", "color": "warning"},
    "production_completed": {"icon": "inventory_2", "color": "success"},
    "order_rescheduled": {"icon": "update", "color": "warning"},
    
    # Stok bildirimleri
    "stock_ready": {"icon": "inventory", "color": "success"},
    "stock_low": {"icon": "inventory", "color": "warning"},
    
    # Görev bildirimleri
    "task_assigned": {"icon": "assignment_ind", "color": "info"},
    "task_completed": {"icon": "task_alt", "color": "success"},
    
    # Diğer
    "order_created": {"icon": "shopping_cart", "color": "primary"},
    "order_delivered": {"icon": "local_shipping", "color": "success"},
    "document_uploaded": {"icon": "upload_file", "color": "info"},
    "customer_created": {"icon": "person_add", "color": "primary"},
    "system": {"icon": "notifications", "color": "secondary"},
}


# ==================== ENDPOINTS ====================

@router.get("")
async def get_notifications(
    userId: Optional[str] = None,
    unreadOnly: bool = False,
    limit: int = 50
):
    """Bildirimleri getir"""
    notifications = load_notifications()
    
    # Kullanıcıya göre filtrele
    if userId:
        notifications = [
            n for n in notifications 
            if n.get("userId") is None or n.get("userId") == userId
        ]
    
    # Okunmamış filtrelemesi
    if unreadOnly:
        notifications = [n for n in notifications if not n.get("read", False)]
    
    # Silinen bildirimleri filtrele
    notifications = [n for n in notifications if not n.get("deleted", False)]
    
    # Tarihe göre sırala (en yeni en üstte)
    notifications.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    
    # Limit uygula
    notifications = notifications[:limit]
    
    return notifications


@router.get("/unread-count")
async def get_unread_count(userId: Optional[str] = None):
    """Okunmamış bildirim sayısını getir"""
    notifications = load_notifications()
    
    # Kullanıcıya göre filtrele
    if userId:
        notifications = [
            n for n in notifications 
            if n.get("userId") is None or n.get("userId") == userId
        ]
    
    # Okunmamış ve silinmemiş
    unread = [
        n for n in notifications 
        if not n.get("read", False) and not n.get("deleted", False)
    ]
    
    return {"count": len(unread)}


@router.post("")
async def create_notification(notification: NotificationCreate):
    """Yeni bildirim oluştur"""
    notifications = load_notifications()
    
    type_info = NOTIFICATION_TYPES.get(notification.type, NOTIFICATION_TYPES["system"])
    
    new_notification = {
        "id": generate_id(),
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "link": notification.link,
        "userId": notification.userId,
        "targetRole": notification.targetRole,
        "priority": notification.priority or "normal",
        "relatedId": notification.relatedId,
        "relatedType": notification.relatedType,
        "createdBy": notification.createdBy,
        "icon": type_info["icon"],
        "color": type_info["color"],
        "read": False,
        "deleted": False,
        "createdAt": datetime.now().isoformat(),
    }
    
    notifications.insert(0, new_notification)  # En başa ekle
    
    # Maksimum 500 bildirim tut
    if len(notifications) > 500:
        notifications = notifications[:500]
    
    save_notifications(notifications)
    
    return new_notification


@router.put("/mark-all-read")
async def mark_all_read(userId: Optional[str] = None):
    """Tüm bildirimleri okundu olarak işaretle"""
    notifications = load_notifications()
    now = datetime.now().isoformat()
    
    count = 0
    for n in notifications:
        # Kullanıcıya ait ve okunmamış bildirimleri işaretle
        if not n.get("read", False) and not n.get("deleted", False):
            if userId is None or n.get("userId") is None or n.get("userId") == userId:
                n["read"] = True
                n["readAt"] = now
                count += 1
    
    save_notifications(notifications)
    
    return {"markedCount": count}


@router.put("/{notification_id}")
async def update_notification(notification_id: str, update: NotificationUpdate):
    """Bildirimi güncelle (okundu işaretle)"""
    notifications = load_notifications()
    
    for n in notifications:
        if n["id"] == notification_id:
            if update.read is not None:
                n["read"] = update.read
                n["readAt"] = datetime.now().isoformat() if update.read else None
            save_notifications(notifications)
            return n
    
    raise HTTPException(status_code=404, detail="Bildirim bulunamadı")


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    """Bildirimi sil (soft delete)"""
    notifications = load_notifications()
    
    for n in notifications:
        if n["id"] == notification_id:
            n["deleted"] = True
            n["deletedAt"] = datetime.now().isoformat()
            save_notifications(notifications)
            return {"success": True}
    
    raise HTTPException(status_code=404, detail="Bildirim bulunamadı")


@router.delete("")
async def clear_notifications(userId: Optional[str] = None):
    """Tüm bildirimleri temizle (soft delete)"""
    notifications = load_notifications()
    now = datetime.now().isoformat()
    
    count = 0
    for n in notifications:
        if not n.get("deleted", False):
            if userId is None or n.get("userId") is None or n.get("userId") == userId:
                n["deleted"] = True
                n["deletedAt"] = now
                count += 1
    
    save_notifications(notifications)
    
    return {"deletedCount": count}


# ==================== HELPER FUNCTIONS ====================

def create_system_notification(
    notification_type: str,
    title: str,
    message: str,
    link: str = None,
    related_id: str = None,
    related_type: str = None,
    created_by: str = None,
    target_role: str = None,
    user_id: str = None,
    priority: str = "normal"
):
    """
    Sistem tarafından bildirim oluşturma helper fonksiyonu.
    Diğer router'lardan çağrılabilir.
    """
    notifications = load_notifications()
    
    type_info = NOTIFICATION_TYPES.get(notification_type, NOTIFICATION_TYPES["system"])
    
    new_notification = {
        "id": generate_id(),
        "type": notification_type,
        "title": title,
        "message": message,
        "link": link,
        "userId": user_id,
        "targetRole": target_role,
        "priority": priority,
        "relatedId": related_id,
        "relatedType": related_type,
        "createdBy": created_by,
        "icon": type_info["icon"],
        "color": type_info["color"],
        "read": False,
        "deleted": False,
        "createdAt": datetime.now().isoformat(),
    }
    
    notifications.insert(0, new_notification)
    
    # Maksimum 500 bildirim tut
    if len(notifications) > 500:
        notifications = notifications[:500]
    
    save_notifications(notifications)
    
    return new_notification
