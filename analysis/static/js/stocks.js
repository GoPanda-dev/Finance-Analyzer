document.addEventListener("DOMContentLoaded", function() {
    var ctx = document.getElementById('chart').getContext('2d');
    var chart;

    var earningsCtx = document.getElementById('earnings-chart').getContext('2d');
    var earningsChart;

    // Get the data from the script tags
    var symbol = document.querySelector('.content-wrapper').getAttribute('data-symbol');
    var timeSeriesDataContent = document.getElementById('time_series_data').textContent;
    var fundamentalDataContent = document.getElementById('fundamental_data').textContent;

    // Function to decode unicode escape sequences
    function decodeUnicodeEscape(str) {
        return str.replace(/\\u([\d\w]{4})/gi, function (match, grp) {
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

    function createChart(data) {
        console.log('Chart Data:', data); // Log the chart data to ensure it is correctly formatted
        if (chart) {
            chart.destroy();
        }
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: symbol,
                    data: data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'yyyy-MM-dd'
                        },
                        title: {
                            display: true,
                            text: 'Date',
                            color: '#666',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price',
                            color: '#666',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 12
                            },
                            beginAtZero: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#666',
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 16
                        },
                        bodyFont: {
                            size: 14
                        },
                        callbacks: {
                            label: function(context) {
                                var y = context.raw.y;
                                return `Close: ${y}`;
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                        }
                    }
                }
            }
        });
    }

    // Create the chart with the initial data
    var dates = Object.keys(timeSeriesData).sort((a, b) => new Date(a) - new Date(b));
    var formattedData = dates.map(date => ({
        x: new Date(date),
        y: parseFloat(timeSeriesData[date]['4. close'])
    }));

    createChart(formattedData);

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
        let table = "<tr>";
        for (let key in data[0]) {
            table += `<th>${formatKeyName(key)}</th>`;
        }
        table += "</tr>";
        for (let item of data) {
            table += "<tr>";
            for (let key in item) {
                let value = item[key];
                if (!isNaN(value) && key !== "fiscalDateEnding" && key !== "reportedDate" && !key.includes("EPS")) {
                    value = (value / 1e6).toFixed(2) + ' M';
                }
                table += `<td>${value}</td>`;
            }
            table += "</tr>";
        }
        return table;
    }

    function toggleDataType() {
        const selectedType = document.getElementById('toggle-data').value;

        const incomeStatementTable = document.getElementById('table-income-statement');
        const balanceSheetTable = document.getElementById('table-balance-sheet');
        const cashFlowTable = document.getElementById('table-cash-flow');

        if (incomeStatementTable) {
            incomeStatementTable.innerHTML = createTableFromNestedJSON(fundamentalData.INCOME_STATEMENT, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports');
        }

        if (balanceSheetTable) {
            balanceSheetTable.innerHTML = createTableFromNestedJSON(fundamentalData.BALANCE_SHEET, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports');
        }

        if (cashFlowTable) {
            cashFlowTable.innerHTML = createTableFromNestedJSON(fundamentalData.CASH_FLOW, selectedType === 'annual' ? 'annualReports' : 'quarterlyReports');
        }

        if (fundamentalData.EARNINGS) {
            const earningsData = fundamentalData.EARNINGS[selectedType === 'annual' ? 'annualEarnings' : 'quarterlyEarnings'].map(item => ({
                x: item.fiscalDateEnding,
                y: parseFloat(item.reportedEPS)
            })).sort((a, b) => new Date(a.x) - new Date(b.x));

            createEarningsChart(earningsData);
        }
    }

    function createColumnToggles(tableId, toggleContainerId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const toggleContainer = document.getElementById(toggleContainerId);
        const headers = table.querySelectorAll('th');

        headers.forEach((header, index) => {
            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = true;
            toggle.id = `${tableId}-toggle-${index}`;
            toggle.addEventListener('change', () => {
                const cells = table.querySelectorAll(`td:nth-child(${index + 1}), th:nth-child(${index + 1})`);
                cells.forEach(cell => {
                    cell.style.display = toggle.checked ? '' : 'none';
                });
            });

            const label = document.createElement('label');
            label.htmlFor = toggle.id;
            label.innerText = header.innerText;

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
                    createColumnToggles(button.getAttribute('aria-controls').replace('content-', 'table-'), button.getAttribute('aria-controls').replace('content-', '') + '-toggles');
                }
            }
        });
    });

    function createEarningsChart(data) {
        console.log('Earnings Chart Data:', data); // Log the earnings chart data to ensure it is correctly formatted
        if (earningsChart) {
            earningsChart.destroy();
        }
        earningsChart = new Chart(earningsCtx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.x),
                datasets: [{
                    label: 'Earnings',
                    data: data.map(item => item.y),
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Fiscal Date',
                            color: '#666',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Earnings',
                            color: '#666',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 12
                            },
                            beginAtZero: true,
                            max: Math.max(...data.map(item => item.y)) * 1.2
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#666',
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 16
                        },
                        bodyFont: {
                            size: 14
                        }
                    }
                }
            }
        });
    }

    // Create the earnings chart with the initial data
    const earningsData = fundamentalData.EARNINGS.annualEarnings.map(item => ({
        x: item.fiscalDateEnding,
        y: parseFloat(item.reportedEPS)
    })).sort((a, b) => new Date(a.x) - new Date(b.x));

    createEarningsChart(earningsData);
});
