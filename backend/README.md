# Deep Citadel Laundry - Backend

Django backend for the Deep Citadel Laundry system.

## Setup on PythonAnywhere

1. **Create a new web app** in PythonAnywhere
   - Choose "Django" as the framework
   - Set Python version to 3.10+

2. **Upload these files** to your new Django project folder:
   - `views.py` - API endpoints
   - `models.py` - Database models
   - `urls.py` - URL routing

3. **Update your main urls.py** to include the API routes:
```python
from django.urls import path, include

urlpatterns = [
    # ... your existing urls
    path('api/', include('your_api_app.urls')),
]
```

4. **Run migrations:**
```bash
python manage.py makemigrations
python manage.py migrate
```

5. **Reload your web app** from the PythonAnywhere Web tab

## API Endpoints

### Public:
- `POST /api/admin/setup/` - Check if admin exists or create first admin
- `POST /api/admin/login/` - Admin login
- `GET /api/user/track/<invoice_id>/` - Track order

### Protected (require login):
- `GET /api/admin/dashboard/` - Dashboard stats
- `GET /api/admin/staff/` - List staff
- `POST /api/admin/staff/create/` - Create staff
- `GET /api/admin/services/` - List services
- `POST /api/user/orders/` - Create order
- `PATCH /api/user/staff/orders/<invoice_id>/update/` - Update order status
- `POST /api/user/staff/orders/<invoice_id>/pay/` - Record payment

## First Time Setup

After deploying:
1. Go to the frontend
2. You'll see the Admin Setup page
3. Create your first admin account
4. Use those credentials to log in
