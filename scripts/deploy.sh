#!/bin/bash

# Navigate to the deployment directory
cd /home/site/wwwroot

# Set up virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Start the application using Gunicorn
gunicorn --workers 3 finance_analyzer.wsgi:application --bind 0.0.0.0:8000
