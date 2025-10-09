import base64, os, cv2, numpy as np
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ultralytics import YOLO
from django.core.files.base import ContentFile
from .models import PotholeDetection
from django.contrib.auth.models import User

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "api/models/best.pt")

model = YOLO(MODEL_PATH)

@api_view(["POST"])
def detect(request):
    try:
        img_data = request.data.get("image")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        username = request.data.get("username")
        city = request.data.get("city")

        if not img_data:
            return Response({"error": "No image provided"}, status=400)

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

        # Get detection with max confidence
        best_detection = max(detections, key=lambda d: d["confidence"])

        # Save to DB
        user = None
        if username:
            user, _ = User.objects.get_or_create(username=username)

        image_file = ContentFile(img_bytes, name="pothole.jpg")
        PotholeDetection.objects.create(
            user=user,
            latitude=latitude,
            longitude=longitude,
            city=city or "",
            result={"detections": [best_detection]},
            image=image_file
        )

        return Response({
            "detections": [best_detection],
            "message": "Pothole detected and saved!"
        }, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=400)
