from django.shortcuts import render, redirect
from django.core.cache import cache
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from django.contrib.auth import views as auth_views
from django.utils.safestring import mark_safe
from .models import WatchlistItem
from .forms import WatchlistItemForm, RemoveWatchlistItemForm
from django.http import JsonResponse
from django.urls import reverse
from .utils import fetch_stock_data, fetch_fundamental_data, cache_stock_data, get_cached_stock_data, fetch_all_assets
import json
import logging

logger = logging.getLogger(__name__)

def get_fundamental_data(request, symbol):
    fundamental_data = cache.get(f'{symbol}_fundamental_data')
    if not fundamental_data:
        fundamental_data = fetch_fundamental_data(symbol)
        cache.set(f'{symbol}_fundamental_data', fundamental_data, 60 * 60 * 24)
    return JsonResponse(fundamental_data)

def unified_search_view(request):
    query = request.GET.get('query')
    if query:
        # Check if the query is a valid stock symbol
        assets = fetch_all_assets(query)
        # If a matching asset is found, assume it's a stock symbol
        if any(asset['1. symbol'].lower() == query.lower() for asset in assets):
            return redirect('stock_view', symbol=query)
        else:
            # If no exact symbol match, perform a keyword search
            return redirect(f"{reverse('keyword_search_view')}?query={query}")
    return render(request, 'analysis/error.html', {'message': 'No query provided.'})

def keyword_search_view(request):
    query = request.GET.get('query')
    assets = []
    if query:
        assets = fetch_all_assets(query)
        if not assets:
            return render(request, 'analysis/error.html', {'message': 'No assets found.'})

    context = {
        'query': query,
        'assets': assets,
    }
    return render(request, 'analysis/search_results.html', context)

@login_required
def add_to_watchlist_from_stock(request):
    if request.method == 'POST':
        symbol = request.POST.get('symbol')
        name = request.POST.get('name')
        logger.debug(f"POST data received: symbol={symbol}, name={name}")
        if symbol and name:
            if not WatchlistItem.objects.filter(user=request.user, symbol=symbol).exists():
                WatchlistItem.objects.create(user=request.user, symbol=symbol, name=name)
                logger.debug(f"Added {symbol} to watchlist for user {request.user}")
            else:
                logger.debug(f"{symbol} already in watchlist for user {request.user}")
        else:
            logger.debug("Symbol or name not provided")
        return redirect('stock_view', symbol=symbol)
    logger.debug("Request method not POST")
    return redirect('homepage')

@login_required
def remove_from_watchlist_from_stock(request):
    if request.method == 'POST':
        symbol = request.POST.get('symbol')
        WatchlistItem.objects.filter(user=request.user, symbol=symbol).delete()
        return redirect('stock_view', symbol=symbol)
    return redirect('homepage')

@login_required
def add_to_watchlist(request):
    if request.method == 'POST':
        form = WatchlistItemForm(request.POST)
        if form.is_valid():
            watchlist_item = form.save(commit=False)
            watchlist_item.user = request.user
            watchlist_item.save()
            return redirect('homepage')
    return redirect('homepage')

@login_required
def remove_from_watchlist(request):
    if request.method == 'POST':
        form = RemoveWatchlistItemForm(request.POST)
        if form.is_valid():
            WatchlistItem.objects.filter(id=form.cleaned_data['item_id'], user=request.user).delete()
            return redirect('homepage')
    return redirect('homepage')

def homepage_view(request):
    watchlist_items = []
    if request.user.is_authenticated:
        watchlist_items = WatchlistItem.objects.filter(user=request.user)
    return render(request, 'analysis/homepage.html', {
        'watchlist_items': watchlist_items,
        'watchlist_item_form': WatchlistItemForm(),
        'remove_watchlist_item_form': RemoveWatchlistItemForm()
    })

def search_view(request):
    query = request.GET.get('query')
    if query:
        return redirect('stock_view', symbol=query)
    return render(request, 'analysis/error.html', {'message': 'No query provided.'})

def stock_view(request, symbol):
    interval = request.GET.get('interval', '1min')
    
    stock_cache_key = f'{symbol}_{interval}_stock_data'
    fundamental_cache_key = f'{symbol}_fundamental_data'
    
    try:
        # Try to get stock data from cache
        time_series = cache.get(stock_cache_key)
        cached = True
        if not time_series:
            raw_data = fetch_stock_data(symbol, interval)
            if raw_data and 'Information' in raw_data:
                return render(request, 'analysis/error.html', {'message': raw_data['Information']})
            if not raw_data:
                return render(request, 'analysis/error.html', {'message': 'Failed to fetch stock data. Please try again later.'})
            time_series = raw_data.get(f'Time Series ({interval})', {})
            if not time_series:
                return render(request, 'analysis/error.html', {'message': 'No time series data available. Please try again later.'})
            cache_stock_data(symbol, interval, time_series)
            cache.set(stock_cache_key, time_series, 60 * 60)  # Cache for 1 hour
            cached = False
        
        # Try to get fundamental data from cache
        fundamental_data = cache.get(fundamental_cache_key)
        if not fundamental_data:
            fundamental_data = fetch_fundamental_data(symbol)
            if fundamental_data and 'Information' in fundamental_data:
                return render(request, 'analysis/error.html', {'message': fundamental_data['Information']})
            if not fundamental_data:
                return render(request, 'analysis/error.html', {'message': 'Failed to fetch fundamental data. Please try again later.'})
            cache.set(fundamental_cache_key, fundamental_data, 60 * 60 * 24)  # Cache for 24 hours

        in_watchlist = False
        stock_name = fundamental_data['OVERVIEW']['Name'] if 'OVERVIEW' in fundamental_data else 'Unknown'

        if request.user.is_authenticated:
            in_watchlist = WatchlistItem.objects.filter(user=request.user, symbol=symbol).exists()

    except Exception as e:
        return render(request, 'analysis/error.html', {'message': f'An error occurred. Please try again later. {e}'})

    context = {
        'symbol': symbol,
        'interval': interval,
        'time_series': json.dumps(time_series),
        'fundamental_data': json.dumps(fundamental_data),
        'cached': cached,
        'in_watchlist': in_watchlist,
        'stock_name': stock_name,
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
