from django.shortcuts import render, redirect
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
    time_series, cached = get_cached_stock_data(symbol, interval)
    if not time_series:
        raw_data = fetch_stock_data(symbol, interval)
        time_series = raw_data.get('Time Series (1min)', {})
        if not time_series:
            return render(request, 'analysis/error.html', {'message': 'Failed to fetch data. Please try again later.'})
        cache_stock_data(symbol, interval, time_series)
    
    fundamental_data = fetch_fundamental_data(symbol)
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