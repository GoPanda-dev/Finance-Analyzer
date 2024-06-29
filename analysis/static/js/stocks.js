document.addEventListener("DOMContentLoaded", function() {
    var chart;
    var earningsChart;
    var chartType = 'line'; // Default chart type

    // Get the data from the script tags
    var symbol = document.querySelector('.content-wrapper').getAttribute('data-symbol');
    var timeSeriesDataContent = document.getElementById('time_series_data').textContent;
    var fundamentalDataContent = document.getElementById('fundamental_data').textContent;

    // Function to decode unicode escape sequences
    function decodeUnicodeEscape(str) {
        return str.replace(/\\u([\d\w]{4})/gi, function(match, grp) {
            return String.fromCharCode(parseInt(grp, 16));
        }).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
    }

    // Decode the raw JSON data
    var decodedTimeSeriesDataContent = decodeUnicodeEscape(timeSeriesDataContent);
    var decodedFundamentalDataContent = decodeUnicodeEscape(fundamentalDataContent);

    // Print the raw JSON data to the console for debugging
    console.log('Decoded Time Series Data:', decodedTimeSeriesDataContent);
    console.log('Decoded Fundamental Data:', decodedFundamentalDataContent);

    try {
        var timeSeriesData = JSON.parse(decodedTimeSeriesDataContent);
        var fundamentalData = JSON.parse(decodedFundamentalDataContent);
    } catch (e) {
        console.error('Error parsing JSON data:', e);
        return; // Exit if JSON parsing fails
    }

    // Print the parsed JSON data to the console for debugging
    console.log('Parsed Time Series Data:', timeSeriesData);
    console.log('Parsed Fundamental Data:', fundamentalData);

    function createChart(data, type = 'line') {
        console.log('Chart Data:', data); // Log the chart data to ensure it is correctly formatted
        if (chart) {
            chart.destroy();
        }

        var options = {
            series: [{
                name: symbol,
                data: type === 'candlestick' ? data.map(item => ({
                    x: item.x,
                    y: [item.open, item.high, item.low, item.close]
                })) : data
            }],
            chart: {
                type: type,
                height: 400,
                toolbar: {
                    show: true,
                    tools: {
                        customIcons: [{
                            icon: '<i class="fa-solid fa-chart-line"></i>',
                            index: -1,
                            title: 'Toggle Line/Candlestick',
                            class: 'custom-icon',
                            click: function(chart, options, e) {
                                chartType = chartType === 'candlestick' ? 'line' : 'candlestick';
                                createChart(data, chartType);
                            }
                        }]
                    }
                }
            },
            xaxis: {
                type: 'datetime',
                categories: data.map(item => item.x),
                title: {
                    text: 'Date'
                }
            },
            yaxis: {
                title: {
                    text: 'Price'
                }
            },
            plotOptions: {
                candlestick: {
                    wick: {
                        useFillColor: true
                    }
                }
            }
        };

        if (type === 'line') {
            options.series[0].data = data.map(item => ({ x: item.x, y: item.close }));
        }

        chart = new ApexCharts(document.querySelector("#chart"), options);
        chart.render();
    }

    // Create the chart with the initial data
    var dates = Object.keys(timeSeriesData).sort((a, b) => new Date(a) - new Date(b));
    var formattedData = dates.map(date => ({
        x: new Date(date),
        open: parseFloat(timeSeriesData[date]['1. open']),
        high: parseFloat(timeSeriesData[date]['2. high']),
        low: parseFloat(timeSeriesData[date]['3. low']),
        close: parseFloat(timeSeriesData[date]['4. close'])
    }));

    createChart(formattedData, chartType);

    function formatKeyName(key) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str) { return str.toUpperCase(); });
    }

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

    function createTableFromNestedJSON(json, nestedKey) {
        if (json.Information) {
            return `<tr><td colspan="2">${json.Information}</td></tr>`;
        }
        if (!json[nestedKey] || json[nestedKey].length === 0) {
            return `<tr><td colspan="2">No data available</td></tr>`;
        }
        let data = json[nestedKey];
        data.sort((a, b) => new Date(b.fiscalDateEnding) - new Date(a.fiscalDateEnding));

        let table = "<tr><th>Key</th>";
        data.forEach(item => {
            table += `<th>${item.fiscalDateEnding}</th>`;
        });
        table += "</tr>";

        const keys = Object.keys(data[0]);
        keys.forEach(key => {
            table += `<tr><td>${formatKeyName(key)}</td>`;
            data.forEach(item => {
                let value = item[key];
                if (value && !isNaN(value) && key !== "fiscalDateEnding" && key !== "reportedDate" && !key.includes("EPS")) {
                    value = parseFloat(value).toFixed(2);
                }
                table += `<td>${value}</td>`;
            });
            table += "</tr>";
        });

        return table;
    }

    function toggleDataType() {
        const selectedType = document.getElementById('toggle-data').value;

        const incomeStatementTable = document.getElementById('table-income-statement');
        const balanceSheetTable = document.getElementById('table-balance-sheet');
        const cashFlowTable = document.getElementById('table-cash-flow');

        if (incomeStatementTable) {
            incomeStatementTable.innerHTML = createTableFromNestedJSON(fundamentalData.INCOME_STATEMENT, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports');
            createRowToggles('table-income-statement', 'income-statement-toggles');
        }

        if (balanceSheetTable) {
            balanceSheetTable.innerHTML = createTableFromNestedJSON(fundamentalData.BALANCE_SHEET, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports');
            createRowToggles('table-balance-sheet', 'balance-sheet-toggles');
        }

        if (cashFlowTable) {
            cashFlowTable.innerHTML = createTableFromNestedJSON(fundamentalData.CASH_FLOW, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports');
            createRowToggles('table-cash-flow', 'cash-flow-toggles');
        }

        if (fundamentalData.EARNINGS) {
            const earningsData = fundamentalData.EARNINGS[selectedType === 'annual' ? 'annualEarnings' : 'quarterlyEarnings'].map(item => ({
                x: item.fiscalDateEnding,
                y: parseFloat(item.reportedEPS)
            })).sort((a, b) => new Date(a.x) - new Date(b.x));

            createEarningsChart(earningsData);
        }
    }

    function createRowToggles(tableId, toggleContainerId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const toggleContainer = document.getElementById(toggleContainerId);
        toggleContainer.innerHTML = ''; // Clear any existing toggles

        const rows = table.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index === 0) return; // Skip the header row
            const keyCell = row.querySelector('td:first-child');
            if (!keyCell) return;

            const uniqueId = `${tableId}-toggle-${index}-${Math.random().toString(36).substr(2, 9)}`;
            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = true;
            toggle.id = uniqueId;
            toggle.addEventListener('change', () => {
                row.style.display = toggle.checked ? '' : 'none';
            });

            const label = document.createElement('label');
            label.htmlFor = uniqueId;
            label.innerText = keyCell.innerText;

            const div = document.createElement('div');
            div.className = 'toggle';
            div.appendChild(toggle);
            div.appendChild(label);

            toggleContainer.appendChild(div);
        });
    }

    const companyOverviewTable = document.getElementById('table-company-overview');
    if (companyOverviewTable) {
        companyOverviewTable.innerHTML = createTableFromFlatJSON(fundamentalData.OVERVIEW);
    }

    toggleDataType();

    const toggleDataElement = document.getElementById('toggle-data');
    if (toggleDataElement) {
        toggleDataElement.addEventListener('change', toggleDataType);
    }

    var buttons = document.querySelectorAll('.accordion button');

    buttons.forEach(function(button) {
        button.addEventListener('click', function() {
            var expanded = button.getAttribute('aria-expanded') === 'true';
            buttons.forEach(function(btn) {
                btn.setAttribute('aria-expanded', 'false');
                const content = document.getElementById(btn.getAttribute('aria-controls'));
                if (content) {
                    content.style.display = 'none';
                }
            });
            if (!expanded) {
                button.setAttribute('aria-expanded', 'true');
                const content = document.getElementById(button.getAttribute('aria-controls'));
                if (content) {
                    content.style.display = 'block';
                }
            }
        });
    });

    function createEarningsChart(data) {
        console.log('Earnings Chart Data:', data); // Log the earnings chart data to ensure it is correctly formatted
        if (earningsChart) {
            earningsChart.destroy();
        }
        earningsChart = new ApexCharts(document.querySelector("#earnings-chart"), {
            series: [{
                name: 'Earnings',
                data: data
            }],
            chart: {
                type: 'bar',
                height: 400
            },
            xaxis: {
                type: 'datetime',
                categories: data.map(item => item.x),
                title: {
                    text: 'Fiscal Date'
                }
            },
            yaxis: {
                title: {
                    text: 'Earnings'
                }
            }
        });
        earningsChart.render();
    }

    // Create the earnings chart with the initial data
    const earningsData = fundamentalData.EARNINGS.annualEarnings.map(item => ({
        x: item.fiscalDateEnding,
        y: parseFloat(item.reportedEPS)
    })).sort((a, b) => new Date(a.x) - new Date(b.x));

    createEarningsChart(earningsData);
});
