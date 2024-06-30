from django.shortcuts import render, redirect
from django.core.cache import cache
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from django.contrib.auth import views as auth_views
from django.utils.safestring import mark_safe
from .models import WatchlistItem, Stock
from .forms import WatchlistItemForm, RemoveWatchlistItemForm
from django.http import JsonResponse
from django.urls import reverse
from django.template.loader import render_to_string
from .utils import fetch_stock_data, fetch_fundamental_data, cache_stock_data, get_cached_stock_data, fetch_all_assets
import json
import requests
import logging

logger = logging.getLogger(__name__)

ALPHA_VANTAGE_API_KEY = 'your_alphavantage_api_key'  # Replace with your Alpha Vantage API key
ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query'

def get_news_data(ticker):
    api_key = 'YOUR_API_KEY'
    url = f"https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={ticker}&apikey={api_key}"
    print(f"Fetching news data from: {url}")  # Debugging statement
    response = requests.get(url)
    print(f"Response status code: {response.status_code}")  # Debugging statement
    if response.status_code == 200:
        data = response.json()
        print(f"News data for {ticker}: {data}")  # Debugging statement
        return data.get('feed', [])
    return []

def aggregate_news_data(tickers):
    aggregated_news = []
    for ticker in tickers:
        news_data = get_news_data(ticker)
        aggregated_news.extend(news_data)
    return aggregated_news

def get_top_gainers():
    api_key = 'YOUR_API_KEY'
    url = f"https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey={api_key}"
    print(f"Fetching top gainers from: {url}")  # Debugging statement
    response = requests.get(url)
    print(f"Response status code: {response.status_code}")  # Debugging statement
    if response.status_code == 200:
        data = response.json()
        print(f"Top gainers data: {data}")  # Debugging statement
        return data.get('top_gainers', [])
    return []

@login_required(login_url='login')
def homepage(request):
    watchlist_items = WatchlistItem.objects.filter(user=request.user)
    watchlist_tickers = [item.symbol for item in watchlist_items]

    if watchlist_tickers:
        news_data = aggregate_news_data(watchlist_tickers)
        print(f"Aggregating news data for watchlist tickers: {watchlist_tickers}")
    else:
        top_gainers = get_top_gainers()
        top_gainer_tickers = [gainer['ticker'] for gainer in top_gainers]
        news_data = aggregate_news_data(top_gainer_tickers)
        print(f"Watchlist is empty. Aggregating news data for top gainers: {top_gainer_tickers}")


    print(f"Watchlist tickers: {watchlist_tickers}")  # Debugging statement
    print(f"News data: {news_data}")  # Debugging statement

    if request.method == 'POST':
        form = WatchlistItemForm(request.POST)
        if form.is_valid():
            watchlist_item = form.save(commit=False)
            watchlist_item.user = request.user
            watchlist_item.save()
    else:
        form = WatchlistItemForm()

    context = {
        'watchlist_items': watchlist_items,
        'watchlist_item_form': form,
        'news_data': news_data
    }
    return render(request, 'analysis/homepage.html', context)

def public_homepage(request):
    top_gainers = get_top_gainers()
    top_gainer_tickers = [gainer['ticker'] for gainer in top_gainers]
    news_data = aggregate_news_data(top_gainer_tickers)

    print(f"Top gainer tickers: {top_gainer_tickers}")  # Debugging statement
    print(f"News data: {news_data}")  # Debugging statement

    context = {
        'news_data': news_data
    }
    return render(request, 'analysis/public_homepage.html', context)

def ajax_search(request):
    query = request.GET.get('query', '')
    results = []

    if query:
        params = {
            'function': 'SYMBOL_SEARCH',
            'keywords': query,
            'apikey': ALPHA_VANTAGE_API_KEY
        }
        response = requests.get(ALPHA_VANTAGE_URL, params=params)
        if response.status_code == 200:
            data = response.json()
            if 'bestMatches' in data:
                results = [
                    {
                        'symbol': match['1. symbol'],
                        'name': match['2. name']
                    }
                    for match in data['bestMatches']
                ]
    
    logger.debug(f"Search query: {query}")
    logger.debug(f"Search results: {results}")

    html = render_to_string('analysis/search_results.html', {'results': results})
    return JsonResponse({'html': html})


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

def search_view(request):
    query = request.GET.get('query')
    if query:
        return redirect('stock_view', symbol=query)
    return render(request, 'analysis/error.html', {'message': 'No query provided.'})

def fetch_news_data(symbol):
    api_key = 'YOUR_API_KEY'
    url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={symbol}&apikey={api_key}'
    response = requests.get(url)
    if response.status_code == 200:
        return response.json().get('feed', [])
    return []

def stock_view(request, symbol):
    interval = request.GET.get('interval', 'daily')
    
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
            # Determine the correct key for time series data
            if interval == '1min':
                time_series = raw_data.get('Time Series (1min)', {})
            elif interval == '5min':
                time_series = raw_data.get('Time Series (5min)', {})
            elif interval == '15min':
                time_series = raw_data.get('Time Series (15min)', {})
            elif interval == '30min':
                time_series = raw_data.get('Time Series (30min)', {})
            elif interval == '60min':
                time_series = raw_data.get('Time Series (60min)', {})
            elif interval == 'daily':
                time_series = raw_data.get('Time Series (Daily)', {})
            elif interval == 'weekly':
                time_series = raw_data.get('Weekly Time Series', {})
            elif interval == 'monthly':
                time_series = raw_data.get('Monthly Time Series', {})
            else:
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

        news_data = fetch_news_data(symbol)

        in_watchlist = False
        stock_name = fundamental_data.get('OVERVIEW', {}).get('Name', 'Unknown')
        
        # Extract analyst ratings
        overview_data = fundamental_data.get('OVERVIEW', {})
        analyst_ratings = {
            'strong_buy': int(overview_data.get('AnalystRatingStrongBuy', 0)),
            'buy': int(overview_data.get('AnalystRatingBuy', 0)),
            'hold': int(overview_data.get('AnalystRatingHold', 0)),
            'sell': int(overview_data.get('AnalystRatingSell', 0)),
            'strong_sell': int(overview_data.get('AnalystRatingStrongSell', 0)),
        }

        if request.user.is_authenticated:
            in_watchlist = WatchlistItem.objects.filter(user=request.user, symbol=symbol).exists()

    except Exception as e:
        return render(request, 'analysis/error.html', {'message': f'An error occurred. Please try again later. {e}'})

    context = {
        'symbol': symbol,
        'interval': interval,
        'time_series': json.dumps(time_series),
        'fundamental_data': json.dumps(fundamental_data),
        'fundamental_overview_data': fundamental_data,  # Pass the fundamental data directly
        'news_data': news_data,
        'cached': cached,
        'in_watchlist': in_watchlist,
        'stock_name': stock_name,
        'analyst_ratings': analyst_ratings,  # Pass the analyst ratings to the template
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
