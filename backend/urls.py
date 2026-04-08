from django.urls import path
from . import views

urlpatterns = [
    # Admin setup (public)
    path('admin/setup/', views.admin_setup, name='admin_setup'),
    
    # Auth (public)
    path('admin/login/', views.admin_login, name='admin_login'),
    path('admin/logout/', views.admin_logout, name='admin_logout'),
    path('admin/auth/session/', views.get_session, name='get_session'),
    
    # Dashboard (protected)
    path('admin/dashboard/', views.get_dashboard, name='get_dashboard'),
    
    # Staff management (protected)
    path('admin/staff/', views.get_staff_list, name='get_staff_list'),
    path('admin/staff/create/', views.create_staff, name='create_staff'),
    
    # Services (protected)
    path('admin/services/', views.get_services, name='get_services'),
    
    # Orders
    path('admin/orders/', views.get_orders, name='get_orders'),
    path('user/orders/', views.create_order, name='create_order'),
    path('user/track/<str:invoice_id>/', views.track_order, name='track_order'),
    path('user/staff/orders/', views.get_orders, name='get_orders'),
    path('user/staff/orders/<str:invoice_id>/', views.track_order, name='track_order'),
    path('user/staff/orders/<str:invoice_id>/update/', views.update_order_status, name='update_order_status'),
    path('user/staff/orders/<str:invoice_id>/pay/', views.record_payment, name='record_payment'),
]
