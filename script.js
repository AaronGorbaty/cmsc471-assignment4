// Configuration constants
const width = 800;
const height = 800;
const margin = 120;
const radius = Math.min(width, height) / 2 - margin;
const innerRadius = radius * 0.4; // Space for the center summary

// Global variables for data and visualization state
let data;
let regionNames;
let selectedRegion = "Americas";
let aggregatedData;

// Setup SVG container
const svg = d3
  .select("#visualization")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", `translate(${width / 2}, ${height / 2})`);

// Setup Tooltip (for hover interactions)
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

// --- 1. Data Loading and Preparation ---

// Ensure file path is correct for D3 loading
d3.csv("data/assignment3_4_regions_filled.csv", d3.autoType)
  .then((rawdata) => {
    data = rawdata;

    regionNames = [...new Set(data.map((d) => d.region))]
      .filter((r) => r)
      .sort();

    const metricKeys = rawdata.columns.filter(
      (col) => !["country", "iso3", "region", ""].includes(col)
    );

    const metricMap = {
      "happy planet index.1 (2019)": "Happy Planet Index",
      "human development index.1 (2021)": "Human Development Index",
      "GDP per capita in $ (2021)": "GDP per Capita",
      "Economic Growth (2021 or latest)": "Economic Growth",
      "Health expenditure % of GDP(2021 or latest)": "Health % of GDP",
      "Health Expenditure per person (2019)": "Health $ Per Capita",
      "infant mortality (2020)": "Infant Mortality",
      "education expenditure\n% of GDP.2 (2021 or latest year)":
        "Education % of GDP",
      "Unemployment % (2021)": "Unemployment %",
      "CO2e emissions per capita (2019)": "CO2e Emissions",
    };

    // Aggregation: Calculate average, min, and max for each metric across all regions
    let allMetrics = metricKeys.map((metricKey) => {
      const cleanMetricName = metricMap[metricKey] || metricKey;

      const regionAverages = regionNames
        .map((region) => {
          const regionalCountries = data.filter((d) => d.region === region);
          const avg = d3.mean(regionalCountries, (d) => d[metricKey]);
          return {
            region: region,
            value: avg,
            metric: cleanMetricName,
          };
        })
        .filter(
          (d) => d.value !== undefined && d.value !== null && !isNaN(d.value)
        );

      const allValues = regionAverages.map((d) => d.value);
      let min = d3.min(allValues);
      let max = d3.max(allValues);

      // FIX: Handle Zero Variance by expanding the domain slightly
      if (min !== undefined && max !== undefined && min === max) {
        min = min - 0.01;
        max = max + 0.01;
      }

      return {
        metric: cleanMetricName,
        key: metricKey,
        min: min,
        max: max,
        regions: regionAverages,
      };
    });

    // Final filter: Only keep metrics that have valid min/max bounds
    aggregatedData = allMetrics.filter(
      (m) => m.min !== undefined && m.max !== undefined
    );

    if (aggregatedData.length === 0) {
      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("y", -20)
        .text(
          "No usable metrics found after aggregation. Check data integrity."
        );
      return;
    }

    d3.select("#region-select").property("value", selectedRegion);

    setupControls();
    drawVisualization(selectedRegion);
  })
  .catch((error) => {
    console.error(
      "Error loading or processing data. Check file path and server configuration:",
      error
    );
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .text(
        "Error loading data. Check file path: data/assignment3_4_regions_filled.csv"
      );
  });

// --- 2. Setup Controls (Dropdown) ---

function setupControls() {
  d3.select("#region-select")
    .selectAll("option")
    .data(regionNames)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

  d3.select("#region-select").on("change", function (event) {
    selectedRegion = event.target.value;
    drawVisualization(selectedRegion);
  });
}

// --- 3. Core Drawing Function ---

function drawVisualization(selectedRegion) {
  if (aggregatedData.length === 0) return;

  // Metrics where a LOWER numeric value is better
  const lowerIsBetterMetrics = [
    "Infant Mortality",
    "Unemployment %",
    "CO2e Emissions",
  ];
  const isLowerBetterMetric = (metricName) =>
    lowerIsBetterMetrics.includes(metricName);

  // --- Step 3.1: Sort Metrics based on performance of selectedRegion (3 pts) ---

  const isStronger = (metricName, selectedValue, allRegionalData) => {
    const isLowerBetter = isLowerBetterMetric(metricName);

    const otherValues = allRegionalData
      .filter((v) => v.region !== selectedRegion)
      .map((v) => v.value);

    if (otherValues.length === 0) return false;

    const avgOther = d3.mean(otherValues);

    if (isLowerBetter) {
      // lower value is better → "stronger" if below average
      return selectedValue < avgOther;
    } else {
      // higher value is better → "stronger" if above average
      return selectedValue > avgOther;
    }
  };

  const scoredMetrics = aggregatedData.map((m) => {
    const selectedRegionData = m.regions.find(
      (r) => r.region === selectedRegion
    );
    if (!selectedRegionData) {
      m.isStronger = false;
      return m;
    }

    m.isStronger = isStronger(m.metric, selectedRegionData.value, m.regions);
    return m;
  });

  const orderedMetrics = scoredMetrics.sort((a, b) => {
    return b.isStronger - a.isStronger;
  });

  const strongerMetricCount = orderedMetrics.filter((m) => m.isStronger).length;
  const totalMetricCount = orderedMetrics.length;
  const strongerPercentage = Math.round(
    (strongerMetricCount / totalMetricCount) * 100
  );

  // --- Step 3.2: Configure Radial Scales and Angles ---

  const angleScale = d3
    .scalePoint()
    .domain(orderedMetrics.map((d) => d.metric))
    .range([0, 2 * Math.PI])
    .padding(0.5);

  const step = angleScale.step();

  // Helper to set highlight fill for a given metric
  const setMetricAreaHighlight = (metricName, on) => {
    svg
      .selectAll(".metric-area")
      .filter((d) => d.metric === metricName)
      .attr("fill", on ? "#eee" : "transparent");
  };

  // --- 3.3: Draw the Central Summary (1 pt) ---

  svg.selectAll(".summary-group").remove();

  const summaryGroup = svg.append("g").attr("class", "summary-group");

  summaryGroup
    .append("text")
    .attr("class", "center-summary")
    .text(`${strongerPercentage}%`);

  summaryGroup
    .append("text")
    .attr("class", "summary-label")
    .attr("dy", "1.5em")
    .text("of metrics are stronger than the");

  summaryGroup
    .append("text")
    .attr("class", "summary-label")
    .attr("dy", "3em")
    .text(`average of other Regions`);

  // --- 3.4: Draw the Purple Arc (radial ring along the outer radius) ---

  const strongerMetrics = orderedMetrics.filter((m) => m.isStronger);

  let startAngle = null;
  let endAngle = null;

  if (strongerMetrics.length > 0) {
    const segmentAngle = step;
    const centerAngleStart = angleScale(strongerMetrics[0].metric);
    const centerAngleEnd = angleScale(
      strongerMetrics[strongerMetrics.length - 1].metric
    );

    startAngle = centerAngleStart - segmentAngle / 2;
    endAngle = centerAngleEnd + segmentAngle / 2;
  } else {
    // If no stronger metrics, remove any existing arc and skip drawing
    svg.selectAll(".highlight-arc").remove();
  }

  if (startAngle !== null && endAngle !== null) {
    const arcThickness = 12; // thickness of the purple ring

    const arcGenerator = d3
      .arc()
      .innerRadius(radius - arcThickness / 2)
      .outerRadius(radius + arcThickness / 2)
      .startAngle(startAngle)
      .endAngle(endAngle);

    // Draw the arc and send it behind everything else.
    svg.selectAll(".highlight-arc").remove();
    svg
      .append("path")
      .attr("class", "highlight-arc")
      .attr("d", arcGenerator())
      .attr("fill", "#7b1fa2") // DARKER PURPLE
      .lower();
  }

  // --- Metric Area Wedges (for region hover, under everything) ---
  const areaArc = d3.arc().innerRadius(innerRadius).outerRadius(radius);

  const metricAreas = svg
    .selectAll(".metric-area")
    .data(orderedMetrics, (d) => d.metric);

  metricAreas.exit().remove();

  const metricAreasEnter = metricAreas
    .enter()
    .append("path")
    .attr("class", "metric-area");

  metricAreasEnter
    .merge(metricAreas)
    .attr("d", (d) => {
      const center = angleScale(d.metric);
      const aStart = center - step / 2;
      const aEnd = center + step / 2;
      return areaArc.startAngle(aStart).endAngle(aEnd)();
    })
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .lower() // keep these wedges beneath axes/dots/text
    .on("mouseover", (event, d) => setMetricAreaHighlight(d.metric, true))
    .on("mouseout", (event, d) => setMetricAreaHighlight(d.metric, false));

  // --- 3.5: Draw Metric Axes and Labels (Will be drawn ON TOP of the Arc & Area) ---

  const metricGroup = svg
    .selectAll(".metric-group")
    .data(orderedMetrics, (d) => d.metric);

  metricGroup.exit().remove();

  const metricGroupEnter = metricGroup
    .enter()
    .append("g")
    .attr("class", "metric-group");

  const metricGroupUpdate = metricGroupEnter.merge(metricGroup);

  const labelOffset = radius + 45;

  // Axis Line
  metricGroupUpdate.selectAll("line").remove();
  metricGroupUpdate
    .append("line")
    .attr("class", "metric-axis")
    .attr("x1", innerRadius)
    .attr("y1", 0)
    .attr("x2", radius)
    .attr("y2", 0);

  // Label
  metricGroupUpdate.selectAll("text.metric-label").remove();
  metricGroupUpdate
    .append("text")
    .attr("class", "metric-label")
    .attr("y", 0)
    .attr("dy", "0.3em")
    .text((d) => d.metric);

  // Apply position transition (3 pts)
  metricGroupUpdate
    .transition()
    .duration(700)
    .attr("transform", (d) => {
      const angle = angleScale(d.metric) - Math.PI / 2;
      return `rotate(${(angle * 180) / Math.PI})`;
    });

  // Dynamic X position, Anchor, and Rotation for correct outward display
  metricGroupUpdate
    .select(".metric-label")
    .attr("x", (d) => {
      const angle = (angleScale(d.metric) * 180) / Math.PI;
      return angle > 90 && angle < 270 ? -labelOffset : labelOffset;
    })
    .attr("text-anchor", (d) => {
      const angle = (angleScale(d.metric) * 180) / Math.PI;
      return angle > 90 && angle < 270 ? "end" : "start";
    })
    .attr("transform", (d) => {
      const angle = (angleScale(d.metric) * 180) / Math.PI;
      let rotation = 0;

      if (angle > 90 && angle < 270) {
        rotation = 180;
      }

      return `rotate(${rotation})`;
    });

  // Also trigger highlight when hovering axis/label region
  metricGroupUpdate
    .on("mouseover", (event, d) => setMetricAreaHighlight(d.metric, true))
    .on("mouseout", (event, d) => setMetricAreaHighlight(d.metric, false));

  // --- 3.6: Draw Region Dots (Last element, drawn ON TOP of everything) ---

  const allRegionData = orderedMetrics.flatMap((m) => {
    const lowerBetter = isLowerBetterMetric(m.metric);

    // For “lower is better” metrics, invert domain so
    // smaller values map to the OUTER radius (better)
    const domain = lowerBetter ? [m.max, m.min] : [m.min, m.max];

    const metricScale = d3
      .scaleLinear()
      .domain(domain)
      .range([innerRadius, radius]);

    return m.regions.map((r) => ({
      ...r,
      scale: metricScale,
      metricKey: m.metric,
    }));
  });

  const dots = svg
    .selectAll(".region-dot-group")
    .data(allRegionData, (d) => d.metricKey + d.region);

  dots.exit().remove();

  const dotsEnter = dots.enter().append("g").attr("class", "region-dot-group");

  dotsEnter.append("circle").attr("class", "region-dot").attr("r", 3);

  const dotsUpdate = dotsEnter.merge(dots).attr("transform", (d) => {
    const angle = angleScale(d.metric) - Math.PI / 2;
    return `rotate(${(angle * 180) / Math.PI})`;
  });

  const circles = dotsUpdate.select("circle");

  // Apply size, class, and color instantly
  circles
    .attr("r", (d) => (d.region === selectedRegion ? 5 : 3))
    .classed("selected-region-dot", (d) => d.region === selectedRegion)
    .style("fill", (d) => (d.region === selectedRegion ? "#7b1fa2" : "#999")); // DARKER PURPLE

  // Animate the positional change (3 pts for updated position)
  circles
    .transition()
    .duration(700)
    .attr("cx", (d) => d.scale(d.value))
    .attr("cy", 0);

  // Add Hover Interaction (1 pt) + also highlight region area from dots
  dotsUpdate
    .on("mouseover", function (event, d) {
      d3.select(this)
        .select("circle")
        .attr("stroke", "black")
        .attr("stroke-width", 2);

      tooltip
        .style("opacity", 1)
        .html(
          `
                <strong>Metric:</strong> ${d.metric}<br>
                <strong>Region:</strong> ${d.region}<br>
                <strong>Value:</strong> ${d3.format(".2f")(d.value)}
            `
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");

      setMetricAreaHighlight(d.metric, true);
    })
    .on("mouseout", function (event, d) {
      d3.select(this)
        .select("circle")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

      tooltip.style("opacity", 0);

      setMetricAreaHighlight(d.metric, false);
    });
}
