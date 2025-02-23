# Finance Analyzer

Finance Analyzer is a web application that provides detailed stock analysis, including charts and fundamental data. Users can view stock data, add stocks to their watchlist, and analyze financial statements.

## Features

- View stock data with interactive charts
- Add and remove stocks from your watchlist
- View company overview and financial statements
- Toggle rows in financial statement tables

## Technologies Used

- Python
- Django
- JavaScript
- ApexCharts.js
- Alpha Vantage API
- FontAwesome

## Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Virtual environment (optional but recommended)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/GoPanda-Dev/finance-analyzer.git
    cd finance-analyzer
    ```

2. Create a virtual environment (optional but recommended):

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3. Install the required packages:

    ```bash
    pip install -r requirements.txt
    ```

4. Set up environment variables:

    Create a `.env` file in the root directory and add your environment variables. For example:

    ```env
    ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
    ```

5. Apply the migrations:

    ```bash
    python manage.py migrate
    ```

6. Create a superuser:

    ```bash
    python manage.py createsuperuser
    ```

7. Run the development server:

    ```bash
    python manage.py runserver
    ```

8. Open your browser and navigate to `http://127.0.0.1:8000` to view the application.

### Usage

1. **Login or Sign Up**: If you don't have an account, sign up for a new one. If you already have an account, log in.
2. **Search for Stocks**: Use the search bar in the navigation to find stocks by symbol or name.
3. **View Stock Data**: Click on a stock from the search results to view detailed stock data, charts, and financial statements.
4. **Add to Watchlist**: Use the "Add to Watchlist" button to add stocks to your personal watchlist.
5. **Toggle Data**: Use the toggle controls to view annual or quarterly data for financial statements. Use row toggles to show or hide specific rows.

### Project Structure

- `analysis/`: Contains the main Django app for the project.
- `static/`: Contains static files like JavaScript and CSS.
- `templates/`: Contains HTML templates for rendering the web pages.
- `manage.py`: Django's command-line utility for administrative tasks.
- `requirements.txt`: Lists the Python dependencies for the project.

### API Integration

This project uses the Alpha Vantage API to fetch stock data. You need to sign up at [Alpha Vantage](https://www.alphavantage.co/support/#api-key) to get an API key.

### Contributing

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with descriptive messages.
4. Push your changes to your forked repository.
5. Create a pull request to the main repository.

### License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

### Acknowledgements

- [Alpha Vantage](https://www.alphavantage.co/) for providing stock data.
- [Chart.js](https://www.chartjs.org/) for the charting library.

