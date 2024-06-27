from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from .views import unified_search_view

urlpatterns = [
    path('', views.homepage_view, name='homepage'),
    path('add_to_watchlist/', views.add_to_watchlist, name='add_to_watchlist'),
    path('add_to_watchlist_from_stock/', views.add_to_watchlist_from_stock, name='add_to_watchlist_from_stock'),
    path('remove_from_watchlist_from_stock/', views.remove_from_watchlist_from_stock, name='remove_from_watchlist_from_stock'),
    path('remove_from_watchlist/', views.remove_from_watchlist, name='remove_from_watchlist'),
    path('stocks/<str:symbol>/', views.stock_view, name='stock_view'),
    path('search/', unified_search_view, name='unified_search_view'),
    path('keyword_search/', views.keyword_search_view, name='keyword_search_view'),
    path('signup/', views.signup_view, name='signup'),
    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='homepage'), name='logout'),
    path('placeholder/', views.placeholder_view, name='placeholder'),
    path('error/', views.error_view, name='error'),
    path('ajax/search/', views.ajax_search, name='ajax_search'),
]
