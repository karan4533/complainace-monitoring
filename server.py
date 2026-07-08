import asyncio
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
from pydantic import BaseModel
import subprocess
import os
from PIL import Image
import tempfile
import signal
import textwrap 
import time
import urllib.request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import Response
from fastapi.responses import StreamingResponse
from fpdf import FPDF
import sqlite3
import base64
import asyncio
from datetime import datetime, date
import io

app = FastAPI()
app.mount("/stored_images", StaticFiles(directory="stored_images"), name="stored_images")
connected_clients: List[WebSocket] = []

# --- Configuration & Setup ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CONTAINER_NAME = "aeaa0b51d3de"
PIPELINE_SCRIPT = "ppe-dev.py"
DB_NAME = "/home/jananayaganv23/ppe-dashboard/backend/ppe_violations.db"
IMAGE_STORE = "./stored_images"

os.makedirs(IMAGE_STORE, exist_ok=True)

processes = {
    "deepstream": None,
    "go2rtc": None
}

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
# --- Database Initialization ---
def init_db():
    conn = sqlite3.connect(DB_NAME)
    conn.execute('''CREATE TABLE IF NOT EXISTS violations 
                    (id INTEGER PRIMARY KEY, timestamp TEXT, label TEXT, 
                     stream_id INTEGER, confidence REAL, image_path TEXT)''')
    conn.commit()
    conn.close()


init_db()



def _write_image_and_db(data: Violation, img_path: str):
    """Runs off the event loop — all blocking I/O lives here."""
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

def parse_stored_timestamp(ts: str) -> datetime:
    """
    Parses timestamps that may have been written with slightly different
    formats over time (space vs 'T' separator, with/without microseconds).
    Raises ValueError on a truly unrecognized format so the caller can skip
    that row instead of miscounting it.
    """
    ts = ts.strip()
    
    # NEW: Remove 'Z' if it exists. This fixes the Python 3.10 ValueError
    # and keeps the timestamp timezone-naive so it safely compares to range_start.
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
    """
    start_date_str / end_date_str: accepts 'YYYY-MM-DD' or 'YYYY/MM/DD' (required)
    start_time_str / end_time_str: 'HH:MM' 24-hour (optional)

    Rules:
      - start_time given  -> combined with start_date exactly
      - start_time absent -> defaults to 00:00:00 of start_date
      - end_time given    -> combined with end_date exactly
      - end_time absent   -> defaults to 23:59:59.999999 of end_date,
                              UNLESS end_date is today, in which case
                              it defaults to "now" (never implies future data)
    """
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
        # Replace 'Z' to make it compatible with Python's isoformat parser
        clean_str = iso_string.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        
        # Format to: "Jul 07, 2026 - 08:09:58 AM"
        return dt.strftime("%b %d, %Y - %I:%M:%S %p")
    except Exception:
        # Fallback to the original string if parsing fails
        return iso_string
    
def _get_thumbnail_path(image_path: str, tmp_dir: str) -> str | None:
    if not os.path.exists(image_path):
        return None
    thumb_path = os.path.join(tmp_dir, os.path.basename(image_path))
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img.thumbnail((480, 330))  # ~4x render size @ 48x33mm, plenty for print
            img.save(thumb_path, "JPEG", quality=75)
        return thumb_path
    except Exception:
        return None
    

# --- Helper Functions ---
def get_external_ip():
    """
    Fetches the VM's external IP from GCP instance metadata first,
    falling back to ipify. Never returns localhost.
    """
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
    """True only if we have a Popen handle AND it hasn't exited."""
    proc = processes.get(key)
    return proc is not None and proc.poll() is None


def _wait_for_rtsp(host: str = "127.0.0.1", port: int = 8554, timeout: int = 30) -> bool:
    """
    Polls until DeepStream's RTSP server is accepting TCP connections, or
    timeout is reached. Returns True if the port came up, False if it timed out.

    Why this exists: go2rtc is started AFTER DeepStream, but DeepStream takes
    several seconds to build the pipeline and start GstRtspServer. If go2rtc
    starts too early it finds port 8554 empty, logs a connect error, and never
    retries (it only retries when a WebRTC client actually asks for the stream).
    By waiting here we guarantee go2rtc connects successfully on first try.
    """
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

        # NEW: force-free port 8554 in case a lingering process is still bound to it
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
            break  # rows are DESC by id/time, so everything after this is out of range too

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

            pdf_bytes = bytes(pdf.output())  # must stay inside the `with` block

    return pdf_bytes if rows else bytes(pdf.output())

# @app.exception_handler(RequestValidationError)
# async def validation_exception_handler(request, exc):
#     print(f"[422] {request.url.path} -> {exc.errors()}")
#     return JSONResponse(status_code=422, content={"detail": exc.errors()})

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


# --- Endpoints ---
@app.get("/api/stream-config")
async def get_stream_config():
    """
    Returns the WebRTC player URL using the VM's real external IP.
    The frontend uses window.location.hostname for its own API calls, but
    this URL points at go2rtc's player which also needs the real external IP.
    """
    current_ip = get_external_ip()
    stream_url = f"http://{current_ip}:1984/stream.html?src=ds-test"
    return {"streamUrl": stream_url}


@app.get("/api/pipeline-status")
async def pipeline_status():
    """
    Frontend polls this after calling start-pipeline to know when it's
    safe to load the stream iframe.
    """
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

        # --- Step 1: Start DeepStream pipeline inside the container ---
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

        # --- Step 2: Wait until DeepStream's RTSP server is actually up ---
        rtsp_ready = _wait_for_rtsp(port=8554, timeout=60)
        if not rtsp_ready:
            await _stop_all_processes()
            raise HTTPException(
                status_code=500,
                detail="DeepStream RTSP server did not come up within 60s. Check pipeline_debug.log."
            )

        go2rtc_path = os.path.expanduser("~/go2rtc")
        yaml_file_path = os.path.join(go2rtc_path, "go2rtc.yaml")
        
        



        # --- Step 4: Now start go2rtc (RTSP source is guaranteed live, config is fresh) ---
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
            # Apply the formatter right here before sending to React
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
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
