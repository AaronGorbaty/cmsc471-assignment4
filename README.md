# Radial Metric Comparison Visualization

A D3.js-based interactive visualization that compares regional metrics across 10 different global indicators including GDP, health expenditure, education, and environmental metrics.

## Project Structure

```
.
├── index.html                          # Main HTML file
├── script.js                           # D3.js visualization logic
├── styles.css                          # CSS styling
└── data/
    └── assignment3_4_regions_filled.csv # Regional data metrics
```

## Prerequisites

You need a local web server to run this project. D3.js requires a server because browsers prevent loading CSV files directly from the file system for security reasons.

### Required Tools

- **Python 3** (comes pre-installed on macOS)
- or **Node.js** with npm (optional alternative)

## Hosting Locally

### Option 1: Using Python (Recommended for macOS)

#### Python 3 (Default on macOS):

1. Navigate to the project directory:

   ```bash
   cd /path/to/cmsc471-assignment4
   ```

2. Start a local HTTP server:

   ```bash
   python3 -m http.server 8000
   ```

3. Open your browser and navigate to:

   ```
   http://localhost:8000
   ```

4. To stop the server, press `Ctrl+C` in the terminal.

---

### Option 2: Using Node.js

If you have Node.js installed:

1. Install a simple HTTP server package globally (if not already installed):

   ```bash
   npm install -g http-server
   ```

2. Navigate to the project directory:

   ```bash
   cd /path/to/cmsc471-assignment4
   ```

3. Start the server:

   ```bash
   http-server -p 8000
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

---

### Option 3: Using VS Code Live Server Extension

1. Install the **Live Server** extension in VS Code
2. Right-click on `index.html` and select **"Open with Live Server"**
3. The website will automatically open in your default browser

---

## Features

- **Interactive Region Selection**: Use the dropdown menu to select a region and see how its metrics compare to others
- **Radial Visualization**: Metrics are arranged in a circular layout for easy comparison
- **Hover Interactions**: Hover over dots to see detailed metric values in a tooltip
- **Dynamic Highlighting**: The purple arc highlights metrics where the selected region outperforms the average of other regions
- **Center Summary**: Displays the percentage of metrics where the selected region is stronger than average

## How to Use

1. Start the local server using one of the methods above
2. The visualization loads automatically and shows "Americas" by default
3. Use the dropdown menu to select different regions
4. Hover over the dots to see specific metric values
5. Observe the purple arc to identify the region's strongest metrics

## Data

The visualization analyzes 10 metrics across multiple regions:

- Happy Planet Index
- Human Development Index
- GDP per Capita
- Economic Growth
- Health % of GDP
- Health $ Per Capita
- Infant Mortality
- Education % of GDP
- Unemployment %
- CO2e Emissions

All data is sourced from `data/assignment3_4_regions_filled.csv`.

## Troubleshooting

### Issue: "Failed to load resource" or CORS error

- **Solution**: Ensure you're running a local server. Opening the HTML file directly in the browser (`file://`) will not work due to browser security policies.

### Issue: Visualization doesn't appear

- **Solution**: Check the browser console (F12 → Console tab) for errors. Ensure the CSV file path is correct and the server is running.

### Issue: Dropdown is empty

- **Solution**: Verify that `data/assignment3_4_regions_filled.csv` exists and contains valid data with a "region" column.

## Technologies Used

- **D3.js v7**: Data visualization library
- **HTML5**: Markup structure
- **CSS3**: Styling and animations
- **JavaScript (ES6)**: Interactive functionality

## Browser Compatibility

Works on modern browsers including:

- Chrome/Chromium
- Firefox
- Safari
- Edge
