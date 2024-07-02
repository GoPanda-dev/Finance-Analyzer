#!/bin/bash

# Navigate to the deployment directory
cd /home/site/wwwroot

# Ensure the virtual environment is using the correct environment provided by Azure
if [ -d antenv ]; then
  source antenv/bin/activate
elif [ -d venv ]; then
  source venv/bin/activate
else
  python -m venv antenv
  source antenv/bin/activate
fi

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Start the application using gunicorn
gunicorn --workers 3 --bind 0.0.0.0:8000 your_project_name.wsgi:application
