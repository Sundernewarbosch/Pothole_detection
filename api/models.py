from django.db import models
from django.contrib.auth.models import User

class PotholeDetection(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    image = models.ImageField(upload_to='detections/')
    result = models.JSONField()  # can store confidence, bounding boxes, etc.
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    city = models.CharField(max_length=100, blank=True)
    detected_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pothole at {self.city or 'Unknown'} on {self.detected_at:%Y-%m-%d %H:%M}"
