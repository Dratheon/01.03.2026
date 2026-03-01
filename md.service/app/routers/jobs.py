from copy import deepcopy
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional

from ..data_loader import load_json, save_json
from ..activity_logger import log_activity, get_action_icon
from .notifications import create_system_notification
from .auth import get_user_info

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _generate_job_id() -> str:
    """
    Yıl+Ay+Sıra formatında iş kodu oluştur
    Format: YYYYMM#### (örn: 2026010001 = 2026 Ocak 1. iş)
    Her ay sıra numarası 0001'den başlar
    """
    now = datetime.now()
    year_month = now.strftime("%Y%m")  # "202601"
    
    jobs = load_json("jobs.json")
    
    # Bu ay açılan işlerin kodlarını bul
    current_month_jobs = []
    for job in jobs:
        job_id = job.get("id", "")
        # Yeni format kontrolü (10 haneli sayısal)
        if job_id.isdigit() and len(job_id) == 10 and job_id.startswith(year_month):
            current_month_jobs.append(job_id)
    
    # En yüksek sıra numarasını bul
    if current_month_jobs:
        # Son 4 hane sıra numarası
        max_seq = max(int(jid[-4:]) for jid in current_month_jobs)
        next_seq = max_seq + 1
    else:
        next_seq = 1
    
    # Yeni ID: YYYYMM + 4 haneli sıra
    new_id = f"{year_month}{next_seq:04d}"
    return new_id


def _now_iso() -> str:
  return datetime.utcnow().isoformat()


def _jobs():
  return load_json("jobs.json")


def _save_jobs(data):
  save_json("jobs.json", data)


class JobCreate(BaseModel):
  customerId: str
  customerName: str
  title: str
  startType: str = Field(..., pattern="^(OLCU|MUSTERI_OLCUSU|SERVIS|ARSIV)$")
  roles: list = []
  serviceNote: str | None = None
  serviceFixedFee: float | None = None
  # Arşiv kaydı için
  isArchive: bool = False
  archiveDate: str | None = None
  archiveCompletedDate: str | None = None
  archiveTotalAmount: float | None = None
  archiveNote: str | None = None


class MeasureUpdate(BaseModel):
  measurements: dict | None = None
  appointment: dict | None = None
  service: dict | None = None  # Servis işleri için
  status: str | None = None  # Opsiyonel statü güncellemesi


class OfferUpdate(BaseModel):
  lines: list
  total: float
  status: str = "TEKLIF_TASLAK"
  rolePrices: dict | None = None  # İş kolu bazlı fiyatlar
  notifiedDate: str | None = None  # Bildirim tarihi
  agreedDate: str | None = None  # Anlaşma tarihi
  negotiationHistory: list | None = None  # Pazarlık geçmişi


class ApprovalStart(BaseModel):
  paymentPlan: dict
  contractUrl: str | None = None
  stockNeeds: list = []
  estimatedAssembly: dict | None = None  # Montaj termini


class StockItem(BaseModel):
  id: str
  name: str
  productCode: str | None = None
  colorCode: str | None = None
  qty: int
  unit: str | None = None

class StockStatus(BaseModel):
  ready: bool
  purchaseNotes: str | None = None
  items: list[StockItem] | None = None
  estimatedDate: str | None = None  # Tahmini hazır olma tarihi (Sonra Üret için)
  skipStock: bool = False  # Dış üretim işleri için stok atla


class ProductionStatus(BaseModel):
  status: str = Field(..., pattern="^(URETIMDE|MONTAJA_HAZIR|TESLIME_HAZIR|ANLASMADA)$")
  note: str | None = None
  agreementDate: str | None = None
  deliveryType: str | None = None  # "montajli" veya "demonte"


class AssemblySchedule(BaseModel):
  date: str
  note: str | None = None
  team: str | None = None


class AssemblyComplete(BaseModel):
  date: str | None = None
  note: str | None = None
  team: str | None = None
  completed: bool = True
  proof: dict | None = None


class FinanceClose(BaseModel):
  total: float
  payments: dict
  discount: dict | None = None  # {"amount": float, "note": str}


class StatusUpdate(BaseModel):
  status: str
  service: dict | None = None  # Servis işleri için ek bilgiler
  offer: dict | None = None  # Fiyat/teklif bilgileri
  rejection: dict | None = None  # Ret bilgileri
  cancelReason: str | None = None  # İptal sebebi (IPTAL durumunda zorunlu)
  cancelNote: str | None = None  # İptal açıklaması


class InquiryDecision(BaseModel):
  """Fiyat sorgusu (Müşteri Ölçüsü) için Onay/Red kararı"""
  decision: str = Field(..., pattern="^(ONAY|RED)$")
  cancelReason: str | None = None  # Red durumunda zorunlu
  note: str | None = None


def _find_job(job_id: str):
  data = _jobs()
  for idx, job in enumerate(data):
    if job.get("id") == job_id:
      return data, idx, job
  raise HTTPException(status_code=404, detail="Job not found")


def _log(job: dict, action: str, note: str | None = None, user_id: str = None, user_name: str = None):
  logs = job.get("logs", [])
  log_entry = {"at": _now_iso(), "action": action, "note": note}
  if user_id:
    log_entry["userId"] = user_id
    log_entry["userName"] = user_name
  logs.append(log_entry)
  job["logs"] = logs


@router.get("/")
def list_jobs(include_deleted: bool = False):
  """İşleri listele - varsayılan olarak silinmişler hariç"""
  jobs = _jobs()
  if not include_deleted:
    jobs = [j for j in jobs if not j.get("deleted")]
  return jobs


@router.get("/{job_id}")
def get_job(job_id: str):
  for job in _jobs():
    if job.get("id") == job_id:
      return job
  raise HTTPException(status_code=404, detail="Job not found")


@router.post("/", status_code=201)
def create_job(payload: JobCreate, authorization: Optional[str] = Header(None)):
  user_id, user_name = get_user_info(authorization)
  data = _jobs()
  new_id = _generate_job_id()
  
  # Arşiv işi mi kontrol et
  if payload.isArchive or payload.startType == "ARSIV":
    # Arşiv kaydı - doğrudan KAPALI durumunda
    job = {
        "id": new_id,
        "title": payload.title,
        "customerId": payload.customerId,
        "customerName": payload.customerName,
        "status": "KAPALI",
        "startType": "ARSIV",
        "roles": payload.roles or [],
        "measure": {"completed": True},
        "offer": {"completed": True},
        "approval": {
            "started": True,
            "completed": True,
            "totalAmount": payload.archiveTotalAmount or 0,
            "paymentPlan": {"type": "archive"},
            "archiveDate": payload.archiveDate,
        },
        "stock": {"ready": True, "completed": True},
        "production": {"status": "completed", "completed": True},
        "assembly": {"completed": True, "date": payload.archiveCompletedDate},
        "finance": {
            "closed": True,
            "total": payload.archiveTotalAmount or 0,
        },
        "service": {},
        "roleFiles": {},
        "rolePrices": {},
        "logs": [],
        "notes": payload.archiveNote,
        "isArchive": True,
        "archiveDate": payload.archiveDate,
        "archiveCompletedDate": payload.archiveCompletedDate,
        "createdAt": payload.archiveDate or _now_iso(),
    }
    _log(job, "archive_created", f"Arşiv kaydı oluşturuldu - Tutar: {payload.archiveTotalAmount}", user_id, user_name)
    data.insert(0, job)
    _save_jobs(data)
    
    # Aktivite log
    log_activity(user_id, user_name, "job_create", "job", new_id, 
                 payload.title, f"Arşiv kaydı oluşturuldu - Müşteri: {payload.customerName}",
                 get_action_icon("job_create"))
    return job
  
  # Normal iş akışı
  # Başlatma türüne göre statü belirle
  status_map = {
      "OLCU": "OLCU_RANDEVU_BEKLIYOR",
      "MUSTERI_OLCUSU": "MUSTERI_OLCUSU_BEKLENIYOR",
      "SERVIS": "SERVIS_RANDEVU_BEKLIYOR"
  }
  status = status_map.get(payload.startType, "OLCU_RANDEVU_BEKLIYOR")
  
  job = {
      "id": new_id,
      "title": payload.title,
      "customerId": payload.customerId,
      "customerName": payload.customerName,
      "status": status,
      "startType": payload.startType,
      "roles": payload.roles or [],
      "measure": {},
      "offer": {},
      "approval": {},
      "stock": {},
      "production": {},
      "assembly": {},
      "finance": {},
      "service": {
          "note": payload.serviceNote,
          "fixedFee": payload.serviceFixedFee,
          "extraMaterials": [],
          "completed": False
      } if payload.startType == "SERVIS" else {},
      "roleFiles": {},
      "rolePrices": {},
      "logs": [],
      "createdAt": _now_iso(),
  }
  _log(job, "created", f"startType={payload.startType}", user_id, user_name)
  data.insert(0, job)
  _save_jobs(data)
  
  # Aktivite log
  start_type_labels = {"OLCU": "Ölçü", "MUSTERI_OLCUSU": "Müşteri Ölçüsü", "SERVIS": "Servis"}
  log_activity(user_id, user_name, "job_create", "job", new_id, 
               payload.title, f"Yeni iş oluşturuldu ({start_type_labels.get(payload.startType, payload.startType)}) - Müşteri: {payload.customerName}",
               get_action_icon("job_create"))
  
  # Bildirim oluştur
  create_system_notification(
      notification_type="job_created",
      title="Yeni İş Oluşturuldu",
      message=f"{payload.title} - {payload.customerName}",
      link=f"/isler?id={new_id}",
      related_id=new_id,
      related_type="job",
      created_by=user_name,
      target_role="manager"
  )
  
  return job


@router.put("/{job_id}/measure")
def update_measure(job_id: str, payload: MeasureUpdate, authorization: Optional[str] = Header(None)):
  user_id, user_name = get_user_info(authorization)
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)
  
  # Mevcut measure bilgilerini koru ve güncelle
  existing_measure = job.get("measure", {})
  
  # Hangi alanlar gönderildi kontrol et (null olsa bile)
  if "measurements" in payload.model_fields_set:
    if payload.measurements is not None:
      existing_measure["measurements"] = payload.measurements
    else:
      existing_measure.pop("measurements", None)
  
  if "appointment" in payload.model_fields_set:
    if payload.appointment is not None:
      old_appointment = existing_measure.get("appointment", {})
      existing_measure["appointment"] = payload.appointment
      # Randevu tarihi değişti - log
      appt_date = payload.appointment.get("date", "")
      appt_time = payload.appointment.get("time", "")
      log_activity(user_id, user_name, "job_measure_schedule", "job", job_id, 
                   job_title, f"Ölçü randevusu: {appt_date}", get_action_icon("schedule"))
      
      # Bildirim oluştur - Yeni randevu veya güncelleme
      customer_name = job.get("customerName", "")
      if old_appointment.get("date"):
        # Randevu güncellendi
        create_system_notification(
            notification_type="measure_rescheduled",
            title="Ölçü Randevusu Güncellendi",
            message=f"{job_title} - {customer_name} | {appt_date} {appt_time}",
            link=f"/isler?id={job_id}",
            related_id=job_id,
        )
      else:
        # Yeni randevu
        create_system_notification(
            notification_type="measure_scheduled",
            title="Ölçü Randevusu Belirlendi",
            message=f"{job_title} - {customer_name} | {appt_date} {appt_time}",
            link=f"/isler?id={job_id}",
            related_id=job_id,
        )
    else:
      existing_measure.pop("appointment", None)
  
  job["measure"] = existing_measure
  
  # Servis bilgilerini ayrı kaydet
  if payload.service:
    existing_service = job.get("service", {})
    job["service"] = {**existing_service, **payload.service}
  
  # Statü güncellemesi
  if payload.status:
    old_status = job.get("status", "")
    job["status"] = payload.status
    _log(job, "status.updated", f"{old_status} -> {payload.status}", user_id, user_name)
    log_activity(user_id, user_name, "job_status_change", "job", job_id, 
                 job_title, f"Durum değişti: {old_status} → {payload.status}", get_action_icon("job_status_change"))
  else:
    _log(job, "measure.updated", None, user_id, user_name)
  
  data[idx] = job
  _save_jobs(data)
  return job


class MeasureIssue(BaseModel):
  """Ölçü aşaması sorun bildirimi"""
  issueType: str  # Settings'den gelen ID (measurement_error, wrong, etc.)
  faultSource: str  # Settings'den gelen ID (measurement, customer, etc.)
  description: str
  responsiblePersonId: str | None = None
  photoUrl: str | None = None


@router.post("/{job_id}/measure/issue")
def report_measure_issue(job_id: str, payload: MeasureIssue):
  """Ölçü aşamasında sorun bildir"""
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  
  measure = job.get("measure", {})
  issues = measure.get("issues", [])
  
  new_issue = {
    "id": _gen_id("MI"),
    "issueType": payload.issueType,
    "faultSource": payload.faultSource,
    "description": payload.description,
    "responsiblePersonId": payload.responsiblePersonId,
    "photoUrl": payload.photoUrl,
    "status": "pending",
    "createdAt": _now_iso(),
  }
  
  issues.append(new_issue)
  measure["issues"] = issues
  job["measure"] = measure
  
  _log(job, "measure.issue.reported", f"Sorun: {payload.issueType} - {payload.description[:50]}")
  
  data[idx] = job
  _save_jobs(data)
  return job


@router.post("/{job_id}/measure/issue/{issue_id}/resolve")
def resolve_measure_issue(job_id: str, issue_id: str):
  """Ölçü sorununu çözüldü olarak işaretle"""
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  
  measure = job.get("measure", {})
  issues = measure.get("issues", [])
  
  for issue in issues:
    if issue.get("id") == issue_id:
      issue["status"] = "resolved"
      issue["resolvedAt"] = _now_iso()
      break
  
  measure["issues"] = issues
  job["measure"] = measure
  
  _log(job, "measure.issue.resolved", f"Sorun çözüldü: {issue_id}")
  
  data[idx] = job
  _save_jobs(data)
  return job


@router.put("/{job_id}/offer")
def update_offer(job_id: str, payload: OfferUpdate, authorization: Optional[str] = Header(None)):
  user_id, user_name = get_user_info(authorization)
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)
  customer_name = job.get("customerName", "")
  old_status = job.get("status", "")
  
  job["offer"] = payload.model_dump()
  job["status"] = payload.status or "TEKLIF_TASLAK"
  _log(job, "offer.updated", None, user_id, user_name)
  data[idx] = job
  _save_jobs(data)
  
  # Aktivite log
  log_activity(user_id, user_name, "job_offer_update", "job", job_id, 
               job_title, f"Teklif güncellendi - Toplam: {payload.total:,.2f}₺", get_action_icon("job_offer_update"))
  
  # Bildirim oluştur - Teklif gönderildi (TEKLIF_ONAY_BEKLIYOR durumuna geçtiyse)
  if payload.status == "TEKLIF_ONAY_BEKLIYOR" and old_status != "TEKLIF_ONAY_BEKLIYOR":
    create_system_notification(
        notification_type="offer_sent",
        title="Teklif Gönderildi",
        message=f"{job_title} - {customer_name} | {payload.total:,.2f}₺",
        link=f"/isler?id={job_id}",
        related_id=job_id,
    )
  
  return job


@router.post("/{job_id}/approval/start")
def start_approval(job_id: str, payload: ApprovalStart):
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)
  customer_name = job.get("customerName", "")
  offer_total = job.get("offer", {}).get("total", 0)
  
  approval_data = payload.model_dump()
  
  # estimatedAssembly ayrı saklanır (approval içinde değil, job kökünde)
  estimated_assembly = approval_data.pop("estimatedAssembly", None)
  
  job["approval"] = approval_data
  if estimated_assembly:
    job["estimatedAssembly"] = estimated_assembly
  
  job["status"] = "ANLASMA_TAMAMLANDI"
  _log(job, "approval.started")
  data[idx] = job
  _save_jobs(data)
  
  # Bildirim oluştur - Teklif onaylandı
  create_system_notification(
      notification_type="offer_approved",
      title="Teklif Onaylandı",
      message=f"{job_title} - {customer_name} | {offer_total:,.2f}₺",
      link=f"/isler?id={job_id}",
      related_id=job_id,
  )
  
  return job


class PaymentUpdate(BaseModel):
  paymentPlan: dict


@router.put("/{job_id}/approval/payment")
def update_payment(job_id: str, payload: PaymentUpdate):
  """Ödeme planını güncelle (tahsilat, çek detayı vs.)"""
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  
  if "approval" not in job:
    job["approval"] = {}
  
  job["approval"]["paymentPlan"] = payload.paymentPlan
  _log(job, "payment.updated")
  data[idx] = job
  _save_jobs(data)
  return job


@router.put("/{job_id}/stock")
def update_stock(job_id: str, payload: StockStatus):
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)
  customer_name = job.get("customerName", "")
  
  stock = job.get("stock", {})
  stock["ready"] = payload.ready
  stock["purchaseNotes"] = payload.purchaseNotes
  stock["skipStock"] = payload.skipStock
  # Seçilen stok kalemlerini kaydet (arşiv için)
  if payload.items:
    stock["items"] = [item.model_dump() for item in payload.items]
  # Tahmini hazır olma tarihi (Sonra Üret için)
  if payload.estimatedDate:
    stock["estimatedDate"] = payload.estimatedDate
  job["stock"] = stock
  # Dış üretim stoksuz devam veya normal akış
  if payload.skipStock:
    job["status"] = "URETIME_HAZIR"
    _log(job, "stock.skipped", "Dış üretim - stoksuz devam edildi")
  else:
    # ready=True -> Üretime Hazır, ready=False -> Sonra Üretilecek (rezerve edildi)
    job["status"] = "URETIME_HAZIR" if payload.ready else "SONRA_URETILECEK"
    _log(job, "stock.updated", f"ready={payload.ready}, items={len(payload.items or [])}, estimatedDate={payload.estimatedDate}")
  data[idx] = job
  _save_jobs(data)
  
  # Bildirim oluştur - Stok hazır
  if payload.ready or payload.skipStock:
    create_system_notification(
        notification_type="stock_ready",
        title="Stok Hazır - Üretime Geçilebilir",
        message=f"{job_title} - {customer_name}",
        link=f"/isler?id={job_id}",
        related_id=job_id,
    )
  
  return job


@router.put("/{job_id}/production")
def production_status(job_id: str, payload: ProductionStatus):
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)
  customer_name = job.get("customerName", "")
  old_status = job.get("status", "")
  
  prod_data = {"status": payload.status, "note": payload.note}
  if payload.agreementDate:
    prod_data["agreementDate"] = payload.agreementDate
  job["production"] = prod_data
  job["status"] = payload.status
  
  # Teslim tipi - demonte veya montajlı
  if payload.deliveryType:
    job["deliveryType"] = payload.deliveryType
  
  # Demonte teslim seçildiyse montaj aşaması atlanacak
  if payload.status == "TESLIME_HAZIR":
    job["deliveryType"] = "demonte"
    _log(job, "production.updated", f"{payload.status} - Demonte/Fabrikadan Teslim")
  else:
    _log(job, "production.updated", payload.status)
  
  data[idx] = job
  _save_jobs(data)
  
  # Bildirimler - Üretim durumu değişiklikleri
  if payload.status == "URETIMDE" and old_status != "URETIMDE":
    create_system_notification(
        notification_type="production_started",
        title="Üretim Başladı",
        message=f"{job_title} - {customer_name}",
        link=f"/isler?id={job_id}",
        related_id=job_id,
    )
  elif payload.status in ["MONTAJA_HAZIR", "TESLIME_HAZIR"] and old_status not in ["MONTAJA_HAZIR", "TESLIME_HAZIR"]:
    create_system_notification(
        notification_type="production_completed",
        title="Üretim Tamamlandı",
        message=f"{job_title} - {customer_name} | {'Montaja hazır' if payload.status == 'MONTAJA_HAZIR' else 'Teslime hazır'}",
        link=f"/isler?id={job_id}",
        related_id=job_id,
    )
  
  return job


class EstimatedAssemblyUpdate(BaseModel):
  date: str
  note: str | None = None


@router.put("/{job_id}/estimated-assembly")
def update_estimated_assembly(job_id: str, payload: EstimatedAssemblyUpdate):
  """Montaj terminini güncelle (müşteriye söylenilen tarih)"""
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  
  # Önceki termini history'ye kaydet
  prev = job.get("estimatedAssembly", {})
  if prev.get("date"):
    history = job.get("estimatedAssemblyHistory", [])
    history.append({
      "date": prev.get("date"),
      "note": prev.get("note"),
      "changedAt": _now_iso(),
    })
    job["estimatedAssemblyHistory"] = history
  
  job["estimatedAssembly"] = {
    "date": payload.date,
    "note": payload.note,
    "setAt": _now_iso(),
  }
  _log(job, "estimatedAssembly.updated", payload.date)
  data[idx] = job
  _save_jobs(data)
  return job


class RolesUpdate(BaseModel):
  roles: list  # [{id: str, name: str, ...}]


@router.put("/{job_id}/roles")
def update_job_roles(job_id: str, payload: RolesUpdate, authorization: Optional[str] = Header(None)):
  """İş kollarını güncelle (yeni iş kolu ekleme için)"""
  user_id, user_name = get_user_info(authorization)
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  
  old_roles = job.get("roles", [])
  old_role_ids = {r.get("id") for r in old_roles}
  new_role_ids = {r.get("id") for r in payload.roles}
  
  # Yeni eklenen iş kollarını bul
  added_roles = [r for r in payload.roles if r.get("id") not in old_role_ids]
  
  job["roles"] = payload.roles
  
  # Log
  if added_roles:
    added_names = ", ".join(r.get("name", "?") for r in added_roles)
    _log(job, "roles.added", f"Eklenen: {added_names}", user_id, user_name)
  else:
    _log(job, "roles.updated", f"Toplam: {len(payload.roles)}", user_id, user_name)
  
  data[idx] = job
  _save_jobs(data)
  
  # Aktivite log
  log_activity(user_id, user_name, "job_update", "job", job_id, 
               job.get("title"), f"İş kolları güncellendi - Toplam: {len(payload.roles)}",
               get_action_icon("job_update"))
  
  return job


@router.put("/{job_id}/assembly/schedule")
def assembly_schedule(job_id: str, payload: AssemblySchedule):
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)
  customer_name = job.get("customerName", "")
  
  job["assembly"] = job.get("assembly", {})
  job["assembly"]["schedule"] = payload.model_dump()
  job["status"] = "MONTAJ_TERMIN"
  _log(job, "assembly.scheduled")
  data[idx] = job
  _save_jobs(data)
  
  # Bildirim oluştur - Montaj tarihi belirlendi
  create_system_notification(
      notification_type="assembly_scheduled",
      title="Montaj Tarihi Belirlendi",
      message=f"{job_title} - {customer_name} | {payload.date}",
      link=f"/isler?id={job_id}",
      related_id=job_id,
  )
  
  return job


@router.put("/{job_id}/assembly/complete")
def assembly_complete(job_id: str, payload: AssemblyComplete):
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)
  customer_name = job.get("customerName", "")
  
  job["assembly"] = job.get("assembly", {})
  job["assembly"]["schedule"] = job["assembly"].get("schedule", {})
  if payload.date:
    job["assembly"]["schedule"]["date"] = payload.date
  if payload.note:
    job["assembly"]["schedule"]["note"] = payload.note
  if payload.team:
    job["assembly"]["schedule"]["team"] = payload.team
  job["assembly"]["complete"] = {"at": _now_iso(), "proof": payload.proof}
  job["status"] = "MUHASEBE_BEKLIYOR"
  _log(job, "assembly.complete", f"team={payload.team}")
  data[idx] = job
  _save_jobs(data)
  
  # Bildirim oluştur - Montaj tamamlandı
  create_system_notification(
      notification_type="assembly_completed",
      title="Montaj Tamamlandı",
      message=f"{job_title} - {customer_name} | Muhasebe onayı bekleniyor",
      link=f"/isler?id={job_id}",
      related_id=job_id,
  )
  return job


@router.put("/{job_id}/status")
def update_status(job_id: str, payload: StatusUpdate, authorization: Optional[str] = Header(None)):
  """Genel statü güncelleme - servis işleri ve diğer geçişler için"""
  user_id, user_name = get_user_info(authorization)
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)
  
  old_status = job.get("status", "")
  
  # İptal durumunda cancelReason zorunlu
  cancel_statuses = ["IPTAL", "ANLASILAMADI", "VAZGECILDI"]
  if payload.status in cancel_statuses:
    if not payload.cancelReason:
      raise HTTPException(status_code=400, detail="İptal nedeni zorunludur.")
    
    job["cancelReason"] = payload.cancelReason
    job["cancelNote"] = payload.cancelNote
    job["cancelledAt"] = _now_iso()
  
  job["status"] = payload.status
  
  # Servis bilgileri varsa güncelle
  if payload.service:
    existing_service = job.get("service", {})
    job["service"] = {**existing_service, **payload.service}
  
  # Teklif/fiyat bilgileri varsa güncelle
  if payload.offer:
    existing_offer = job.get("offer", {})
    job["offer"] = {**existing_offer, **payload.offer}
  
  # Ret bilgileri varsa güncelle
  if payload.rejection:
    job["rejection"] = payload.rejection
  
  _log(job, "status.updated", f"{old_status} -> {payload.status}", user_id, user_name)
  data[idx] = job
  _save_jobs(data)
  
  # Aktivite log - iptal durumu için özel mesaj
  if payload.status in cancel_statuses:
    log_activity(user_id, user_name, "job_cancel", "job", job_id, 
                 job_title, f"İş iptal edildi: {payload.cancelReason}", get_action_icon("job_cancel"))
    
    # İptal bildirimi
    create_system_notification(
        notification_type="job_cancelled",
        title="İş İptal Edildi",
        message=f"{job_title} - Sebep: {payload.cancelReason}",
        link=f"/isler?id={job_id}",
        related_id=job_id,
        related_type="job",
        created_by=user_name,
        target_role="admin",
        priority="high"
    )
  else:
    log_activity(user_id, user_name, "job_status_change", "job", job_id, 
                 job_title, f"Durum değişti: {old_status} → {payload.status}", get_action_icon("job_status_change"))
    
    # Tamamlanma bildirimi
    if payload.status == "KAPALI":
      create_system_notification(
          notification_type="job_completed",
          title="İş Tamamlandı",
          message=f"{job_title} başarıyla tamamlandı",
          link=f"/isler?id={job_id}",
          related_id=job_id,
          related_type="job",
          created_by=user_name,
          target_role="manager"
      )
  return job


@router.put("/{job_id}/finance/close")
def finance_close(job_id: str, payload: FinanceClose, authorization: Optional[str] = Header(None)):
  user_id, user_name = get_user_info(authorization)
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)

  offer_total = float(job.get("offer", {}).get("total", 0))
  approval_plan = job.get("approval", {}).get("paymentPlan", {})
  
  # Pre-received amounts - paymentPlan objelerinden amount değerini al
  def _get_amount(val):
    if isinstance(val, dict):
      return float(val.get("amount", 0) or val.get("total", 0) or 0)
    return float(val or 0)
  
  pre_cash = _get_amount(approval_plan.get("cash"))
  pre_card = _get_amount(approval_plan.get("card"))
  pre_cheque = _get_amount(approval_plan.get("cheque"))
  after_delivery = _get_amount(approval_plan.get("afterDelivery"))
  pre_total = pre_cash + pre_card + pre_cheque

  # Final payments
  payments = payload.payments or {}
  final_cash = float(payments.get("cash", 0))
  final_card = float(payments.get("card", 0))
  final_cheque = float(payments.get("cheque", 0))
  final_total = final_cash + final_card + final_cheque
  
  discount_amt = float(payload.discount.get("amount", 0)) if payload.discount else 0
  
  # Total received = pre + final + discount
  total_received = pre_total + final_total + discount_amt
  balance = round(offer_total - total_received, 2)
  
  if abs(balance) > 0.01:  # Allow small float differences
    raise HTTPException(status_code=400, detail=f"Bakiye 0 olmalı. Fark: {balance}₺")
  if discount_amt > 0 and not payload.discount.get("note"):
    raise HTTPException(status_code=400, detail="İskonto notu zorunlu")

  job["finance"] = {
    "total": offer_total,
    "prePayments": {"cash": pre_cash, "card": pre_card, "cheque": pre_cheque},
    "finalPayments": {"cash": final_cash, "card": final_card, "cheque": final_cheque},
    "discount": payload.discount,
    "closedAt": _now_iso()
  }
  job["status"] = "KAPALI"
  _log(job, "finance.closed", f"balance={balance}", user_id, user_name)
  data[idx] = job
  _save_jobs(data)
  
  # Aktivite log
  log_activity(user_id, user_name, "job_complete", "job", job_id, 
               job_title, f"İş kapatıldı - Toplam: {offer_total:,.2f}₺", get_action_icon("job_complete"))
  
  # Bildirim oluştur - Ödeme tamamlandı
  create_system_notification(
      notification_type="payment_received",
      title="İş Kapatıldı - Ödeme Tamamlandı",
      message=f"{job_title} - {job.get('customerName', '')} ({offer_total:,.2f}₺)",
      link=f"/isler?id={job_id}",
      related_id=job_id,
      related_type="job",
      created_by=user_name,
      target_role="manager"
  )
  
  return job


@router.put("/{job_id}/inquiry-decision")
def inquiry_decision(job_id: str, payload: InquiryDecision, authorization: Optional[str] = Header(None)):
  """Fiyat sorgusu (Müşteri Ölçüsü) için Onay/Red kararı"""
  user_id, user_name = get_user_info(authorization)
  data, idx, job = _find_job(job_id)
  job = deepcopy(job)
  job_title = job.get("title", job_id)
  
  # Sadece MUSTERI_OLCUSU işleri için
  if job.get("startType") != "MUSTERI_OLCUSU":
    raise HTTPException(status_code=400, detail="Bu işlem sadece Müşteri Ölçüsü işleri için geçerlidir")
  
  # Fiyat verilmiş olmalı
  if not job.get("offer", {}).get("total"):
    raise HTTPException(status_code=400, detail="Önce fiyat verilmelidir")
  
  if payload.decision == "ONAY":
    job["status"] = "FIYAT_SORGUSU_ONAY"
    job["inquiry"] = {
      "decision": "ONAY",
      "decidedAt": _now_iso(),
      "note": payload.note
    }
    _log(job, "inquiry.approved", f"Fiyat sorgusu onaylandı. {payload.note or ''}", user_id, user_name)
    log_activity(user_id, user_name, "job_offer_approve", "job", job_id, 
                 job_title, f"Fiyat sorgusu onaylandı", get_action_icon("approve"))
  else:
    # RED
    if not payload.cancelReason:
      raise HTTPException(status_code=400, detail="Red sebebi zorunludur")
    
    job["status"] = "FIYAT_SORGUSU_RED"
    job["inquiry"] = {
      "decision": "RED",
      "decidedAt": _now_iso(),
      "cancelReason": payload.cancelReason,
      "note": payload.note
    }
    _log(job, "inquiry.rejected", f"Fiyat sorgusu reddedildi. Sebep: {payload.cancelReason}. {payload.note or ''}", user_id, user_name)
    log_activity(user_id, user_name, "job_offer_reject", "job", job_id, 
                 job_title, f"Fiyat sorgusu reddedildi - Sebep: {payload.cancelReason}", get_action_icon("reject"))
  
  data[idx] = job
  _save_jobs(data)
  return job


# ==================== İŞ SİLME ====================

# Silinebilir durumlar - bu durumların dışındakiler kritik veri içerir
DELETABLE_STATUSES = [
    # Ölçü aşaması
    "OLCU_RANDEVU_BEKLIYOR",
    "OLCU_RANDEVULU",
    "OLCU_ALINDI",
    # Müşteri ölçüsü
    "MUSTERI_OLCUSU_BEKLENIYOR",
    "MUSTERI_OLCUSU_YUKLENDI",
    # Fiyatlandırma
    "FIYATLANDIRMA",
    "FIYAT_VERILDI",
    "ANLASILAMADI",
    # İptal/Red
    "IPTAL",
    "FIYAT_SORGUSU_RED",
    # Servis erken aşaması
    "SERVIS_RANDEVU_BEKLIYOR",
]

# Silinemez durumlar ve açıklamaları
NON_DELETABLE_REASONS = {
    "ONAY": "Sözleşme imzalanmış işler silinemez",
    "URETIM": "Üretim başlamış işler silinemez",
    "MONTAJ_BEKLIYOR": "Montaj aşamasındaki işler silinemez",
    "MONTAJ_DEVAM": "Montaj devam eden işler silinemez",
    "TAMAMLANDI": "Tamamlanmış işler silinemez",
    "KAPALI": "Kapatılmış işler silinemez",
    "ARSIV": "Arşivlenmiş işler silinemez",
    "FIYAT_SORGUSU_ONAY": "Onaylanmış fiyat sorguları silinemez"
}


@router.delete("/{job_id}")
def delete_job(job_id: str, authorization: Optional[str] = Header(None)):
    """
    İşi sil (soft delete) - SADECE ADMİN
    
    Silinebilir durumlar: OLCU, TEKLIF_TASLAK, TEKLIF_BILDIRILDI, FIYATLANDIRMA, IPTAL
    Silinemez durumlar: ONAY, URETIM, MONTAJ_*, TAMAMLANDI, KAPALI, ARSIV
    """
    user_id, user_name = get_user_info(authorization)
    
    # Admin yetki kontrolü
    from .auth import get_current_user_from_token
    current_user = get_current_user_from_token(authorization)
    
    if not current_user or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="İş silme yetkisi sadece yöneticilerde")
    
    # İşi bul
    data, idx, job = _find_job(job_id)
    job_title = job.get("title", job_id)
    job_status = job.get("status", "")
    customer_name = job.get("customerName", "")
    
    # Durum kontrolü
    if job_status not in DELETABLE_STATUSES:
        reason = NON_DELETABLE_REASONS.get(job_status, f"'{job_status}' durumundaki işler silinemez")
        raise HTTPException(status_code=400, detail=reason)
    
    # Zaten silinmiş mi kontrol et
    if job.get("deleted"):
        raise HTTPException(status_code=400, detail="Bu iş zaten silinmiş")
    
    # Soft delete uygula
    job["deleted"] = True
    job["deletedAt"] = _now_iso()
    job["deletedBy"] = user_id
    job["deletedByName"] = user_name
    
    # Log ekle
    _log(job, "deleted", f"İş silindi - {user_name}", user_id, user_name)
    
    data[idx] = job
    _save_jobs(data)
    
    # Aktivite log
    log_activity(
        user_id, user_name, "delete", "job", job_id,
        job_title, f"İş silindi: {job_title} ({customer_name})",
        get_action_icon("delete")
    )
    
    # Bildirim oluştur
    create_system_notification(
        notification_type="job_update",
        title="İş Silindi",
        message=f"{job_title} - {customer_name} işi silindi",
        link=None,
        related_id=job_id,
        related_type="job",
        created_by=user_name,
        target_role="manager"
    )
    
    return {"success": True, "message": f"'{job_title}' işi silindi", "jobId": job_id}

