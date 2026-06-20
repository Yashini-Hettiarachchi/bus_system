from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import joblib
import time
import threading
import random
import os
import shutil

from database import SessionLocal, engine, Base
from models import Advertisement

app = FastAPI(title="TransitAds - Smart Bus Advertising System")

Base.metadata.create_all(bind=engine)

# ================= CORS =================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= STATIC =================
app.mount("/ads", StaticFiles(directory="ads"), name="ads")

# ================= LOAD MODEL =================
model = joblib.load("bus_ad_city_model.pkl")
cities = joblib.load("city_mapping.pkl")

# ================= SIMULATION =================
current_journey_minutes = 0
simulation_speed = 15
is_simulation_running = False
simulation_thread = None
current_direction = 0

# 🔥 Memory for avoiding repetition
last_served_ads = {}

# ================= DB =================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ================= TIME =================
def get_time_category():
    time_of_day = int((current_journey_minutes % 1440) // 360) % 4
    return ["morning", "midday", "evening", "night"][time_of_day]

# ================= ROUTE FILTER =================
def get_allowed_cities():
    if current_direction == 0:
        # Forward
        return ["kurunegala", "dambulla", "kekirawa", "anuradhapura"]
    else:
        # Reverse
        return ["kekirawa", "dambulla", "kurunegala", "colombo"]

# ================= STATUS =================
@app.get("/current_status")
def get_current_status():
    time_name = get_time_category()
    time_index = ["morning", "midday", "evening", "night"].index(time_name)

    try:
        prediction = model.predict([
            [current_journey_minutes, time_index, current_direction]
        ])[0]
    except:
        return {"error": "Model prediction failed"}

    if prediction < 0 or prediction >= len(cities):
        return {"error": "Invalid prediction"}

    current_city = cities[prediction]

    return {
        "journey_minutes": current_journey_minutes,
        "current_city": current_city,
        "time_of_day": time_name,
        "direction": "Forward" if current_direction == 0 else "Reverse",
        "is_running": is_simulation_running,
        "route_context": (
            "Colombo → Anuradhapura"
            if current_direction == 0
            else "Anuradhapura → Colombo"
        )
    }

# ================= ADS =================
@app.get("/ads")
def get_current_ads(db: Session = Depends(get_db)):
    global last_served_ads

    time_name = get_time_category()
    time_index = ["morning", "midday", "evening", "night"].index(time_name)

    try:
        prediction = model.predict([
            [current_journey_minutes, time_index, current_direction]
        ])[0]
    except:
        return {"current_city": None, "image_url": None}

    if prediction < 0 or prediction >= len(cities):
        return {"current_city": None, "image_url": None}

    current_city = cities[prediction]
    city_key = current_city.lower()
    time_key = time_name.lower()

    # 🔥 ROUTE FILTER (CRITICAL FIX)
    allowed_cities = get_allowed_cities()
    if city_key not in allowed_cities:
        return {"current_city": current_city, "image_url": None}

    ads = db.query(Advertisement).filter(
        Advertisement.city == city_key,
        Advertisement.time_category == time_key
    ).all()

    if not ads:
        return {"current_city": current_city, "image_url": None}

    # 🔥 Avoid repetition
    last_ad_id = last_served_ads.get(city_key)
    available_ads = [a for a in ads if a.id != last_ad_id] or ads

    ad = random.choice(available_ads)
    last_served_ads[city_key] = ad.id

    if not os.path.exists(ad.file_path):
        return {"current_city": current_city, "image_url": None}

    return {
        "current_city": current_city,
        "journey_minutes": int(current_journey_minutes),
        "image_url": f"/{ad.file_path.replace('\\', '/')}",
        "title": ad.title,
        "shop_name": ad.shop_name,
        "media_type": ad.media_type,
        "time_category": ad.time_category,
        "direction": "Forward" if current_direction == 0 else "Reverse"
    }

# ================= ADMIN =================
@app.post("/admin/ads")
async def upload_ad(
    file: UploadFile = File(...),
    city: str = Form(...),
    title: str = Form(...),
    shop_name: str = Form(...),
    time_category: str = Form(...),
    db: Session = Depends(get_db)
):
    city_lower = city.lower()
    time_lower = time_category.lower()

    if city_lower not in [c.lower() for c in cities]:
        raise HTTPException(status_code=400, detail="Invalid city")

    folder = f"ads/{city_lower}"
    os.makedirs(folder, exist_ok=True)

    filename = f"{title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{os.path.splitext(file.filename)[1]}"
    file_path = f"{folder}/{filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    media_type = "video" if file.filename.lower().endswith((".mp4", ".mov")) else "image"

    new_ad = Advertisement(
        title=title,
        shop_name=shop_name,
        city=city_lower,
        time_category=time_lower,
        file_path=file_path,
        media_type=media_type
    )

    db.add(new_ad)
    db.commit()
    db.refresh(new_ad)

    return {"message": "Uploaded", "id": new_ad.id}

@app.put("/admin/ads/{ad_id}")
async def update_ad(
    ad_id: int,
    file: Optional[UploadFile] = File(None),
    city: str = Form(...),
    title: str = Form(...),
    shop_name: str = Form(...),
    time_category: str = Form(...),
    db: Session = Depends(get_db)
):
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()

    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")

    city_lower = city.lower()
    time_lower = time_category.lower()

    if city_lower not in [c.lower() for c in cities]:
        raise HTTPException(status_code=400, detail="Invalid city")

    ad.city = city_lower
    ad.title = title
    ad.shop_name = shop_name
    ad.time_category = time_lower

    if file is not None:
        folder = f"ads/{city_lower}"
        os.makedirs(folder, exist_ok=True)

        filename = f"{title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{os.path.splitext(file.filename)[1]}"
        file_path = f"{folder}/{filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if ad.file_path and os.path.exists(ad.file_path):
            os.remove(ad.file_path)

        ad.file_path = file_path
        ad.media_type = "video" if file.filename.lower().endswith((".mp4", ".mov")) else "image"

    db.commit()
    db.refresh(ad)

    return {"message": "Updated", "id": ad.id}

@app.get("/admin/ads")
def list_ads(db: Session = Depends(get_db)):
    return db.query(Advertisement).all()

@app.delete("/admin/ads/{ad_id}")
def delete_ad(ad_id: int, db: Session = Depends(get_db)):
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()

    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")

    if os.path.exists(ad.file_path):
        os.remove(ad.file_path)

    db.delete(ad)
    db.commit()

    return {"message": "Deleted"}

# ================= SIM =================
@app.post("/control_simulation")
def control_simulation(action: str, direction: int = None):
    global current_journey_minutes, is_simulation_running, simulation_thread, current_direction

    if direction is not None:
        current_direction = direction
        current_journey_minutes = 0

    if action == "start":
        if not is_simulation_running:
            is_simulation_running = True
            simulation_thread = threading.Thread(target=run_simulation, daemon=True)
            simulation_thread.start()

    elif action == "stop":
        is_simulation_running = False

    elif action == "reset":
        current_journey_minutes = 0
        is_simulation_running = False

    return {"status": "ok"}

def run_simulation():
    global current_journey_minutes, is_simulation_running

    while is_simulation_running and current_journey_minutes < 320:
        time.sleep(1)
        current_journey_minutes += simulation_speed

        if current_journey_minutes >= 320:
            current_journey_minutes = 320
            is_simulation_running = False