from django.shortcuts import render, redirect
from django.core.cache import cache
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.contrib.auth import views as auth_views
from .utils import fetch_stock_data, fetch_fundamental_data, cache_stock_data, get_cached_stock_data

def homepage_view(request):
    return render(request, 'analysis/homepage.html')

def search_view(request):
    query = request.GET.get('query')
    if query:
        return redirect('stock_view', symbol=query)
    return render(request, 'analysis/error.html', {'message': 'No query provided.'})

def stock_view(request, symbol):
    interval = request.GET.get('interval', '1min')
    
    # Cache keys
    stock_cache_key = f'{symbol}_{interval}_stock_data'
    fundamental_cache_key = f'{symbol}_fundamental_data'
    
    # Try to get stock data from cache
    time_series = cache.get(stock_cache_key)
    cached = True
    if not time_series:
        raw_data = fetch_stock_data(symbol, interval)
        time_series = raw_data.get(f'Time Series ({interval})', {})
        if not time_series:
            return render(request, 'analysis/error.html', {'message': 'Failed to fetch data. Please try again later.'})
        cache_stock_data(symbol, interval, time_series)
        cache.set(stock_cache_key, time_series, 60 * 60)  # Cache for 1 hour
        cached = False
    
    # Try to get fundamental data from cache
    fundamental_data = cache.get(fundamental_cache_key)
    if not fundamental_data:
        fundamental_data = fetch_fundamental_data(symbol)
        cache.set(fundamental_cache_key, fundamental_data, 60 * 60 * 24)  # Cache for 24 hours
    
    print(f"Fundamental Data: {fundamental_data}")  # Print the fundamental data for debugging
    
    context = {
        'symbol': symbol,
        'interval': interval,
        'time_series': time_series,
        'fundamental_data': fundamental_data,
        'cached': cached,
    }
    return render(request, 'analysis/stocks.html', context)

def signup_view(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('homepage')
    else:
        form = UserCreationForm()
    return render(request, 'registration/signup.html', {'form': form})

def placeholder_view(request):
    return render(request, 'analysis/placeholder.html')

def error_view(request):
    return render(request, 'analysis/error.html', {'message': 'This is an error message.'})
