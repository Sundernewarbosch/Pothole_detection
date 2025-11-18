import base64, os, cv2, numpy as np
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ultralytics import YOLO
from django.core.files.base import ContentFile
from .models import PotholeDetection
from django.contrib.auth.models import User
from .serializers import PotholeDetectionSerializer
from django.db.models import Count, F, Case, When, CharField
from math import radians, sin, cos, sqrt, atan2
from django.utils import timezone


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "api/models/best.pt")

model = YOLO(MODEL_PATH)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lon2 - lon1)

    a = sin(d_phi/2)**2 + cos(phi1) * cos(phi2) * sin(d_lambda/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

@api_view(["POST"])
def detect(request):
    try:
        img_data = request.data.get("image")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        deviceId = request.data.get("deviceId")
        city = request.data.get("city")

        if not img_data:
            return Response({"error": "No image provided"}, status=400)

        latitude = float(latitude)
        longitude = float(longitude)

        # --- DUPLICATE CHECK ---
        EXIST_THRESHOLD_METERS = 0.5# adjust as needed (5–20m recommended)

        nearby_reports = []

        for p in PotholeDetection.objects.all():
            if p.latitude and p.longitude:
                d = haversine(latitude, longitude, float(p.latitude), float(p.longitude))
                if d <= EXIST_THRESHOLD_METERS:
                    nearby_reports.append(p)

        if nearby_reports:
            # Already reported → return flag to frontend
            return Response({
                "already_exists": True,
                "detections": [],
                "message": "Pothole already reported recently"
            }, status=200)

        # ---------------------------------------------------
        # Continue with your existing detection & saving
        # ---------------------------------------------------

        # Decode base64 to OpenCV image
        img_bytes = base64.b64decode(img_data.split(",")[1])
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run YOLO
        results = model.predict(img, verbose=False)
        detections = []

        for r in results:
            boxes = getattr(r, "boxes", None)
            if boxes is not None:
                for box in boxes:
                    detections.append({
                        "class": model.names[int(box.cls)],
                        "confidence": float(box.conf),
                        "bbox": box.xyxy[0].tolist()
                    })

        if not detections:
            return Response({
                "detections": [],
                "message": "No potholes detected"
            }, status=200)

        # Best detection
        best_detection = max(detections, key=lambda d: d["confidence"])

        image_file = ContentFile(img_bytes, name="pothole.jpg")

        PotholeDetection.objects.create(
            deviceId=deviceId,
            latitude=latitude,
            longitude=longitude,
            city=city or "",
            result={"detections": [best_detection]},
            image=image_file
        )

        return Response({
            "already_exists": False,
            "detections": [best_detection],
            "message": "Pothole detected and saved!"
        }, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(['GET'])
def share_pothole(request, id):
    try:
        pothole = PotholeDetection.objects.get(share_uuid=id)

        # Convert to local timezone (uses settings.TIME_ZONE by default)
        local_dt = timezone.localtime(pothole.detected_at)

        # Provide both a machine-friendly ISO timestamp and a human-friendly display
        iso_ts = local_dt.isoformat()
        display_ts = local_dt.strftime('%Y-%m-%d %H:%M:%S')  # adjust format as needed

        text_description = (
            f"Pothole detected in {pothole.city or 'an unknown area'} "
            f"on {display_ts}."
        )

        context = {
            "pothole_id": pothole.id,
            "image_url": request.build_absolute_uri(pothole.image.url),
            "description": text_description,
            "latitude": pothole.latitude,
            "longitude": pothole.longitude,
            "city": pothole.city,
            "detected_at": iso_ts,          # ISO with timezone offset
            "detected_at_display": display_ts,  # human readable in local tz
            "share_uuid": pothole.share_uuid,
        }
        return Response(context, status=200)

    except PotholeDetection.DoesNotExist:
        return Response({"error": "Pothole not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    
@api_view(['GET'])
def get_latest_pothole(request, deviceId):
    try:
        pothole = PotholeDetection.objects.filter(deviceId=deviceId).order_by('-detected_at').first()

        if not pothole:
            return Response({"message":"Invalid device id"}, status=400)
        
        serializer = PotholeDetectionSerializer(pothole)
        return Response(serializer.data, status=200)
    
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    

@api_view(['GET'])
def get_all_potholes(request):
    potholes = PotholeDetection.objects.values('latitude', 'longitude')
    return Response(list(potholes))





@api_view(["GET"])
def leaderboard(request):
    # Aggregate detections by user/device
    detections = (
        PotholeDetection.objects
        .annotate(
            display_name=Case(
                When(user__isnull=False, then=F("user__username")),
                default=F("deviceId"),
                output_field=CharField(),
            )
        )
        .values("display_name", "user", "deviceId")
        .annotate(post_count=Count("id"))
        .order_by("-post_count")
    )

    # Create friendly aliases for anonymous users (device-only)
    anon_counter = 1
    anon_map = {}
    data = []

    for d in detections:
        if d["user"] is None:
            # Anonymous device — assign unique alias
            device_id = d["deviceId"]
            if device_id not in anon_map:
                anon_map[device_id] = f"User{anon_counter}"
                anon_counter += 1
            username = anon_map[device_id]
        else:
            # Logged-in user — use actual username
            username = d["display_name"]

        data.append({
            "username": username,
            "deviceId": d["deviceId"],  
            "post_count": d["post_count"],
        })

    # Limit to top 10
    data = sorted(data, key=lambda x: x["post_count"], reverse=True)

    return Response(data)
