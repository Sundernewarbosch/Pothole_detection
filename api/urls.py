from django.urls import path
from .views import detect, share_pothole, get_pothole

urlpatterns = [
    path("detect/", detect),
    path("share/<int:id>/", share_pothole, name="share_pothole"),
    path("latest/<str:deviceId>/", get_pothole, name="get_pothole"),
]
