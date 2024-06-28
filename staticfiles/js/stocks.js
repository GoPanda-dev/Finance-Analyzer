document.addEventListener("DOMContentLoaded", function() {
    // Function to format numbers in millions
    function formatInMillions(value) {
        let num = parseFloat(value);
        return isNaN(num) ? value : (num / 1000000).toFixed(2) + 'M';
    }

    // Function to create a table from flat JSON data
    function createTableFromFlatJSON(json) {
        if (json.Information) {
            return `<tr><td colspan="2">${json.Information}</td></tr>`;
        }
        let table = "<tr><th>Key</th><th>Value</th></tr>";
        for (let key in json) {
            table += `<tr><td>${formatKeyName(key)}</td><td>${json[key]}</td></tr>`;
        }
        return table;
    }

    // Function to create a table from nested JSON data
    function createTableFromNestedJSON(json, nestedKey) {
        if (json.Information) {
            return `<tr><td colspan="2">${json.Information}</td></tr>`;
        }
        if (!json[nestedKey] || json[nestedKey].length === 0) {
            return `<tr><td colspan="2">No data available</td></tr>`;
        }
        let data = json[nestedKey];
        data.sort((a, b) => new Date(b.fiscalDateEnding) - new Date(a.fiscalDateEnding));
        let table = "<tr>";
        for (let key in data[0]) {
            table += `<th>${formatKeyName(key)}</th>`;
        }
        table += "</tr>";
        for (let item of data) {
            table += "<tr>";
            for (let key in item) {
                table += `<td>${formatInMillions(item[key])}</td>`;
            }
            table += "</tr>";
        }
        return table;
    }

    // Function to toggle data type
    function toggleDataType() {
        const selectedType = document.getElementById('toggle-data').value;
        document.getElementById('table-income-statement').innerHTML = createTableFromNestedJSON(fundamentalData.INCOME_STATEMENT, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports');
        document.getElementById('table-balance-sheet').innerHTML = createTableFromNestedJSON(fundamentalData.BALANCE_SHEET, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports');
        document.getElementById('table-cash-flow').innerHTML = createTableFromNestedJSON(fundamentalData.CASH_FLOW, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports');
        document.getElementById('table-earnings').innerHTML = createTableFromNestedJSON(fundamentalData.EARNINGS, selectedType === 'annual' ? 'annualEarnings' : 'quarterlyEarnings');
    }

    // Ensure the JSON data is correctly formatted and not empty
    console.log(fundamentalData);

    // Set the content of each section with formatted JSON
    document.getElementById('table-company-overview').innerHTML = createTableFromFlatJSON(fundamentalData.OVERVIEW);
    toggleDataType(); // Initial toggle to set the default data type

    // Add event listener to the toggle
    document.getElementById('toggle-data').addEventListener('change', toggleDataType);

    // Toggle accordion content visibility
    var buttons = document.querySelectorAll('.accordion button');

    buttons.forEach(function(button) {
        button.addEventListener('click', function() {
            var expanded = button.getAttribute('aria-expanded') === 'true';
            // Close all accordion items
            buttons.forEach(function(btn) {
                btn.setAttribute('aria-expanded', 'false');
                document.getElementById(btn.getAttribute('aria-controls')).style.display = 'none';
            });
            // Open the clicked item if it was closed
            if (!expanded) {
                button.setAttribute('aria-expanded', 'true');
                document.getElementById(button.getAttribute('aria-controls')).style.display = 'block';
            }
        });
    });

    // Initialize the chart
    var dates = Object.keys(timeSeriesData).sort((a, b) => new Date(a) - new Date(b)); // Ensure dates are sorted
    var closeData = [];

    dates.forEach(function(date) {
        closeData.push({
            x: new Date(date),
            y: parseFloat(timeSeriesData[date]['4. close'])
        });
    });

    var ctx = document.getElementById('chart').getContext('2d');
    var chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: symbol,
                data: closeData,
                borderColor: 'rgba(0, 0, 255, 1)',
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                borderWidth: 1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'yyyy-MM-dd'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price'
                    },
                    ticks: {
                        beginAtZero: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var y = context.raw.y;
                            return `Close: ${y}`;
                        }
                    }
                }
            }
        }
    });
});

// Format key names to be more user-friendly
function formatKeyName(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}
