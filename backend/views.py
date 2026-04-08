from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
import json

User = get_user_model()

@csrf_exempt
def admin_setup(request):
    """Check if admin exists or create first admin user"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except:
            data = {}
        
        # Check if admin exists
        if not data.get('action') or data.get('action') == 'check':
            has_admin = User.objects.filter(is_superuser=True).exists()
            return JsonResponse({'has_admin': has_admin})
        
        # Create admin user
        if data.get('action') == 'create':
            username = data.get('username', 'admin')
            password = data.get('password', 'admin123')
            email = data.get('email', 'admin@deepcitadel.com')
            
            if User.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'error': 'User already exists'})
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_staff=True,
                is_superuser=True
            )
            return JsonResponse({'success': True, 'username': username, 'password': password})
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@csrf_exempt
def admin_login(request):
    """Admin/Staff login"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except:
            return JsonResponse({'error': 'Invalid request'}, status=400)
        
        username = data.get('username')
        password = data.get('password')
        
        from django.contrib.auth import authenticate
        user = authenticate(username=username, password=password)
        
        if user is not None and user.is_active:
            from django.contrib.auth import login
            login(request, user)
            return JsonResponse({
                'success': True,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'role': 'admin' if user.is_superuser else 'staff'
            })
        else:
            return JsonResponse({'success': False, 'error': 'Invalid credentials'})
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

@csrf_exempt
def admin_logout(request):
    """Admin/Staff logout"""
    if request.method == 'POST':
        from django.contrib.auth import logout
        logout(request)
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Invalid request'}, status=400)

def get_session(request):
    """Get current session info"""
    if request.user.is_authenticated:
        return JsonResponse({
            'authenticated': True,
            'username': request.user.username,
            'name': request.user.get_full_name() or request.user.username,
            'role': 'admin' if request.user.is_superuser else 'staff'
        })
    return JsonResponse({'authenticated': False})

@login_required
def get_dashboard(request):
    """Dashboard stats"""
    from .models import Order, Service, Staff
    
    return JsonResponse({
        'total_orders': Order.objects.count(),
        'pending_orders': Order.objects.filter(status__in=['RECEIVED', 'WASHING', 'DRYING', 'IRONING']).count(),
        'completed_orders': Order.objects.filter(status='COLLECTED').count(),
        'total_services': Service.objects.filter(active=True).count(),
        'total_staff': Staff.objects.filter(active=True).count(),
    })

@login_required
def get_staff_list(request):
    """List all staff"""
    from .models import Staff
    staff = Staff.objects.all()
    return JsonResponse([{
        'id': s.id,
        'name': s.name,
        'email': s.email,
        'role': s.role,
        'active': s.active
    } for s in staff], safe=False)

@login_required
def create_staff(request):
    """Create new staff"""
    if request.method == 'POST':
        data = json.loads(request.body)
        from .models import Staff
        staff = Staff.objects.create(
            name=data['name'],
            email=data['email'],
            password=data['password'],
            role=data.get('role', 'staff'),
            active=True
        )
        return JsonResponse({'success': True, 'id': staff.id})
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def get_services(request):
    """List all services"""
    from .models import Service
    services = Service.objects.filter(active=True)
    return JsonResponse([{
        'id': s.id,
        'name': s.name,
        'price': float(s.price),
        'unit': s.unit,
        'color': s.color
    } for s in services], safe=False)

def get_orders(request):
    """List all orders (public for tracking, protected for admin)"""
    from .models import Order
    status = request.GET.get('status')
    
    if status:
        orders = Order.objects.filter(status=status)
    else:
        orders = Order.objects.all()
    
    return JsonResponse([{
        'id': o.id,
        'invoice_number': o.invoice_number,
        'customer_name': o.customer_name,
        'customer_phone': o.customer_phone,
        'items': json.loads(o.items_json),
        'total': float(o.total),
        'status': o.status,
        'created_at': o.created_at.isoformat()
    } for o in orders], safe=False)

def track_order(request, invoice_id):
    """Track order by invoice number"""
    from .models import Order
    try:
        order = Order.objects.get(invoice_number=invoice_id)
        return JsonResponse({
            'invoice_number': order.invoice_number,
            'customer_name': order.customer_name,
            'customer_phone': order.customer_phone,
            'items': json.loads(order.items_json),
            'total': float(order.total),
            'status': order.status,
            'payment_status': order.payment_status,
            'created_at': order.created_at.isoformat()
        })
    except Order.DoesNotExist:
        return JsonResponse({'error': 'Order not found'}, status=404)

@login_required
def create_order(request):
    """Create new order"""
    if request.method == 'POST':
        data = json.loads(request.body)
        from .models import Order
        import uuid
        invoice = f"INV-{uuid.uuid4().hex[:6].upper()}"
        
        order = Order.objects.create(
            invoice_number=invoice,
            customer_name=data['name'],
            customer_phone=data['phone'],
            items_json=json.dumps(data.get('items', [])),
            total=data.get('total', 0),
            status='RECEIVED',
            payment_status='pending'
        )
        return JsonResponse({'success': True, 'invoice_id': invoice})
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def update_order_status(request, invoice_id):
    """Update order status"""
    if request.method == 'POST':
        data = json.loads(request.body)
        from .models import Order
        try:
            order = Order.objects.get(invoice_number=invoice_id)
            order.status = data.get('status', order.status)
            order.save()
            return JsonResponse({'success': True})
        except Order.DoesNotExist:
            return JsonResponse({'error': 'Order not found'}, status=404)
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def record_payment(request, invoice_id):
    """Record payment for order"""
    if request.method == 'POST':
        data = json.loads(request.body)
        from .models import Order
        try:
            order = Order.objects.get(invoice_number=invoice_id)
            order.payment_status = 'paid'
            order.payment_method = data.get('method', 'cash')
            order.payment_amount = data.get('amount', 0)
            order.transaction_id = data.get('transaction_id', '')
            order.save()
            return JsonResponse({'success': True})
        except Order.DoesNotExist:
            return JsonResponse({'error': 'Order not found'}, status=404)
    return JsonResponse({'error': 'Invalid request'}, status=400)
