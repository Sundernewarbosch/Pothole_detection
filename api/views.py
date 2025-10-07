import base64, os
import cv2
import numpy as np
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "api/models/best.pt")

model = YOLO(MODEL_PATH)

@api_view(["POST"])
def detect(request):
    """
    Accepts a JSON with a base64 image from React.
    Returns bounding boxes and class labels.
    """
    try:
        img_data = request.data.get("image")
        if not img_data:
            return Response({"error": "No image provided"}, status=400)

        # Remove base64 prefix
        img_bytes = base64.b64decode(img_data.split(",")[1])

        # Convert bytes to OpenCV image
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run YOLOv8 inference
        results = model.predict(img, verbose=False)

        # Prepare JSON response
        detections = []
        for r in results:
            boxes = getattr(r, "boxes", None)
            if boxes is not None:
                for box in boxes:
                    detections.append({
                        "class": model.names[int(box.cls)],
                        "confidence": float(box.conf),
                        "bbox": box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                    })

        return Response({"detections": detections})

    except Exception as e:
        return Response({"error": str(e)}, status=400)
