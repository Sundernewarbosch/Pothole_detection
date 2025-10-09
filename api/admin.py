from django.contrib import admin
from .models import PotholeDetection
from django.utils.html import format_html

@admin.register(PotholeDetection)
class PotholeDetectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'city', 'latitude', 'longitude', 'detected_at', 'image_preview')
    search_fields = ("user__username",)
    list_filter = ("detected_at",)
    readonly_fields = ('image_preview', 'detected_at')

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width:150px; height:auto;" />', obj.image.url)
        return "No Image"
    image_preview.short_description = "Image Preview"

