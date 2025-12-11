// Configuration constants
const width = 800;
const height = 800;
const margin = 50;
const radius = Math.min(width, height) / 2 - margin;
const innerRadius = radius * 0.25; // Space for the center summary

// Global variables for data and visualization state
let data;
let regionNames;
let selectedRegion = "Americas";
let aggregatedData;

// Setup SVG container
// NOTE: This is the correct, single declaration for the SVG element.
const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

// Setup Tooltip (for hover interactions)
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");

// --- 1. Data Loading and Preparation ---

// Use the filled data file
d3.csv("data/assignment3_4_regions_10metrics_template.csv", d3.autoType)
    .then(rawdata => {
        
        // Data is ready, no need for client-side mapping anymore.
        data = rawdata;
        
        // Filter out empty region rows and get unique region names
        regionNames = [...new Set(data.map(d => d.region))].filter(r => r).sort();
        
        // Extract metric keys (column headers for the metrics)
        const metricKeys = rawdata.columns.filter(col => 
            !['country', 'iso3', 'region', ''].includes(col)
        );
        
        // Metric mapping for cleaner display labels
        const metricMap = {
            'happy planet index.1 (2019)': 'Happy Planet Index',
            'human development index.1 (2021)': 'Human Development Index',
            'GDP per capita in $ (2021)': 'GDP per Capita',
            'Economic Growth (2021 or latest)': 'Economic Growth',
            'Health expenditure % of GDP(2021 or latest)': 'Health % of GDP',
            'Health Expenditure per person (2019)': 'Health $ Per Capita',
            'infant mortality (2020)': 'Infant Mortality',
            'education expenditure\n% of GDP.2 (2021 or latest year)': 'Education % of GDP',
            'Unemployment % (2021)': 'Unemployment %',
            'CO2e emissions per capita (2019)': 'CO2e Emissions'
        };

        // Aggregation: Calculate average, min, and max for each metric across all regions
        let allMetrics = metricKeys.map(metricKey => {
            const cleanMetricName = metricMap[metricKey] || metricKey;

            const regionAverages = regionNames.map(region => {
                const regionalCountries = data.filter(d => d.region === region);
                const avg = d3.mean(regionalCountries, d => d[metricKey]);
                return {
                    region: region,
                    value: avg,
                    metric: cleanMetricName
                };
            }).filter(d => d.value !== undefined && d.value !== null && !isNaN(d.value));

            const allValues = regionAverages.map(d => d.value);
            let min = d3.min(allValues);
            let max = d3.max(allValues);
            
            // FIX: Handle Zero Variance (min === max) by expanding the domain slightly
            if (min !== undefined && max !== undefined && min === max) {
                 min = min - 0.01;
                 max = max + 0.01;
            }

            return {
                metric: cleanMetricName,
                key: metricKey,
                min: min,
                max: max,
                regions: regionAverages
            };
        });
        
        // Final filter: Only keep metrics that have valid min/max bounds
        aggregatedData = allMetrics.filter(m => m.min !== undefined && m.max !== undefined);

        if (aggregatedData.length === 0) {
             svg.append("text").attr("text-anchor", "middle").attr("y", -20).text("No usable metrics found after aggregation. Check data integrity.");
             return;
        }

        d3.select("#region-select").property('value', selectedRegion);

        setupControls();
        drawVisualization(selectedRegion);
    })
    .catch(error => {
        console.error("Error loading or processing data. Check file path and server configuration:", error);
        // Display a helpful error message for file loading issues
        svg.append("text").attr("text-anchor", "middle").text("Error loading data. Check file path: assignment3_4_regions_filled.csv");
    });


// --- 2. Setup Controls (Dropdown) ---

function setupControls() {
    d3.select("#region-select")
        .selectAll("option")
        .data(regionNames)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    d3.select("#region-select").on("change", function(event) {
        selectedRegion = event.target.value;
        drawVisualization(selectedRegion);
    });
}


// --- 3. Core Drawing Function ---

function drawVisualization(selectedRegion) {
    
    if (aggregatedData.length === 0) return;
    
    // --- Step 3.1: Sort Metrics based on performance of selectedRegion (3 pts) ---
    
    const isStronger = (metricName, selectedValue, allRegionalData) => {
        const lowerIsBetter = ['Infant Mortality', 'Unemployment %', 'CO2e Emissions'];
        const isLowerBetter = lowerIsBetter.includes(metricName);
        
        const otherValues = allRegionalData
            .filter(v => v.region !== selectedRegion)
            .map(v => v.value);
        
        if (otherValues.length === 0) return false;
        
        const avgOther = d3.mean(otherValues);
        
        if (isLowerBetter) {
            return selectedValue < avgOther;
        } else {
            return selectedValue > avgOther;
        }
    };
    
    const scoredMetrics = aggregatedData.map(m => {
        const selectedRegionData = m.regions.find(r => r.region === selectedRegion);
        if (!selectedRegionData) {
            m.isStronger = false;
            return m;
        }

        m.isStronger = isStronger(m.metric, selectedRegionData.value, m.regions);
        return m;
    });

    const orderedMetrics = scoredMetrics.sort((a, b) => {
        return (b.isStronger - a.isStronger); 
    });

    const strongerMetricCount = orderedMetrics.filter(m => m.isStronger).length;
    const totalMetricCount = orderedMetrics.length;
    const strongerPercentage = Math.round((strongerMetricCount / totalMetricCount) * 100);

    // --- Step 3.2: Configure Radial Scales and Angles ---
    
    const angleScale = d3.scalePoint()
        .domain(orderedMetrics.map(d => d.metric))
        .range([0, 2 * Math.PI]);
    
    // --- Step 3.3: Draw the Central Summary (1 pt) ---
    
    svg.selectAll(".summary-group").remove();
    
    const summaryGroup = svg.append("g")
        .attr("class", "summary-group");

    summaryGroup.append("text")
        .attr("class", "center-summary")
        .text(`${strongerPercentage}%`);

    summaryGroup.append("text")
        .attr("class", "summary-label")
        .attr("dy", "1.5em")
        .text("of metrics are stronger than the");
        
    summaryGroup.append("text")
        .attr("class", "summary-label")
        .attr("dy", "3em") 
        .text(`average of other Regions`); 


    // --- Step 3.4: Draw Metric Axes and Labels (2 pts for layout, 3 pts for updates) ---
    
    const metricGroup = svg.selectAll(".metric-group")
        .data(orderedMetrics, d => d.metric);

    metricGroup.exit().remove();
    
    const metricGroupEnter = metricGroup.enter()
        .append("g")
        .attr("class", "metric-group");

    const metricGroupUpdate = metricGroupEnter.merge(metricGroup);

    // Axis Line
    metricGroupUpdate.selectAll("line").remove();
    metricGroupUpdate.append("line")
        .attr("class", "metric-axis")
        .attr("x1", innerRadius)
        .attr("y1", 0)
        .attr("x2", radius)
        .attr("y2", 0);

    // Label 
    metricGroupUpdate.selectAll("text.metric-label").remove();
    metricGroupUpdate.append("text")
        .attr("class", "metric-label")
        .attr("x", radius + 5)
        .attr("y", 0)
        .attr("dy", "0.3em")
        .text(d => d.metric);
    
    // Apply position transition (3 pts)
    metricGroupUpdate
        .transition() 
        .duration(700)
        .attr("transform", d => {
            const angle = angleScale(d.metric) - Math.PI / 2;
            return `rotate(${angle * 180 / Math.PI})`;
        });

    // Apply static label rotation and interaction
    metricGroupUpdate.select(".metric-label")
        .attr("transform", d => {
            const angle = angleScale(d.metric);
            let rotateAngle = (angle > Math.PI / 2 && angle < 3 * Math.PI / 2) ? 270 : 90;
            return `rotate(${rotateAngle})`;
        })
        .on("mouseover", function() {
            d3.select(this.parentNode).append("rect")
                .attr("class", "metric-hover-bg")
                .attr("x", innerRadius)
                .attr("y", -10)
                .attr("width", radius - innerRadius)
                .attr("height", 20)
                .attr("fill", "#eee")
                .lower();
        })
        .on("mouseout", function() {
            d3.select(this.parentNode).select(".metric-hover-bg").remove();
        });


    // --- Step 3.5: Draw Region Dots (2 pts for 6 dots, 3 pts for updates) ---

    const allRegionData = orderedMetrics.flatMap(m => {
        const metricScale = d3.scaleLinear()
            .domain([m.min, m.max])
            .range([innerRadius, radius]);
            
        return m.regions.map(r => ({
            ...r, 
            scale: metricScale,
            metricKey: m.metric
        }));
    });

    const dots = svg.selectAll(".region-dot-group")
        .data(allRegionData, d => d.metricKey + d.region);
        
    dots.exit().remove();

    const dotsEnter = dots.enter()
        .append("g")
        .attr("class", "region-dot-group");

    dotsEnter.append("circle")
        .attr("class", "region-dot")
        .attr("r", 3);

    const dotsUpdate = dotsEnter.merge(dots)
        .attr("transform", d => {
            const angle = angleScale(d.metric) - Math.PI / 2;
            return `rotate(${angle * 180 / Math.PI})`;
        });
        
    const circles = dotsUpdate.select("circle");
    
    // Apply size, class, and color instantly
    circles
        .attr("r", d => d.region === selectedRegion ? 5 : 3) 
        .classed("selected-region-dot", d => d.region === selectedRegion) 
        .style("fill", d => d.region === selectedRegion ? 'purple' : '#999');

    // Animate the positional change (3 pts for updated position)
    circles.transition()
        .duration(700)
        .attr("cx", d => d.scale(d.value))
        .attr("cy", 0);


    // Add Hover Interaction (1 pt)
    dotsUpdate.on("mouseover", function(event, d) {
        d3.select(this).select("circle")
            .attr("stroke", "black")
            .attr("stroke-width", 2);

        tooltip.style("opacity", 1)
            .html(`
                <strong>Metric:</strong> ${d.metric}<br>
                <strong>Region:</strong> ${d.region}<br>
                <strong>Value:</strong> ${d3.format(".2f")(d.value)}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");

    })
    .on("mouseout", function() {
        d3.select(this).select("circle")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);
        
        tooltip.style("opacity", 0);
    });

    // --- Step 3.6: Draw the Purple Arc (3 pts for re-drawing) ---
    
    const strongerMetrics = orderedMetrics.filter(m => m.isStronger);
    
    let startAngle = 0;
    let endAngle = 0;
    
    if (strongerMetrics.length > 0) {
        const segmentAngle = angleScale.step(); 
        startAngle = angleScale(strongerMetrics[0].metric) - segmentAngle / 2; 
        endAngle = angleScale(strongerMetrics[strongerMetrics.length - 1].metric) + segmentAngle / 2;
    } else {
        startAngle = 0;
        endAngle = 0.001; 
    }
    
    const arcGenerator = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius + 10)
        .startAngle(startAngle)
        .endAngle(endAngle);

    svg.selectAll(".highlight-arc").remove();
    svg.append("path")
        .attr("class", "highlight-arc")
        .attr("d", arcGenerator());
}