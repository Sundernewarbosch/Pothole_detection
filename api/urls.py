from django.urls import path
from .views import detect, share_pothole, get_latest_pothole, get_all_potholes, leaderboard

urlpatterns = [
    path("detect/", detect),
    path("share/<str:id>/", share_pothole, name="share_pothole"),
    path("latest/<str:deviceId>/", get_latest_pothole, name="get_pothole"),
    path('potholes/', get_all_potholes, name='get_all_potholes'),
    path('leaderboard/', leaderboard, name='leaderboard')
]
