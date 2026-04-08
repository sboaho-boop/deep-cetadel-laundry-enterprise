from django.db import models
from django.contrib.auth.models import User

class Staff(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    role = models.CharField(max_length=50, default='staff')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class Service(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='per item')
    color = models.CharField(max_length=20, default='#00c6e0')
    active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class Order(models.Model):
    invoice_number = models.CharField(max_length=50, unique=True)
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=20)
    items_json = models.TextField(default='[]')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='RECEIVED')
    payment_status = models.CharField(max_length=20, default='pending')
    payment_method = models.CharField(max_length=20, blank=True, null=True)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.invoice_number
