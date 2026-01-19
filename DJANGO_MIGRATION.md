# Django Backend Migration Guide

The FastAPI backend has been successfully migrated to Django while maintaining all existing functionality.

## Project Structure

```
.
├── manage.py                          # Django management script
├── ai_psychologist_django/            # Django project directory
│   ├── __init__.py
│   ├── settings.py                    # Django settings
│   ├── urls.py                        # URL routing
│   └── wsgi.py                        # WSGI configuration
├── psychologist_app/                  # Django app directory
│   ├── __init__.py
│   ├── apps.py
│   └── views.py                       # API endpoints
├── static/                            # Static files (CSS, JS, HTML)
│   ├── index.html
│   ├── css/
│   └── js/
└── requirements.txt                   # Updated with Django

```

## Key Changes

### Backend Framework
- **Before**: FastAPI (`app_backend.py`)
- **After**: Django (project + app structure)

### Endpoints (Unchanged)
- `GET /` - Serves index.html (same as FastAPI)
- `POST /psychologist` - Handles psychologist queries (same as FastAPI)

### Functionality (Unchanged)
- ✅ Crisis detection and response
- ✅ Therapy mode determination
- ✅ Session management
- ✅ Memory management
- ✅ All AI psychologist features

## Running the Django Backend

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Database Migrations (if needed)
```bash
python manage.py migrate
```

### 3. Start the Development Server
```bash
python manage.py runserver
```

The server will start on `http://127.0.0.1:8000/`

### 4. Access the Application
- Frontend: `http://127.0.0.1:8000/`
- API Endpoint: `http://127.0.0.1:8000/psychologist`

## Configuration

All configuration remains the same - using `config.py` and environment variables:
- `OPENAI_API_KEY` - Required
- `MONGODB_URL` - Required
- `MONGODB_DB_NAME` - Optional (defaults to "agno")

## Differences from FastAPI

1. **CSRF Protection**: Django views use `@csrf_exempt` decorator for the API endpoint (same as FastAPI had no CSRF)
2. **Static Files**: Served automatically by Django in development
3. **Request Parsing**: Django uses `json.loads(request.body)` instead of Pydantic models
4. **Response Format**: Django uses `JsonResponse` instead of FastAPI's automatic JSON responses

## Testing

The frontend (`static/index.html` and `static/js/chat.js`) works exactly the same with the Django backend. No frontend changes are required.

## Production Deployment

For production, make sure to:
1. Set `DEBUG = False` in `settings.py`
2. Configure proper `ALLOWED_HOSTS`
3. Set a secure `SECRET_KEY`
4. Run `python manage.py collectstatic`
5. Use a production WSGI server (e.g., Gunicorn + Nginx)