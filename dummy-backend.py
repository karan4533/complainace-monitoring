import asyncio
import re
import uuid
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from pydantic import BaseModel
import subprocess
import os
from PIL import Image
import tempfile
import signal
import time
import json
import urllib.request
from fastapi.responses import StreamingResponse
from fpdf import FPDF
import sqlite3
import base64
from datetime import datetime, date
import io
import cv2
import numpy as np
import requests
IMAGE_STORE = "/home/jananayaganv23/SOP/stored_images"
SOP_IMAGE_STORE = "/home/jananayaganv23/SOP/stored_sop_images"

# 2. Initialize FastAPI
app = FastAPI()

# 3. Mount the directories using the variables
app.mount("/stored_images", StaticFiles(directory=IMAGE_STORE), name="stored_images")
app.mount("/stored_sop_images", StaticFiles(directory=SOP_IMAGE_STORE), name="stored_sop_images")
connected_clients: List[WebSocket] = []
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
CONTAINER_NAME = "aeaa0b51d3de"
PIPELINE_SCRIPT = "sop-deepstream-1.py"
DB_NAME = "/home/jananayaganv23/ppe-dashboard/backend/ppe_violations.db"
IMAGE_STORE = "/home/jananayaganv23/SOP/stored_images"
SOP_IMAGE_STORE = "/home/jananayaganv23/SOP/stored_sop_images"
MONITORING_CONFIG_PATH = os.environ.get(
    "MONITORING_CONFIG_PATH",
    "/home/jananayaganv23/ppe-dashboard/backend/sop_monitoring_config.json",
)
ANCHOR_VLM_API_URL = os.environ.get("ANCHOR_VLM_API_URL", "http://172.17.0.1:8001/v1/chat/completions")
ANCHOR_VLM_MODEL_NAME = os.environ.get("ANCHOR_VLM_MODEL_NAME", "Qwen/Qwen2.5-VL-3B-Instruct")
os.makedirs(IMAGE_STORE, exist_ok=True)
os.makedirs(SOP_IMAGE_STORE, exist_ok=True)
processes = {
    "deepstream": None,
    "go2rtc": None
}
pending_capture_requests: dict = {}
capture_results: dict = {}
_capture_lock = asyncio.Lock()
CAPTURE_TIMEOUT_SECONDS = 15.0
class PPEReportPDF(FPDF):
    def header(self):
        self.set_font("helvetica", "B", 18)
        self.set_text_color(30, 41, 59)
        self.cell(0, 10, "Safety & PPE Violation Report", border=False, align="C")
        self.ln(15)
        
    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")
class ViolationItem(BaseModel):
    label: str
    confidence: float
class Violation(BaseModel):
    timestamp: str
    stream_id: int
    violations: List[ViolationItem]
    image_base64: str
# ---------------------------------------------------------------------------
# SOP v2 models (anchor + spatial-trigger + video audit) — OLDER, single-
# stream architecture. Left in place in case it's still used elsewhere;
# NOT what the new per-person motion-triggered pipeline talks to.
# ---------------------------------------------------------------------------
class ActivateMonitoringRequest(BaseModel):
    prompt: str
class SOPAuditEventIngest(BaseModel):
    """What the OLD pipeline's VideoAuditWorkerPool POSTs after each clip audit."""
    timestamp: str
    stream_id: int
    event_type: str            # 'completed' | 'skipped' | 'out_of_order'
    step_index: Optional[int] = None
    step_text: Optional[str] = None
    detail: Optional[str] = None
    video_path: str
class CaptureResultIngest(BaseModel):
    """What the OLD pipeline's CaptureWorker POSTs after fulfilling an on-demand
    frame capture request."""
    stream_id: int
    request_id: str
    image_base64: str


# ---------------------------------------------------------------------------
# NEW: multi-stream SOP config + PER-PERSON motion-triggered event ingestion.
# This is what the current per-person DeepStream pipeline polls/posts.
# ---------------------------------------------------------------------------
class StreamSOPConfigSet(BaseModel):
    """UI -> backend: assign/replace one stream's ordered SOP sequence.
    UNCHANGED by the per-person pipeline update: the SOP sequence is still
    configured per CAMERA (stream_id), not per person — there's no way for
    a user to pre-assign a sequence to a specific person before they even
    walk into frame. The pipeline applies whatever sequence is configured
    for a stream independently to EVERY person tracked on that stream."""
    stream_id: int
    sop_steps: List[str]


class SOPEventIngest(BaseModel):
    """What SOPWorker._process() in the per-person pipeline POSTs to
    /api/ingest-sop-event after a motion-chunk VLM check produces an event
    for one specific tracked person on one stream.
    object_id is NEW: it's the nvtracker object_id of the person this event
    belongs to. Optional/nullable so older pipeline builds (or any other
    caller) that don't send it don't break this endpoint."""
    timestamp: str
    stream_id: int
    object_id: Optional[int] = None
    event_type: str            # 'completed' | 'skipped' | 'out_of_order' | 'overdue'
    step_index: Optional[int] = None
    step_text: Optional[str] = None
    raw_vlm_response: Optional[str] = None
    image_base64: str


def init_db():
    conn = sqlite3.connect(DB_NAME)
    conn.execute('''CREATE TABLE IF NOT EXISTS violations 
                    (id INTEGER PRIMARY KEY, timestamp TEXT, label TEXT, 
                     stream_id INTEGER, confidence REAL, image_path TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS sop_audit_events
                    (id INTEGER PRIMARY KEY, timestamp TEXT, stream_id INTEGER,
                     event_type TEXT, step_index INTEGER, step_text TEXT,
                     detail TEXT, video_path TEXT)''')
    # NEW: one row per stream_id, holds that stream's current ordered SOP
    # sequence. Primary key on stream_id means a PATCH-style upsert (write
    # or replace) is just an INSERT OR REPLACE.
    conn.execute('''CREATE TABLE IF NOT EXISTS sop_stream_configs
                    (stream_id INTEGER PRIMARY KEY, sop_steps TEXT NOT NULL,
                     updated_at TEXT NOT NULL)''')
    # NEW: events from the motion-triggered pipeline. Separate from
    # sop_audit_events (which stores video_path from the older clip-audit
    # architecture) because this one stores a still image + the raw VLM
    # answer instead. object_id column added for per-person tracking —
    # nullable so any pre-existing rows without it still read fine.
    conn.execute('''CREATE TABLE IF NOT EXISTS sop_events
                    (id INTEGER PRIMARY KEY, timestamp TEXT, stream_id INTEGER,
                     object_id INTEGER, event_type TEXT, step_index INTEGER,
                     step_text TEXT, raw_vlm_response TEXT, image_path TEXT)''')
    # Migration guard: if sop_events already exists from before the
    # per-person change, it won't have object_id — add it if missing so
    # upgrades don't require a manual DB wipe.
    cursor = conn.execute("PRAGMA table_info(sop_events)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    if "object_id" not in existing_cols:
        conn.execute("ALTER TABLE sop_events ADD COLUMN object_id INTEGER")
    conn.commit()
    conn.close()


init_db()
def _write_image_and_db(data: Violation, img_path: str):
    b64_data = data.image_base64
    missing_padding = len(b64_data) % 4
    if missing_padding:
        b64_data += '=' * (4 - missing_padding)
    with open(img_path, "wb") as f:
        f.write(base64.b64decode(b64_data))

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    new_entries = []
    for v in data.violations:
        cursor.execute(
            "INSERT INTO violations (timestamp, label, stream_id, confidence, image_path) VALUES (?,?,?,?,?)",
            (data.timestamp, v.label, data.stream_id, v.confidence, img_path)
        )
        new_entries.append({
            "id": cursor.lastrowid,
            "timestamp": data.timestamp,
            "label": v.label,
            "stream_id": data.stream_id,
            "confidence": v.confidence,
            "image_path": img_path
        })
    conn.commit()
    conn.close()
    return new_entries
def _write_sop_audit_event_and_db(data: SOPAuditEventIngest):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sop_audit_events "
        "(timestamp, stream_id, event_type, step_index, step_text, detail, video_path) "
        "VALUES (?,?,?,?,?,?,?)",
        (data.timestamp, data.stream_id, data.event_type, data.step_index,
         data.step_text, data.detail, data.video_path)
    )
    entry = {
        "id": cursor.lastrowid,
        "timestamp": data.timestamp,
        "stream_id": data.stream_id,
        "event_type": data.event_type,
        "step_index": data.step_index,
        "step_text": data.step_text,
        "detail": data.detail,
        "video_path": data.video_path,
    }
    conn.commit()
    conn.close()
    return entry


def _write_sop_event_and_db(data: SOPEventIngest, img_path: str):
    b64_data = data.image_base64
    missing_padding = len(b64_data) % 4
    if missing_padding:
        b64_data += '=' * (4 - missing_padding)
    with open(img_path, "wb") as f:
        f.write(base64.b64decode(b64_data))

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sop_events "
        "(timestamp, stream_id, object_id, event_type, step_index, step_text, raw_vlm_response, image_path) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (data.timestamp, data.stream_id, data.object_id, data.event_type, data.step_index,
         data.step_text, data.raw_vlm_response, img_path)
    )
    entry = {
        "id": cursor.lastrowid,
        "timestamp": data.timestamp,
        "stream_id": data.stream_id,
        "object_id": data.object_id,
        "event_type": data.event_type,
        "step_index": data.step_index,
        "step_text": data.step_text,
        "raw_vlm_response": data.raw_vlm_response,
        "image_path": img_path,
    }
    conn.commit()
    conn.close()
    return entry


def _upsert_sop_stream_config(stream_id: int, sop_steps: List[str]) -> dict:
    updated_at = datetime.utcnow().isoformat() + "Z"
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sop_stream_configs (stream_id, sop_steps, updated_at) VALUES (?,?,?) "
        "ON CONFLICT(stream_id) DO UPDATE SET sop_steps=excluded.sop_steps, updated_at=excluded.updated_at",
        (stream_id, json.dumps(sop_steps), updated_at),
    )
    conn.commit()
    conn.close()
    return {"stream_id": stream_id, "sop_steps": sop_steps, "updated_at": updated_at}


def _get_all_sop_stream_configs() -> list:
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT stream_id, sop_steps, updated_at FROM sop_stream_configs")
    rows = cursor.fetchall()
    conn.close()
    return [
        {"stream_id": row[0], "sop_steps": json.loads(row[1]), "updated_at": row[2]}
        for row in rows
    ]


def _delete_sop_stream_config(stream_id: int) -> bool:
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sop_stream_configs WHERE stream_id = ?", (stream_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def _get_distinct_person_ids(stream_id: Optional[int] = None) -> list:
    """Used by the SOP Reports filter dropdown to list which person IDs
    have events recorded — optionally scoped to one camera."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    if stream_id is not None:
        cursor.execute(
            "SELECT DISTINCT object_id FROM sop_events "
            "WHERE stream_id = ? AND object_id IS NOT NULL ORDER BY object_id",
            (stream_id,),
        )
    else:
        cursor.execute(
            "SELECT DISTINCT object_id FROM sop_events "
            "WHERE object_id IS NOT NULL ORDER BY object_id"
        )
    rows = cursor.fetchall()
    conn.close()
    return [row[0] for row in rows]


def parse_stored_timestamp(ts: str) -> datetime:
    ts = ts.strip()
    if ts.endswith("Z"):
        ts = ts[:-1]
    candidate = ts.replace(" ", "T", 1) if "T" not in ts else ts
    try:
        return datetime.fromisoformat(candidate)
    except ValueError:
        pass
    for fmt in ("%b %d, %Y - %I:%M:%S %p", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(ts, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unrecognized timestamp format: {ts!r}")
def resolve_report_range(
    start_date_str: str,
    end_date_str: str,
    start_time_str: str | None = None,
    end_time_str: str | None = None,
) -> tuple[datetime, datetime]:
    def parse_date(d: str, field_name: str) -> date:
        normalized = d.strip().replace("/", "-")
        try:
            return datetime.strptime(normalized, "%m-%d-%Y").date()
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {field_name} format, expected YYYY-MM-DD (or YYYY/MM/DD): {d!r}",
            )

    start_day = parse_date(start_date_str, "start_date")
    end_day = parse_date(end_date_str, "end_date")

    if end_day < start_day:
        raise HTTPException(status_code=400, detail="end_date cannot be before start_date")

    def parse_time(t: str | None):
        if not t:
            return None
        try:
            return datetime.strptime(t.strip(), "%H:%M").time()
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid time format, expected HH:MM: {t!r}")

    start_time = parse_time(start_time_str)
    end_time = parse_time(end_time_str)

    range_start = (
        datetime.combine(start_day, start_time)
        if start_time
        else datetime.combine(start_day, datetime.min.time())
    )

    today = datetime.now().date()
    if end_time:
        range_end = datetime.combine(end_day, end_time)
    elif end_day == today:
        range_end = datetime.now()
    else:
        range_end = datetime.combine(end_day, datetime.max.time())

    if range_end < range_start:
        raise HTTPException(status_code=400, detail="Resolved end datetime is before start datetime")

    return range_start, range_end
def make_readable_time(iso_string: str) -> str:
    try:
        clean_str = iso_string.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        return dt.strftime("%b %d, %Y - %I:%M:%S %p")
    except Exception:
        return iso_string
def _get_thumbnail_path(image_path: str, tmp_dir: str) -> str | None:
    if not os.path.exists(image_path):
        return None
    thumb_path = os.path.join(tmp_dir, os.path.basename(image_path))
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img.thumbnail((480, 330))
            img.save(thumb_path, "JPEG", quality=75)
        return thumb_path
    except Exception:
        return None
def get_external_ip():
    try:
        req = urllib.request.Request(
            "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip"
        )
        req.add_header("Metadata-Flavor", "Google")
        with urllib.request.urlopen(req, timeout=2) as response:
            return response.read().decode('utf-8').strip()
    except Exception:
        try:
            with urllib.request.urlopen("https://api.ipify.org", timeout=3) as response:
                return response.read().decode('utf-8').strip()
        except Exception:
            return "127.0.0.1"
def ensure_container_running(container_name: str):
    check_status = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", container_name],
        capture_output=True, text=True
    )
    if check_status.stdout.strip() != "true":
        start_result = subprocess.run(
            ["docker", "start", container_name],
            capture_output=True, text=True
        )
        if start_result.returncode != 0:
            raise Exception(f"Failed to start container: {start_result.stderr}")
def _is_running(key: str) -> bool:
    proc = processes.get(key)
    return proc is not None and proc.poll() is None
def _wait_for_rtsp(host: str = "127.0.0.1", port: int = 8554, timeout: int = 30) -> bool:
    import socket
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(1)
    return False


async def _stop_all_processes():
    global processes
    for key in ["go2rtc", "deepstream"]:
        proc = processes.get(key)
        if proc and proc.poll() is None:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            except (ProcessLookupError, OSError):
                pass
        processes[key] = None

    try:
        subprocess.run(["docker", "exec", CONTAINER_NAME, "pkill", "-f", PIPELINE_SCRIPT], timeout=5)
        time.sleep(1)
        check = subprocess.run(
            ["docker", "exec", CONTAINER_NAME, "pgrep", "-f", PIPELINE_SCRIPT],
            capture_output=True, text=True, timeout=5
        )
        if check.stdout.strip():
            subprocess.run(["docker", "exec", CONTAINER_NAME, "pkill", "-9", "-f", PIPELINE_SCRIPT], timeout=5)

        subprocess.run(
            ["docker", "exec", CONTAINER_NAME, "bash", "-c",
             "fuser -k 8554/tcp 2>/dev/null || true"],
            timeout=5
        )
    except Exception as e:
        print(f"Error stopping docker script: {e}")

    return {"status": "success", "message": "All processes stopped."}


def _build_pdf_report(range_start: datetime, range_end: datetime) -> bytes:
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp, label, stream_id, confidence, image_path
        FROM violations
        ORDER BY id DESC
    """)
    raw_rows = cursor.fetchall()
    conn.close()

    frames = {}
    frame_order = []
    skipped = 0

    for timestamp, label, stream_id, confidence, image_path in raw_rows:
        try:
            ts = parse_stored_timestamp(timestamp)
        except ValueError:
            skipped += 1
            continue

        if ts > range_end:
            continue
        if ts < range_start:
            break

        key = (timestamp, stream_id, image_path)
        if key not in frames:
            frames[key] = {
                "timestamp": timestamp, "stream_id": stream_id, "image_path": image_path,
                "parsed_ts": ts,
                "no_helmet": 0, "no_vest": 0, "no_mask": 0,
            }
            frame_order.append(key)

        label_lower = label.lower()
        if "hardhat" in label_lower:
            frames[key]["no_helmet"] += 1
        if "vest" in label_lower:
            frames[key]["no_vest"] += 1
        if "mask" in label_lower:
            frames[key]["no_mask"] += 1

    if skipped:
        print(f"[download_pdf_report] skipped {skipped} row(s) with unparseable timestamps")

    rows = [frames[k] for k in frame_order]

    pdf = PPEReportPDF()
    pdf.set_margins(10, 15, 10)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(
        0, 10,
        f"Timeframe: {range_start.strftime('%d %b %Y, %I:%M %p')} to "
        f"{range_end.strftime('%d %b %Y, %I:%M %p')}",
        align="C",
    )
    pdf.ln(15)

    if not rows:
        pdf.set_font("helvetica", "I", 12)
        pdf.cell(0, 10, "No violations recorded in this time period.", align="C")
    else:
        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(241, 245, 249)
        pdf.set_text_color(15, 23, 42)

        pdf.cell(10, 10, "ID", border=1, align="C", fill=True)
        pdf.cell(50, 10, "Image", border=1, align="C", fill=True)
        pdf.cell(40, 10, "Timestamp", border=1, align="C", fill=True)
        pdf.cell(20, 10, "Camera", border=1, align="C", fill=True)
        pdf.cell(70, 10, "Violation Detection", border=1, align="C", fill=True)
        pdf.ln()

        pdf.set_font("helvetica", "", 9)
        pdf.set_text_color(0, 0, 0)

        row_height = 35

        with tempfile.TemporaryDirectory() as tmp_dir:
            for idx, row in enumerate(rows, start=1):
                if pdf.get_y() + row_height > 280:
                    pdf.add_page()
                    pdf.set_font("helvetica", "B", 10)
                    pdf.set_fill_color(241, 245, 249)
                    pdf.cell(10, 10, "ID", border=1, align="C", fill=True)
                    pdf.cell(50, 10, "Image", border=1, align="C", fill=True)
                    pdf.cell(40, 10, "Timestamp", border=1, align="C", fill=True)
                    pdf.cell(20, 10, "Camera", border=1, align="C", fill=True)
                    pdf.cell(70, 10, "Violation Detection", border=1, align="C", fill=True)
                    pdf.ln()
                    pdf.set_font("helvetica", "", 9)

                x_start = pdf.get_x()
                y_start = pdf.get_y()

                clean_dt = row["parsed_ts"]
                short_ts = clean_dt.strftime('%Y-%m-%d %H:%M:%S')
                readable_ts = clean_dt.strftime('%I:%M:%S %p, %d %b %Y')

                summary_text = (
                    f"At {readable_ts} on Stream {row['stream_id']}, there were "
                    f"{row['no_helmet']} Hard Hat violation(s), "
                    f"{row['no_vest']} Vest violation(s), and "
                    f"{row['no_mask']} Mask violation(s) detected in this frame."
                )

                pdf.set_xy(x_start, y_start)
                pdf.cell(10, row_height, str(idx), border=1, align="C")

                pdf.set_xy(x_start + 10, y_start)
                pdf.cell(50, row_height, "", border=1)

                pdf.set_xy(x_start + 60, y_start)
                pdf.cell(40, row_height, short_ts, border=1, align="C")

                pdf.set_xy(x_start + 100, y_start)
                pdf.cell(20, row_height, str(row['stream_id']), border=1, align="C")

                pdf.set_xy(x_start + 120, y_start)
                pdf.cell(70, row_height, "", border=1)

                thumb_path = _get_thumbnail_path(row["image_path"], tmp_dir)
                if thumb_path:
                    pdf.image(thumb_path, x=x_start + 11, y=y_start + 1, w=48, h=33)
                else:
                    pdf.set_xy(x_start + 10, y_start + (row_height / 2) - 3)
                    pdf.cell(50, 6, "[ Missing ]", border=0, align="C")

                pdf.set_xy(x_start + 122, y_start + 3)
                pdf.multi_cell(66, 5, summary_text, border=0, align="L")

                pdf.set_xy(x_start, y_start + row_height)

            pdf_bytes = bytes(pdf.output())

    return pdf_bytes if rows else bytes(pdf.output())


# --- WebSocket Endpoint ---
@app.websocket("/ws/violations")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in connected_clients:
            connected_clients.remove(websocket)


# --- Existing Endpoints (unchanged) ---
@app.get("/api/stream-config")
async def get_stream_config():
    current_ip = get_external_ip()
    stream_url = f"http://{current_ip}:1984/stream.html?src=ds-test"
    return {"streamUrl": stream_url}


@app.get("/api/pipeline-status")
async def pipeline_status():
    return {
        "deepstream_running": _is_running("deepstream"),
        "go2rtc_running": _is_running("go2rtc"),
    }


@app.on_event("shutdown")
async def shutdown_event():
    await _stop_all_processes()


@app.post("/api/start-pipeline")
async def start_pipeline():
    current_ip = get_external_ip()

    if _is_running("deepstream") or _is_running("go2rtc"):
        return {
            "status": "success",
            "message": "Pipeline already running.",
            "external_ip": current_ip
        }

    processes["deepstream"] = None
    processes["go2rtc"] = None

    try:
        ensure_container_running(CONTAINER_NAME)

        log_file = open("pipeline_debug.log", "w")
        processes["deepstream"] = subprocess.Popen(
            [
                "docker", "exec",
                "-w", "/opt/nvidia/deepstream/deepstream-9.0/DeepStream-Yolo",
                CONTAINER_NAME, "python3", PIPELINE_SCRIPT
            ],
            preexec_fn=os.setsid,
            stdout=log_file,
            stderr=log_file
        )

        rtsp_ready = _wait_for_rtsp(port=8554, timeout=60)
        if not rtsp_ready:
            await _stop_all_processes()
            raise HTTPException(
                status_code=500,
                detail="DeepStream RTSP server did not come up within 60s. Check pipeline_debug.log."
            )

        go2rtc_path = os.path.expanduser("~/go2rtc")

        processes["go2rtc"] = subprocess.Popen(
            ["./go2rtc", "-config", "go2rtc.yaml"],
            preexec_fn=os.setsid,
            cwd=go2rtc_path,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        return {
            "status": "success",
            "message": "Pipeline started.",
            "external_ip": current_ip
        }

    except HTTPException:
        raise
    except Exception as e:
        await _stop_all_processes()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stop-pipeline")
async def stop_pipeline_endpoint():
    try:
        return await _stop_all_processes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ingest-violation")
async def ingest(data: Violation):
    img_filename = f"{data.timestamp}_{data.stream_id}.jpg".replace(":", "-")
    img_path = os.path.join(IMAGE_STORE, img_filename)

    try:
        new_entries = await asyncio.to_thread(_write_image_and_db, data, img_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to store violation: {str(e)}")

    dead_clients = []
    for client in connected_clients:
        try:
            for entry in new_entries:
                await client.send_json(entry)
        except Exception:
            dead_clients.append(client)
    for client in dead_clients:
        connected_clients.remove(client)

    return {"status": "saved", "inserted_count": len(new_entries)}


@app.get("/api/reports")
def get_reports(response: Response, limit: int = 100, offset: int = 0):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, timestamp, label, stream_id, confidence, image_path
        FROM violations
        ORDER BY id DESC
        LIMIT ? OFFSET ?
    """, (limit, offset))

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "timestamp": make_readable_time(row[1]),
            "label": row[2],
            "stream_id": row[3],
            "confidence": row[4],
            "image_path": row[5]
        }
        for row in rows
    ]


@app.get("/api/reports/download-pdf")
async def download_pdf_report(
    start_date: str,
    end_date: str,
    start_time: str | None = None,
    end_time: str | None = None,
):
    range_start, range_end = resolve_report_range(start_date, end_date, start_time, end_time)
    pdf_bytes = await asyncio.to_thread(_build_pdf_report, range_start, range_end)

    safe_filename = f"ppe_report_{range_start.date().isoformat()}_to_{range_end.date().isoformat()}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_filename}"},
    )


# ---------------------------------------------------------------------------
# OLDER SOP v2 endpoints: anchor + spatial-trigger + video audit.
# Kept as-is — unrelated to the per-person motion-triggered pipeline.
# ---------------------------------------------------------------------------

def parse_activation_prompt(prompt: str) -> dict:
    match = re.search(r"stream\s+(\d+)", prompt, re.IGNORECASE)
    if not match:
        raise ValueError("No stream_id found in prompt (expected e.g. 'stream 2 ...')")
    stream_id = int(match.group(1))

    remainder = prompt[match.end():].strip()
    raw_steps = [s.strip() for s in re.split(r"\.\s+|\n", remainder) if s.strip()]
    sop_steps = [s if s.endswith(".") else s + "." for s in raw_steps]

    if not sop_steps:
        raise ValueError("No SOP steps found after stream_id in prompt")

    return {"stream_id": stream_id, "sop_steps": sop_steps}


ANCHOR_VLM_PROMPT = (
    "You are looking at a single CCTV frame from an industrial/office site.\n"
    "The following SOP steps will be monitored over time:\n"
    "{numbered_steps}\n"
    "For each step, identify the ONE static physical object or fixture "
    "involved (e.g. 'hand sanitizer dispenser', 'badge reader on wall', "
    "'door handle') — ignore people, since people move. If a step has no "
    "identifiable static object in this frame, omit it.\n"
    "Return ONLY valid JSON, no other text, in this exact shape:\n"
    '{{"attribute_name": {{"x1": int, "y1": int, "x2": int, "y2": int}}, ...}}\n'
    "Coordinates are pixel values in this image, x2>x1, y2>y1."
)


def _encode_frame_b64(frame_bgr) -> str:
    ok, buf = cv2.imencode(".jpg", frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok:
        raise RuntimeError("JPEG encode failed")
    return base64.b64encode(buf).decode("utf-8")


def initialize_static_anchors(frame_bgr, sop_steps: list) -> dict:
    numbered = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sop_steps))
    prompt = ANCHOR_VLM_PROMPT.format(numbered_steps=numbered)
    b64_image = _encode_frame_b64(frame_bgr)

    payload = {
        "model": ANCHOR_VLM_MODEL_NAME,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}},
            ],
        }],
        "max_tokens": 500,
        "temperature": 0.0,
    }

    resp = requests.post(ANCHOR_VLM_API_URL, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError(f"VLM returned no choices: {data}")

    raw_text = (choices[0].get("message") or {}).get("content", "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text.strip())

    try:
        anchors = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"VLM did not return valid JSON: {raw_text!r}") from e

    for name, box in anchors.items():
        for k in ("x1", "y1", "x2", "y2"):
            if k not in box:
                raise RuntimeError(f"Anchor '{name}' missing key '{k}': {box}")
        if box["x2"] <= box["x1"] or box["y2"] <= box["y1"]:
            raise RuntimeError(f"Anchor '{name}' has invalid box: {box}")

    return anchors


@app.post("/api/v1/activate-monitoring")
async def activate_monitoring(req: ActivateMonitoringRequest):
    try:
        parsed = parse_activation_prompt(req.prompt)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    stream_id = parsed["stream_id"]
    sop_steps = parsed["sop_steps"]

    request_id = str(uuid.uuid4())
    event = asyncio.Event()

    async with _capture_lock:
        pending_capture_requests[stream_id] = request_id
        capture_results[request_id] = {"event": event, "frame_bytes": None}

    try:
        await asyncio.wait_for(event.wait(), timeout=CAPTURE_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        async with _capture_lock:
            pending_capture_requests.pop(stream_id, None)
            capture_results.pop(request_id, None)
        raise HTTPException(
            status_code=504,
            detail=f"Timed out waiting for a live frame from stream {stream_id} "
                   f"after {CAPTURE_TIMEOUT_SECONDS:.0f}s. Is the pipeline running "
                   f"and is stream {stream_id} actively streaming?",
        )

    async with _capture_lock:
        entry = capture_results.pop(request_id, None)

    if entry is None or entry["frame_bytes"] is None:
        raise HTTPException(status_code=500, detail="Capture completed but no frame data received")

    nparr = np.frombuffer(entry["frame_bytes"], np.uint8)
    frame_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame_bgr is None:
        raise HTTPException(status_code=500, detail="Failed to decode captured frame")

    try:
        anchors = await asyncio.to_thread(initialize_static_anchors, frame_bgr, sop_steps)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anchor initialization failed: {e}")

    if not anchors:
        raise HTTPException(
            status_code=422,
            detail="VLM could not identify any static objects for the given SOP steps in this frame.",
        )

    config = {
        "stream_id": stream_id,
        "attributes": list(anchors.keys()),
        "anchors": anchors,
        "sop_steps": sop_steps,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }

    os.makedirs(os.path.dirname(MONITORING_CONFIG_PATH), exist_ok=True)
    tmp_path = MONITORING_CONFIG_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(config, f)
    os.replace(tmp_path, MONITORING_CONFIG_PATH)

    return {"status": "success", "config": config}


@app.get("/api/internal/pending-captures")
async def get_pending_captures():
    async with _capture_lock:
        return {"pending": dict(pending_capture_requests)}


@app.post("/api/internal/frame-capture-result")
async def ingest_capture_result(data: CaptureResultIngest):
    async with _capture_lock:
        entry = capture_results.get(data.request_id)
        if entry is None:
            return {"status": "ignored", "reason": "no matching pending request"}

        try:
            b64_data = data.image_base64
            missing_padding = len(b64_data) % 4
            if missing_padding:
                b64_data += '=' * (4 - missing_padding)
            entry["frame_bytes"] = base64.b64decode(b64_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

        pending_capture_requests.pop(data.stream_id, None)
        entry["event"].set()

    return {"status": "ok"}


@app.get("/api/v1/monitoring-config")
async def get_monitoring_config():
    if not os.path.exists(MONITORING_CONFIG_PATH):
        return {"stream_id": None, "attributes": [], "anchors": {}, "sop_steps": []}
    try:
        with open(MONITORING_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read monitoring config: {e}")


@app.post("/api/ingest-sop-audit")
async def ingest_sop_audit(data: SOPAuditEventIngest):
    try:
        entry = await asyncio.to_thread(_write_sop_audit_event_and_db, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to store SOP audit event: {str(e)}")

    dead_clients = []
    for client in connected_clients:
        try:
            await client.send_json({"kind": "sop_audit_event", **entry})
        except Exception:
            dead_clients.append(client)
    for client in dead_clients:
        connected_clients.remove(client)

    return {"status": "saved", "entry": entry}


@app.get("/api/sop-audit-reports")
def get_sop_audit_reports(response: Response, limit: int = 100, offset: int = 0, only_alerts: bool = False):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    query = "SELECT id, timestamp, stream_id, event_type, step_index, step_text, detail, video_path FROM sop_audit_events"
    if only_alerts:
        query += " WHERE event_type IN ('skipped','out_of_order')"
    query += " ORDER BY id DESC LIMIT ? OFFSET ?"

    cursor.execute(query, (limit, offset))
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "timestamp": make_readable_time(row[1]),
            "stream_id": row[2],
            "event_type": row[3],
            "step_index": row[4],
            "step_text": row[5],
            "detail": row[6],
            "video_path": row[7],
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# NEW: multi-stream SOP config + PER-PERSON motion-triggered event
# endpoints — this is what the current per-person DeepStream pipeline
# actually talks to.
# ---------------------------------------------------------------------------

@app.patch("/api/sop-config")
async def set_stream_sop_config(data: StreamSOPConfigSet):
    """
    UI calls this when a user assigns/edits one stream's SOP sequence, e.g.
    the pharma camera (stream_id=1) gets a cleanroom gowning sequence while
    the construction camera (stream_id=2) gets a totally different one.
    No VLM/anchor call happens here — just persists the ordered step list.

    UNCHANGED by the per-person pipeline update, and intentionally so: the
    pipeline's SOPConfigStore still polls GET /api/sop-config and keys
    sequences by stream_id only. What changed is what the pipeline does
    with a stream's sequence internally — it now applies it independently
    to EVERY tracked person on that stream (keyed by (stream_id,
    object_id)), instead of to one shared per-stream state. So editing a
    stream's sequence here still resets every person currently being
    tracked on that stream, exactly as before, and every OTHER stream's
    config (and every person on it) is left untouched.
    """
    if not data.sop_steps:
        raise HTTPException(status_code=400, detail="sop_steps cannot be empty")

    config = await asyncio.to_thread(_upsert_sop_stream_config, data.stream_id, data.sop_steps)

    dead_clients = []
    for client in connected_clients:
        try:
            await client.send_json({"kind": "sop_config_updated", **config})
        except Exception:
            dead_clients.append(client)
    for client in dead_clients:
        connected_clients.remove(client)

    return {"status": "success", "config": config}


@app.delete("/api/sop-config/{stream_id}")
async def clear_stream_sop_config(stream_id: int):
    """Stop monitoring a stream's SOP entirely (e.g. camera taken offline).
    Unchanged: this still stops monitoring for every person on the stream,
    since person-level state only exists inside the running pipeline
    process, not in this config table."""
    deleted = await asyncio.to_thread(_delete_sop_stream_config, stream_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"No SOP config found for stream_id={stream_id}")
    return {"status": "success", "stream_id": stream_id}


@app.get("/api/sop-config")
async def get_sop_config():
    """
    Polled by the pipeline's SOPConfigStore every SOP_CONFIG_POLL_SECONDS.
    Returns EVERY currently-configured stream at once. Unchanged shape —
    still per stream_id, not per person.
    """
    streams = await asyncio.to_thread(_get_all_sop_stream_configs)
    return {"streams": streams}


@app.post("/api/ingest-sop-event")
async def ingest_sop_event(data: SOPEventIngest):
    """
    Called by the pipeline's SOPWorker after a motion-triggered VLM check
    produces a sequence event (completed/skipped/out_of_order/overdue) for
    ONE SPECIFIC PERSON (object_id) on a stream. Stores the snapshot image
    + raw VLM answer, tagged with that person's object_id so two people's
    events on the same camera never get conflated in reports.
    """
    stream_part = f"{data.stream_id}"
    person_part = f"_person{data.object_id}" if data.object_id is not None else ""
    img_filename = f"sop_{stream_part}{person_part}_{data.timestamp}_{data.event_type}.jpg".replace(":", "-")
    img_path = os.path.join(SOP_IMAGE_STORE, img_filename)

    try:
        entry = await asyncio.to_thread(_write_sop_event_and_db, data, img_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to store SOP event: {str(e)}")

    dead_clients = []
    for client in connected_clients:
        try:
            await client.send_json({"kind": "sop_event", **entry})
        except Exception:
            dead_clients.append(client)
    for client in dead_clients:
        connected_clients.remove(client)

    return {"status": "saved", "entry": entry}


@app.get("/api/sop-events")
def get_sop_events(response: Response, stream_id: int | None = None,
                    object_id: int | None = None,
                    limit: int = 100, offset: int = 0, only_alerts: bool = False):
    """UI's SOP Reports page reads from here. Filter by stream_id to show
    just one camera's timeline, and/or by object_id to show just one
    person's timeline within that camera (e.g. person #7 on the pharma
    stream) — useful now that a single stream can have multiple people's
    sequences interleaved."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    query = ("SELECT id, timestamp, stream_id, object_id, event_type, step_index, step_text, "
              "raw_vlm_response, image_path FROM sop_events")
    conditions = []
    params: list = []
    if stream_id is not None:
        conditions.append("stream_id = ?")
        params.append(stream_id)
    if object_id is not None:
        conditions.append("object_id = ?")
        params.append(object_id)
    if only_alerts:
        conditions.append("event_type IN ('skipped','out_of_order','overdue')")
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "timestamp": make_readable_time(row[1]),
            "stream_id": row[2],
            "object_id": row[3],
            "event_type": row[4],
            "step_index": row[5],
            "step_text": row[6],
            "raw_vlm_response": row[7],
            "image_path": row[8],
        }
        for row in rows
    ]


@app.get("/api/sop-events/person-ids")
def get_sop_person_ids(stream_id: int | None = None):
    """New: lists distinct person (object_id) values seen in sop_events,
    optionally scoped to one stream. Powers a 'Person' filter dropdown on
    the SOP Reports page alongside the existing 'Camera' dropdown."""
    return {"object_ids": _get_distinct_person_ids(stream_id)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)