"""
URL configuration for AI Psychologist Django project.
"""
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from psychologist_app import views

urlpatterns = [
    path('', views.index, name='index'),
    path('psychologist', views.psychologist_endpoint, name='psychologist'),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0] if settings.STATICFILES_DIRS else None)