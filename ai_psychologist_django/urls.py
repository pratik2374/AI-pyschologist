"""
URL configuration for AI Psychologist Django project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from psychologist_app import views

urlpatterns = [
    path('', views.index, name='index'),
    path('psychologist', views.psychologist_endpoint, name='psychologist'),
    path('api/register', views.register, name='register'),
    path('api/login', views.login, name='login'),
    path('api/logout', views.logout, name='logout'),
    path('api/me', views.me, name='me'),
    path('api/sessions/start', views.start_therapy_session, name='start_therapy_session'),
    path('api/sessions', views.list_therapy_sessions, name='list_therapy_sessions'),
    path('api/sessions/current', views.current_session, name='current_session'),
    path('api/sessions/select', views.select_session, name='select_session'),
    path('api/sessions/<str:session_id>/messages', views.session_messages, name='session_messages'),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0] if settings.STATICFILES_DIRS else None)