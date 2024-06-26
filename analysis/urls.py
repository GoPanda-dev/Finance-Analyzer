from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.homepage_view, name='homepage'),
    path('stocks/<str:symbol>/', views.stock_view, name='stock_view'),
    path('search/', views.search_view, name='search_view'),
    path('signup/', views.signup_view, name='signup'),
    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='homepage'), name='logout'),
    path('placeholder/', views.placeholder_view, name='placeholder'),
    path('error/', views.error_view, name='error'),
]
