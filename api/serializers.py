from rest_framework import serializers
from .models import PotholeDetection

class PotholeDetectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PotholeDetection
        fields = ['id', 'share_uuid', 'deviceId', 'image', 'latitude', 'longitude', 'city', 'detected_at']