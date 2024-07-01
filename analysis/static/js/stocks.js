document.addEventListener("DOMContentLoaded", function() {
    var chart;
    var earningsChart;
    var chartType = 'line'; // Default chart type
    var selectedInterval = new URLSearchParams(window.location.search).get('interval') || 'daily';

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

    try {
        var timeSeriesData = JSON.parse(decodedTimeSeriesDataContent);
        var fundamentalData = JSON.parse(decodedFundamentalDataContent);
    } catch (e) {
        console.error('Error parsing JSON data:', e);
        return; // Exit if JSON parsing fails
    }

    function createChart(data, type = 'line') {
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
                        customIcons: [
                            {
                                icon: `<select id="interval-selector" style="margin-left: 5px; margin-right: 15px; font-size: 12px;">
                                        <option value="1min" ${selectedInterval === '1min' ? 'selected' : ''}>1min</option>
                                        <option value="5min" ${selectedInterval === '5min' ? 'selected' : ''}>5min</option>
                                        <option value="15min" ${selectedInterval === '15min' ? 'selected' : ''}>15min</option>
                                        <option value="30min" ${selectedInterval === '30min' ? 'selected' : ''}>30min</option>
                                        <option value="60min" ${selectedInterval === '60min' ? 'selected' : ''}>60min</option>
                                        <option value="daily" ${selectedInterval === 'daily' ? 'selected' : ''}>Daily</option>
                                        <option value="weekly" ${selectedInterval === 'weekly' ? 'selected' : ''}>Weekly</option>
                                        <option value="monthly" ${selectedInterval === 'monthly' ? 'selected' : ''}>Monthly</option>
                                      </select>`,
                                index: -1,
                                title: 'Change Interval',
                                class: 'custom-interval-selector',
                            },
                            {
                                icon: '<i class="fa-solid fa-chart-line"></i>',
                                index: -1,
                                title: 'Toggle Line/Candlestick',
                                class: 'custom-icon',
                                click: function(chart, options, e) {
                                    chartType = chartType === 'candlestick' ? 'line' : 'candlestick';
                                    createChart(data, chartType);
                                }
                            },
                        ]
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

        document.getElementById('interval-selector').addEventListener('change', function() {
            var selectedInterval = this.value;
            window.location.href = `?interval=${selectedInterval}`;
        });
    }

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

    function formatLargeNumber(value) {
        if (value >= 1e12) {
            return (value / 1e12).toFixed(2) + ' T';
        } else if (value >= 1e9) {
            return (value / 1e9).toFixed(2) + ' B';
        } else if (value >= 1e6) {
            return (value / 1e6).toFixed(2) + ' M';
        } else {
            return value.toFixed(2);
        }
    }

    function createGridFromFlatJSON(json, containerId) {
        if (json.Information) {
            return `<div>${json.Information}</div>`;
        }
        const columns = ['Key', 'Value'];
        const data = Object.keys(json).map(key => [formatKeyName(key), json[key]]);
        
        new gridjs.Grid({
            columns: columns,
            data: data,
            sort: true,
            search: true
        }).render(document.getElementById(containerId));
    }

    var grids = {}; // To keep track of grid instances

    function createGridFromNestedJSON(json, nestedKey, containerId) {
        console.log('Creating grid for:', containerId, 'with type:', nestedKey);
        if (json.Information) {
            document.getElementById(containerId).innerHTML = `<div>${json.Information}</div>`;
            return;
        }
        if (!json[nestedKey] || json[nestedKey].length === 0) {
            document.getElementById(containerId).innerHTML = `<div>No data available</div>`;
            return;
        }
        let data = json[nestedKey];
        data.sort((a, b) => new Date(b.fiscalDateEnding) - new Date(a.fiscalDateEnding));

        const columns = ['Key', ...data.map(item => item.fiscalDateEnding)];
        const keys = Object.keys(data[0]);
        const gridData = keys.map(key => {
            return [formatKeyName(key), ...data.map(item => {
                let value = item[key];
                if (value && !isNaN(value) && key !== "fiscalDateEnding" && key !== "reportedDate" && !key.includes("EPS")) {
                    value = formatLargeNumber(parseFloat(value));
                }
                return value;
            })];
        });

        // Clear the container before rendering new grid
        document.getElementById(containerId).innerHTML = '';

        // Destroy existing grid if any
        if (grids[containerId]) {
            grids[containerId].destroy();
        }

        // Create and render the new grid
        grids[containerId] = new gridjs.Grid({
            columns: columns,
            data: gridData,
            sort: true,
            search: true,
            pagination: {
                enabled: true,
                limit: 10
            },
            style: {
                table: {
                    'width': '100%',
                    'border-collapse': 'collapse'
                },
                th: {
                    'background-color': '#f1f1f1',
                    'padding': '10px',
                    'border': '1px solid #ddd'
                },
                td: {
                    'white-space': 'nowrap',
                    'text-overflow': 'ellipsis',
                    'overflow': 'hidden',
                    'max-width': '150px',
                    'padding': '10px',
                    'border': '1px solid #ddd'
                }
            }
        }).render(document.getElementById(containerId));
    }

    function toggleDataType() {
        const selectedType = document.getElementById('toggle-data').value;
        console.log('Selected Type:', selectedType);

        const incomeStatementGrid = document.getElementById('income-statement-grid');
        const balanceSheetGrid = document.getElementById('balance-sheet-grid');
        const cashFlowGrid = document.getElementById('cash-flow-grid');

        if (incomeStatementGrid) {
            createGridFromNestedJSON(fundamentalData.INCOME_STATEMENT, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports', 'income-statement-grid');
        }

        if (balanceSheetGrid) {
            createGridFromNestedJSON(fundamentalData.BALANCE_SHEET, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports', 'balance-sheet-grid');
        }

        if (cashFlowGrid) {
            createGridFromNestedJSON(fundamentalData.CASH_FLOW, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports', 'cash-flow-grid');
        }

        if (fundamentalData.EARNINGS) {
            const earningsData = fundamentalData.EARNINGS[selectedType === 'annual' ? 'annualEarnings' : 'quarterlyEarnings'].map(item => ({
                x: item.fiscalDateEnding,
                y: parseFloat(item.reportedEPS)
            })).sort((a, b) => new Date(a.x) - new Date(b.x));

            createEarningsChart(earningsData);
        }
    }

    const companyOverviewGrid = document.getElementById('company-overview-grid');
    if (companyOverviewGrid) {
        createGridFromFlatJSON(fundamentalData.OVERVIEW, 'company-overview-grid');
    }

    const toggleDataElement = document.getElementById('toggle-data');
    if (toggleDataElement) {
        toggleDataElement.addEventListener('change', toggleDataType);
    }

    toggleDataType();

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
            plotOptions: {
                bar: {
                    borderRadius: 10,
                    dataLabels: {
                        position: 'top', // top, center, bottom
                    },
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function (val) {
                    return val.toFixed(2); // Adjusted to show earnings data
                },
                offsetY: -20,
                style: {
                    fontSize: '12px',
                    colors: ["#304758"]
                }
            },
            xaxis: {
                categories: data.map(item => item.x),
                type: 'datetime',
                position: 'top',
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                },
                crosshairs: {
                    fill: {
                        type: 'gradient',
                        gradient: {
                            colorFrom: '#D8E3F0',
                            colorTo: '#BED1E6',
                            stops: [0, 100],
                            opacityFrom: 0.4,
                            opacityTo: 0.5,
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                }
            },
            yaxis: {
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false,
                },
                labels: {
                    show: false,
                    formatter: function (val) {
                        return val.toFixed(2); // Adjusted to show earnings data
                    }
                }
            },
            title: {
                text: 'Earnings',
                floating: true,
                offsetY: 330,
                align: 'center',
                style: {
                    color: '#444'
                }
            }
        });
        earningsChart.render();
    }

    const earningsData = fundamentalData.EARNINGS.annualEarnings.map(item => ({
        x: item.fiscalDateEnding,
        y: parseFloat(item.reportedEPS)
    })).sort((a, b) => new Date(a.x) - new Date(b.x));

    createEarningsChart(earningsData);

    const marketCapElement = document.getElementById('market-cap');
    if (marketCapElement) {
        const rawValue = parseFloat(marketCapElement.textContent.trim());
        if (!isNaN(rawValue)) {
            marketCapElement.textContent = formatLargeNumber(rawValue);
        } else {
            marketCapElement.textContent = "N/A";
        }
    }
});