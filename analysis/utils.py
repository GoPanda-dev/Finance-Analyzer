import requests
import json
from django.shortcuts import render
from datetime import datetime, timedelta

API_KEY = 'your_alphavantage_api_key'
CACHE_DURATION = timedelta(minutes=15)
cache = {}

def fetch_stock_data(symbol, interval):
    api_key = 'YOUR_API_KEY'
    base_url = 'https://www.alphavantage.co/query?'
    
    function = 'TIME_SERIES_INTRADAY' if 'min' in interval else 'TIME_SERIES_' + interval.upper()
    
    url = f"{base_url}function={function}&symbol={symbol}&interval={interval}&apikey={api_key}"
    response = requests.get(url)
    
    if response.status_code == 200:
        json_response = response.json()
        if 'Information' in json_response:
            return {'Information': json_response['Information']}
        return json_response
    else:
        return None


def fetch_fundamental_data(symbol):
    api_key = 'YOUR_API_KEY'
    base_url = 'https://www.alphavantage.co/query?function='

    functions = {
        'OVERVIEW': 'OVERVIEW',
        'INCOME_STATEMENT': 'INCOME_STATEMENT',
        'BALANCE_SHEET': 'BALANCE_SHEET',
        'CASH_FLOW': 'CASH_FLOW',
        'EARNINGS': 'EARNINGS',
    }

    data = {}
    for key, function in functions.items():
        url = f"{base_url}{function}&symbol={symbol}&apikey={api_key}"
        response = requests.get(url)
        if response.status_code == 200:
            json_response = response.json()
            if 'Information' in json_response:
                return {'Information': json_response['Information']}
            data[key] = json_response
        else:
            data[key] = None

    return data

def stock_detail_view(request, symbol):
    interval = request.GET.get('interval', 'daily')
    fundamental_data = fetch_fundamental_data(symbol)

    context = {
        'symbol': symbol,
        'interval': interval,
        'fundamental_data': fundamental_data,
    }
    return render(request, 'analysis/stocks.html', context)

def cache_stock_data(symbol, interval, data):
    key = f'{symbol}_{interval}'
    cache[key] = {
        'data': data,
        'timestamp': datetime.now()
    }

def get_cached_stock_data(symbol, interval):
    key = f'{symbol}_{interval}'
    cached = cache.get(key)
    if cached:
        if datetime.now() - cached['timestamp'] < CACHE_DURATION:
            return cached['data'], True
    return None, False
