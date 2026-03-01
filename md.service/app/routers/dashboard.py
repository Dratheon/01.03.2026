"""
Dashboard Widget Verileri API
Her widget için ayrı endpoint ile gerçek zamanlı veri sağlar.
"""
from fastapi import APIRouter
from datetime import datetime, timedelta

from ..data_loader import load_json

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_date_range_filter(days=30):
    """Son N gün için tarih filtresi"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    return start_date.isoformat(), end_date.isoformat()


@router.get("/widgets/overview")
async def get_overview_stats():
    """Genel özet istatistikler - Yönetici için"""
    jobs = load_json("jobs.json")
    customers = load_json("customers.json")
    
    today = datetime.now().date().isoformat()
    this_month = datetime.now().strftime("%Y-%m")
    
    # Aktif işler
    active_jobs = [j for j in jobs if j.get("status") not in ["TAMAMLANDI", "IPTAL", "FIYAT_SORGUSU_RED"]]
    
    # Bu ay açılan işler
    month_jobs = [j for j in jobs if j.get("createdAt", "").startswith(this_month)]
    
    # Bugünkü randevular
    today_appointments = []
    for j in jobs:
        measure_date = j.get("measureDate", "")
        assembly_date = j.get("assemblyDate", "")
        if measure_date and measure_date.startswith(today):
            today_appointments.append({"type": "measure", "job": j})
        if assembly_date and assembly_date.startswith(today):
            today_appointments.append({"type": "assembly", "job": j})
    
    return {
        "activeJobs": len(active_jobs),
        "monthJobs": len(month_jobs),
        "totalCustomers": len([c for c in customers if not c.get("deleted")]),
        "todayAppointments": len(today_appointments)
    }


@router.get("/widgets/today-appointments")
async def get_today_appointments():
    """Bugünkü randevular - Ölçü, Üretim, Montaj, Servis ayrı ayrı"""
    jobs = load_json("jobs.json")
    production_orders = load_json("productionOrders.json")
    assembly_tasks = load_json("assemblyTasks.json")
    
    today = datetime.now().date().isoformat()
    
    # Ölçü randevuları
    measure_appointments = []
    for j in jobs:
        measure_date = j.get("measureDate", "")
        if measure_date and measure_date.startswith(today):
            measure_appointments.append({
                "id": j["id"],
                "customer": j.get("customerName", ""),
                "title": j.get("title", ""),
                "time": measure_date,
                "address": j.get("address", ""),
                "roles": [r.get("name") for r in j.get("roles", [])]
            })
    
    # Üretim teslim tarihleri
    production_deliveries = []
    for po in production_orders:
        est_date = po.get("estimatedDelivery", "")
        if est_date and est_date.startswith(today) and po.get("status") not in ["delivered", "cancelled"]:
            production_deliveries.append({
                "id": po["id"],
                "jobId": po.get("jobId"),
                "supplier": po.get("supplierName", ""),
                "type": po.get("orderType", ""),
                "status": po.get("status", "")
            })
    
    # Montaj randevuları (plannedDate kullanılıyor, scheduledDate değil)
    assembly_appointments = []
    for at in assembly_tasks:
        planned_date = at.get("plannedDate", "") or at.get("scheduledDate", "")
        if planned_date and planned_date.startswith(today) and at.get("status") not in ["completed", "cancelled"]:
            assembly_appointments.append({
                "id": at["id"],
                "jobId": at.get("jobId"),
                "customer": at.get("customerName", ""),
                "team": at.get("teamName", ""),
                "role": at.get("roleName", ""),
                "status": at.get("status", "")
            })
    
    # Servis randevuları
    service_appointments = []
    for j in jobs:
        if j.get("startType") == "SERVIS" and j.get("status") not in ["SERVIS_KAPALI", "ANLASILAMADI"]:
            service_data = j.get("service", {})
            appointment_date = service_data.get("appointmentDate", "")
            if appointment_date and appointment_date.startswith(today):
                service_appointments.append({
                    "id": j["id"],
                    "customer": j.get("customerName", ""),
                    "title": j.get("title", ""),
                    "team": j.get("assignedTeamName", ""),
                    "status": j.get("status", ""),
                    "isService": True
                })
    
    return {
        "measure": measure_appointments,
        "production": production_deliveries,
        "assembly": assembly_appointments,
        "service": service_appointments
    }


@router.get("/widgets/measure-status")
async def get_measure_status():
    """Ölçü durumu özeti"""
    jobs = load_json("jobs.json")
    
    status_counts = {
        "randevu_bekliyor": 0,
        "randevu_alindi": 0,
        "olcu_alindi": 0,
        "teknik_cizim": 0,
    }
    
    for job in jobs:
        # Müşteri ölçüsü işleri (fiyat sorgusu) hariç
        if job.get("startType") == "MUSTERI_OLCUSU":
            continue
        
        status = job.get("status", "")
        
        if status == "OLCU_RANDEVU_BEKLIYOR":
            status_counts["randevu_bekliyor"] += 1
        elif status == "OLCU_ALINDI":
            status_counts["olcu_alindi"] += 1
        elif status == "TEKNIK_CIZIM":
            status_counts["teknik_cizim"] += 1
        elif job.get("measureDate") and status not in ["TAMAMLANDI", "IPTAL", "KAPALI"]:
            status_counts["randevu_alindi"] += 1
    
    return {
        "counts": status_counts,
        "total": sum(status_counts.values())
    }


@router.get("/widgets/production-status")
async def get_production_status():
    """Üretim durumu özeti"""
    production_orders = load_json("productionOrders.json")
    
    today = datetime.now().date().isoformat()
    
    # Durum bazlı sayımlar
    status_counts = {
        "pending": 0,
        "ordered": 0,
        "in_production": 0,
        "ready": 0,
        "delivered": 0,
        "overdue": 0
    }
    
    overdue_list = []
    
    for po in production_orders:
        status = po.get("status", "pending")
        if status in status_counts:
            status_counts[status] += 1
        
        # Gecikme kontrolü
        est_date = po.get("estimatedDelivery", "")
        if est_date and est_date < today and status not in ["delivered", "cancelled"]:
            status_counts["overdue"] += 1
            overdue_list.append({
                "id": po["id"],
                "jobId": po.get("jobId"),
                "supplier": po.get("supplierName", ""),
                "daysLate": (datetime.now().date() - datetime.fromisoformat(est_date).date()).days
            })
    
    return {
        "counts": status_counts,
        "total": len(production_orders),
        "overdueItems": overdue_list[:5]
    }


@router.get("/widgets/assembly-status")
async def get_assembly_status():
    """Montaj durumu özeti"""
    assembly_tasks = load_json("assemblyTasks.json")
    teams = load_json("teams.json")
    
    today = datetime.now().date().isoformat()
    
    # Durum bazlı sayımlar
    status_counts = {
        "pending": 0,
        "scheduled": 0,
        "in_progress": 0,
        "completed": 0,
        "delayed": 0
    }
    
    team_workload = {}
    
    for at in assembly_tasks:
        status = at.get("status", "pending")
        if status in status_counts:
            status_counts[status] += 1
        
        # Gecikme kontrolü
        scheduled_date = at.get("scheduledDate", "")
        if scheduled_date and scheduled_date < today and status not in ["completed", "cancelled"]:
            status_counts["delayed"] += 1
        
        # Takım iş yükü
        team_id = at.get("teamId")
        if team_id and status not in ["completed", "cancelled"]:
            team_workload[team_id] = team_workload.get(team_id, 0) + 1
    
    # Takım isimlerini ekle
    team_names = {t["id"]: t.get("ad", "Takım") for t in teams}
    team_stats = [
        {"id": tid, "name": team_names.get(tid, "Takım"), "count": cnt}
        for tid, cnt in sorted(team_workload.items(), key=lambda x: -x[1])[:5]
    ]
    
    return {
        "counts": status_counts,
        "total": len(assembly_tasks),
        "teamWorkload": team_stats
    }


@router.get("/widgets/stock-alerts")
async def get_stock_alerts():
    """Stok uyarıları"""
    stock_items = load_json("stockItems.json")
    
    critical = []
    low = []
    
    for item in stock_items:
        on_hand = item.get("onHand", 0)
        critical_level = item.get("critical", 10)
        min_level = item.get("minLevel", critical_level * 2)
        
        if on_hand <= critical_level:
            critical.append({
                "id": item["id"],
                "name": item.get("name", ""),
                "code": f"{item.get('productCode', '')}-{item.get('colorCode', '')}",
                "current": on_hand,
                "critical": critical_level,
                "unit": item.get("unit", "adet")
            })
        elif on_hand <= min_level:
            low.append({
                "id": item["id"],
                "name": item.get("name", ""),
                "code": f"{item.get('productCode', '')}-{item.get('colorCode', '')}",
                "current": on_hand,
                "min": min_level,
                "unit": item.get("unit", "adet")
            })
    
    return {
        "critical": critical[:10],
        "low": low[:10],
        "criticalCount": len(critical),
        "lowCount": len(low)
    }


@router.get("/widgets/pending-orders")
async def get_pending_orders():
    """Bekleyen satınalma siparişleri"""
    purchase_orders = load_json("purchaseOrders.json")
    
    pending = []
    
    for po in purchase_orders:
        if po.get("status") in ["draft", "sent", "partial"]:
            pending.append({
                "id": po["id"],
                "supplier": po.get("supplierName", ""),
                "status": po.get("status", ""),
                "expectedDate": po.get("expectedDate", ""),
                "total": po.get("total", 0),
                "itemCount": len(po.get("items", []))
            })
    
    return {
        "orders": pending[:10],
        "totalCount": len(pending)
    }


@router.get("/widgets/recent-activities")
async def get_recent_activities():
    """Son aktiviteler"""
    jobs = load_json("jobs.json")
    
    # Son değişen işler
    recent = sorted(
        [j for j in jobs if j.get("updatedAt")],
        key=lambda x: x.get("updatedAt", ""),
        reverse=True
    )[:10]
    
    activities = []
    for job in recent:
        status = job.get("status", "")
        activities.append({
            "id": job["id"],
            "type": "job_update",
            "title": job.get("title", ""),
            "customer": job.get("customerName", ""),
            "status": status,
            "time": job.get("updatedAt", ""),
            "icon": get_status_icon(status)
        })
    
    return {"activities": activities}


@router.get("/widgets/weekly-summary")
async def get_weekly_summary():
    """Haftalık özet - Bu hafta ne yapıldı"""
    jobs = load_json("jobs.json")
    assembly_tasks = load_json("assemblyTasks.json")
    production_orders = load_json("productionOrders.json")
    
    # Bu hafta başlangıcı
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    week_start_str = week_start.isoformat()
    
    # Tamamlanan işler
    completed_jobs = len([
        j for j in jobs 
        if j.get("status") == "TAMAMLANDI" and 
        j.get("updatedAt", "").startswith(week_start_str[:7])
    ])
    
    # Alınan ölçüler
    measures_taken = len([
        j for j in jobs 
        if j.get("measureDate", "") >= week_start_str
    ])
    
    # Teslim edilen üretimler
    delivered_production = len([
        po for po in production_orders 
        if po.get("status") == "delivered" and 
        po.get("deliveredDate", "") >= week_start_str
    ])
    
    # Tamamlanan montajlar
    completed_assembly = len([
        at for at in assembly_tasks 
        if at.get("status") == "completed" and 
        at.get("completedAt", "") >= week_start_str
    ])
    
    return {
        "completedJobs": completed_jobs,
        "measuresTaken": measures_taken,
        "deliveredProduction": delivered_production,
        "completedAssembly": completed_assembly,
        "weekStart": week_start_str
    }


@router.get("/widgets/financial-summary")
async def get_financial_summary():
    """Finansal özet"""
    jobs = load_json("jobs.json")
    
    today = datetime.now()
    this_month = today.strftime("%Y-%m")
    
    total_revenue = 0
    total_collected = 0
    total_pending = 0
    
    for job in jobs:
        offer = job.get("offer", {})
        total = offer.get("total", 0) or 0
        
        # Bu ay onaylanan işler
        if job.get("approvedAt", "").startswith(this_month):
            total_revenue += total
        
        # Ödeme durumu
        payment_plan = job.get("paymentPlan", [])
        for payment in payment_plan:
            amount = payment.get("amount", 0) or 0
            if payment.get("paid"):
                total_collected += amount
            elif payment.get("status") != "cancelled":
                total_pending += amount
    
    return {
        "monthRevenue": total_revenue,
        "collected": total_collected,
        "pending": total_pending,
        "collectionRate": round((total_collected / (total_collected + total_pending) * 100) if (total_collected + total_pending) > 0 else 0, 1)
    }


@router.get("/widgets/tasks-summary")
async def get_tasks_summary():
    """Görev özeti"""
    tasks = load_json("tasks.json")
    task_assignments = load_json("task_assignments.json")
    
    # Durum bazlı - task model ile uyumlu (todo, in_progress, blocked, done)
    status_counts = {
        "todo": 0,
        "in_progress": 0,
        "blocked": 0,
        "done": 0
    }
    
    priority_counts = {
        "high": 0,
        "med": 0,
        "low": 0
    }
    
    for task in tasks:
        if task.get("deleted"):
            continue
        
        status = task.get("durum", "beklemede")
        priority = task.get("oncelik", "normal")
        
        if status in status_counts:
            status_counts[status] += 1
        if priority in priority_counts:
            priority_counts[priority] += 1
    
    return {
        "byStatus": status_counts,
        "byPriority": priority_counts,
        "total": sum(status_counts.values()),
        "assignedCount": len(task_assignments)
    }


@router.get("/widgets/inquiry-stats")
async def get_inquiry_stats():
    """Fiyat sorgusu istatistikleri"""
    jobs = load_json("jobs.json")
    
    inquiries = [j for j in jobs if j.get("startType") == "MUSTERI_OLCUSU"]
    
    approved = len([j for j in inquiries if j.get("status") == "FIYAT_SORGUSU_ONAY"])
    rejected = len([j for j in inquiries if j.get("status") == "FIYAT_SORGUSU_RED"])
    pending = len([j for j in inquiries if j.get("status") not in ["FIYAT_SORGUSU_ONAY", "FIYAT_SORGUSU_RED", "TAMAMLANDI"]])
    
    conversion_rate = round((approved / len(inquiries) * 100) if len(inquiries) > 0 else 0, 1)
    
    return {
        "total": len(inquiries),
        "approved": approved,
        "rejected": rejected,
        "pending": pending,
        "conversionRate": conversion_rate
    }


def get_status_icon(status):
    """Duruma göre ikon döndür"""
    icons = {
        "OLCU_RANDEVU_BEKLIYOR": "📞",
        "OLCU_ALINDI": "📐",
        "TEKNIK_CIZIM": "📏",
        "TEKLIF_HAZIRLANIYOR": "💰",
        "TEKLIF_ONAY_BEKLIYOR": "⏳",
        "ONAY_ALINDI": "✅",
        "URETIMDE": "🏭",
        "MONTAJ_BEKLIYOR": "🔧",
        "MONTAJDA": "🛠️",
        "TAMAMLANDI": "✅",
        "IPTAL": "❌"
    }
    return icons.get(status, "📋")