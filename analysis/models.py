# analysis/models.py

from django.db import models
from django.contrib.auth.models import User
from django.db import models

class WatchlistItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    symbol = models.CharField(max_length=10)
    name = models.CharField(max_length=255)

    def __str__(self):
        return f'{self.symbol} - {self.name}'

class Stock(models.Model):
    symbol = models.CharField(max_length=10)
    name = models.CharField(max_length=100)
    price = models.FloatField()
    date = models.DateTimeField(auto_now_add=True)

class Currency(models.Model):
    code = models.CharField(max_length=10)
    name = models.CharField(max_length=100)
    exchange_rate = models.FloatField()
    date = models.DateTimeField(auto_now_add=True)

class Bond(models.Model):
    identifier = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    yield_rate = models.FloatField()
    date = models.DateTimeField(auto_now_add=True)

class Commodity(models.Model):
    name = models.CharField(max_length=100)
    price = models.FloatField()
    date = models.DateTimeField(auto_now_add=True)
