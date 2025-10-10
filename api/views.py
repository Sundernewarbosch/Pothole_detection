import base64, os, cv2, numpy as np
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ultralytics import YOLO
from django.core.files.base import ContentFile
from .models import PotholeDetection
from django.contrib.auth.models import User
from .serializers import PotholeDetectionSerializer

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "api/models/best.pt")

model = YOLO(MODEL_PATH)

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
            "detections": [best_detection],
            "message": "Pothole detected and saved!"
        }, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
def share_pothole(request, id):
    try:
        pothole = PotholeDetection.objects.get(id=id)

        text_description = (
            f"Pothole detected in {pothole.city or 'and unknown area'}"
            f"on {pothole.detected_at.strftime('%Y-%m-%d')}."
        )

        context = {
            "pothole_id" : pothole.id,
            "image_url": request.build_absolute_uri(pothole.image.url),
            "description": text_description,
            "latitude" : pothole.latitude,
            "longitude": pothole.longitude,
            "city": pothole.city,
            "detected_at" : pothole.detected_at.strftime('%Y-%m-%d'),
            "share_url": request.build_absolute_uri(),
        }
        return Response(context, status=200)
    
    except PotholeDetection.DoesNotExist:
        return Response({"error": "Pothole not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    
@api_view(['GET'])
def get_pothole(request, deviceId):
    try:
        pothole = PotholeDetection.objects.filter(deviceId=deviceId).order_by('-detected_at').first()

        if not pothole:
            return Response({"message":"Invalid device id"}, status=400)
        
        serializer = PotholeDetectionSerializer(pothole)
        return Response(serializer.data, status=200)
    
    except Exception as e:
        return Response({"error": str(e)}, status=400)