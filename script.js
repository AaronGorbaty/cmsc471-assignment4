// script.js
// Radial metrics by region with D3

const svg = d3.select("#radial-chart");
const width = 900;
const height = 600;
svg.attr("viewBox", `0 0 ${width} ${height}`);

const chartG = svg
  .append("g")
  .attr("transform", `translate(${width / 2}, ${height / 2})`);

const innerRadius = 80;
const outerRadius = 260;
const arcInnerRadius = outerRadius + 20;
const arcOuterRadius = outerRadius + 30;

const tooltip = d3.select("#tooltip");
const regionLabel = d3.select("#region-label");
const regionSelect = d3.select("#region-select");

// hard-coded region order (and legend order)
const REGION_ORDER = [
  "Americas",
  "East Asia & Pacific",
  "Europe & Central Asia",
  "Middle East & North Africa",
  "South Asia",
  "Sub-Saharan Africa",
];

let metrics = [];
let regions = [];
let dataByRegionMetric = {}; // region -> metric -> avg

d3.csv("data/assignment3_4_regions_10metrics_template.csv", d3.autoType)
  .then((raw) => {
    // Expect columns: country, iso3, region, metric1, metric2, ...
    const columns = raw.columns;
    const metaCols = ["country", "iso3", "region"];

    metrics = columns.filter((c) => !metaCols.includes(c)).slice(0, 10); // at least 10
    regions = REGION_ORDER.filter((r) => raw.some((d) => d.region === r));

    // fallback if REGION_ORDER doesn't match data
    if (regions.length === 0) {
      regions = Array.from(new Set(raw.map((d) => d.region))).filter(Boolean);
    }

    // populate dropdown
    regionSelect
      .selectAll("option")
      .data(regions)
      .enter()
      .append("option")
      .attr("value", (d) => d)
      .text((d) => d);

    regionSelect.property("value", regions[0]);
    regionLabel.text(regions[0]);

    // precompute regional averages
    dataByRegionMetric = computeRegionMetricAverages(raw, regions, metrics);

    // draw static scaffolding once
    initScaffolding();

    // draw first view
    updateView(regions[0]);

    // interaction: dropdown
    regionSelect.on("change", (event) => {
      const selectedRegion = event.target.value;
      regionLabel.text(selectedRegion);
      updateView(selectedRegion);
    });
  })
  .catch((err) => console.error(err));

/**
 * Compute average values: region -> metric -> avg
 */
function computeRegionMetricAverages(data, regions, metrics) {
  const sums = {};
  const counts = {};

  regions.forEach((region) => {
    sums[region] = {};
    counts[region] = {};
    metrics.forEach((m) => {
      sums[region][m] = 0;
      counts[region][m] = 0;
    });
  });

  data.forEach((row) => {
    const r = row.region;
    if (!regions.includes(r)) return;

    metrics.forEach((m) => {
      const v = +row[m];
      if (!isNaN(v)) {
        sums[r][m] += v;
        counts[r][m] += 1;
      }
    });
  });

  const result = {};
  regions.forEach((region) => {
    result[region] = {};
    metrics.forEach((m) => {
      result[region][m] =
        counts[region][m] > 0 ? sums[region][m] / counts[region][m] : NaN;
    });
  });

  return result;
}

/**
 * Build metric info for a specific selected region:
 *  - regionValues: { region -> val }
 *  - stronger: selected region > avg(other regions)
 */
function buildMetricInfo(selectedRegion) {
  return metrics.map((metric) => {
    const vals = {};
    regions.forEach((r) => {
      vals[r] = dataByRegionMetric[r][metric];
    });

    const selectedValue = vals[selectedRegion];

    const otherVals = regions
      .filter((r) => r !== selectedRegion)
      .map((r) => vals[r])
      .filter((v) => !isNaN(v));

    let stronger = false;
    if (!isNaN(selectedValue) && otherVals.length > 0) {
      const othersAvg = d3.mean(otherVals);
      stronger = selectedValue > othersAvg;
    }

    return {
      metric,
      regionValues: vals,
      selectedValue,
      stronger,
    };
  });
}

/**
 * Initialize SVG groups that remain across updates.
 */
function initScaffolding() {
  // group containers
  chartG.append("g").attr("class", "segments");
  chartG.append("g").attr("class", "axes");
  chartG.append("g").attr("class", "dots");
  chartG.append("g").attr("class", "labels");
  chartG.append("g").attr("class", "arc-layer");

  // center text
  chartG
    .append("text")
    .attr("class", "center-percent")
    .attr("id", "center-percent")
    .attr("y", -8);

  chartG
    .append("text")
    .attr("class", "center-caption")
    .attr("id", "center-caption")
    .attr("y", 12)
    .text("of metrics are stronger than the average of other regions");
}

/**
 * Main update function when region changes.
 */
function updateView(selectedRegion) {
  const metricInfo = buildMetricInfo(selectedRegion);

  // sort metrics: stronger first so they are contiguous
  metricInfo.sort((a, b) => {
    if (a.stronger === b.stronger) {
      return d3.ascending(a.metric, b.metric);
    }
    return a.stronger ? -1 : 1;
  });

  const n = metricInfo.length;
  const angleStep = (2 * Math.PI) / n;

  const angleScale = d3
    .scaleLinear()
    .domain([0, n])
    .range([0, 2 * Math.PI]);

  // radial scale per metric (based on region averages)
  const radialScales = {};
  metricInfo.forEach((d, i) => {
    const metric = d.metric;
    const vals = regions.map((r) => d.regionValues[r]).filter((v) => !isNaN(v));
    const minV = d3.min(vals);
    const maxV = d3.max(vals);
    radialScales[metric] = d3
      .scaleLinear()
      .domain([minV, maxV])
      .range([innerRadius + 10, outerRadius - 10]);
  });

  // ----- Background metric segments (for hover) -----
  const segmentsG = chartG.select(".segments");

  const segment = segmentsG
    .selectAll(".metric-segment")
    .data(metricInfo, (d) => d.metric);

  const segmentEnter = segment
    .enter()
    .append("path")
    .attr("class", "metric-segment")
    .on("mouseover", function (event, d) {
      d3.select(this).classed("hovered", true);
    })
    .on("mouseout", function () {
      d3.select(this).classed("hovered", false);
    });

  segmentEnter
    .merge(segment)
    .transition()
    .duration(700)
    .attrTween("d", (d, i) => {
      const startAngle = angleScale(i);
      const endAngle = angleScale(i + 1);
      const arc = d3
        .arc()
        .innerRadius(innerRadius - 20)
        .outerRadius(outerRadius + 40)
        .startAngle(startAngle)
        .endAngle(endAngle);
      return () => arc();
    });

  segment.exit().remove();

  // ----- Metric axes -----
  const axesG = chartG.select(".axes");

  const axisLines = axesG
    .selectAll(".metric-axis")
    .data(metricInfo, (d) => d.metric);

  const axisEnter = axisLines
    .enter()
    .append("line")
    .attr("class", "metric-axis");

  axisEnter
    .merge(axisLines)
    .transition()
    .duration(700)
    .attr("x1", (d) => {
      const i = metricInfo.indexOf(d);
      const a = angleScale(i) - Math.PI / 2;
      return Math.cos(a) * innerRadius;
    })
    .attr("y1", (d) => {
      const i = metricInfo.indexOf(d);
      const a = angleScale(i) - Math.PI / 2;
      return Math.sin(a) * innerRadius;
    })
    .attr("x2", (d) => {
      const i = metricInfo.indexOf(d);
      const a = angleScale(i) - Math.PI / 2;
      return Math.cos(a) * outerRadius;
    })
    .attr("y2", (d) => {
      const i = metricInfo.indexOf(d);
      const a = angleScale(i) - Math.PI / 2;
      return Math.sin(a) * outerRadius;
    });

  axisLines.exit().remove();

  // ----- Metric labels -----
  const labelsG = chartG.select(".labels");

  const labels = labelsG
    .selectAll(".metric-label")
    .data(metricInfo, (d) => d.metric);

  const labelsEnter = labels
    .enter()
    .append("text")
    .attr("class", "metric-label")
    .text((d) => d.metric);

  labelsEnter
    .merge(labels)
    .transition()
    .duration(700)
    .attr("x", (d) => {
      const i = metricInfo.indexOf(d);
      const a = angleScale(i + 0.5) - Math.PI / 2;
      return Math.cos(a) * (outerRadius + 55);
    })
    .attr("y", (d) => {
      const i = metricInfo.indexOf(d);
      const a = angleScale(i + 0.5) - Math.PI / 2;
      return Math.sin(a) * (outerRadius + 55);
    })
    .attr("text-anchor", (d) => {
      const i = metricInfo.indexOf(d);
      const angleDeg = (angleScale(i + 0.5) * 180) / Math.PI;
      return angleDeg > 90 && angleDeg < 270 ? "end" : "start";
    })
    .attr("transform", (d) => {
      const i = metricInfo.indexOf(d);
      const a = angleScale(i + 0.5) - Math.PI / 2;
      const angleDeg = (a * 180) / Math.PI;
      const x = Math.cos(a) * (outerRadius + 55);
      const y = Math.sin(a) * (outerRadius + 55);
      // rotate text so it is more readable
      return `translate(${x},${y}) rotate(${angleDeg})`;
    })
    .text((d) => d.metric);

  labels.exit().remove();

  // ----- Region dots along each axis -----
  const dotsG = chartG.select(".dots");

  // flatten: one object per (metric, region)
  const dotData = [];
  metricInfo.forEach((mInfo, metricIndex) => {
    regions.forEach((region, rIndex) => {
      dotData.push({
        metric: mInfo.metric,
        metricIndex,
        region,
        value: mInfo.regionValues[region],
      });
    });
  });

  const dots = dotsG
    .selectAll(".region-dot")
    .data(dotData, (d) => `${d.metric}-${d.region}`);

  const dotsEnter = dots
    .enter()
    .append("circle")
    .attr("class", "region-dot")
    .attr("r", 3)
    .on("mouseover", (event, d) => {
      // tooltip
      tooltip
        .classed("hidden", false)
        .classed("visible", true)
        .html(
          `<strong>Metric:</strong> ${d.metric}<br/>
           <strong>Region:</strong> ${d.region}<br/>
           <strong>Value:</strong> ${
             d.value != null ? d.value.toFixed(2) : "N/A"
           }`
        )
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 12 + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 12 + "px");
    })
    .on("mouseout", () => {
      tooltip.classed("visible", false).classed("hidden", true);
    });

  dotsEnter
    .merge(dots)
    .transition()
    .duration(700)
    .attr("r", (d) => (d.region === selectedRegion ? 6 : 3.5))
    .attr(
      "class",
      (d) =>
        "region-dot" + (d.region === selectedRegion ? " selected-region" : "")
    )
    .attr("cx", (d) => {
      const angle = angleScale(d.metricIndex) - Math.PI / 2;
      const rs = radialScales[d.metric];
      const baseR = rs(d.value);
      // small angular jitter to reduce overlap
      const offset = (REGION_ORDER.indexOf(d.region) - 2.5) * 2; // degrees
      const jitterAngle = angle + (offset * Math.PI) / 180;
      return Math.cos(jitterAngle) * baseR;
    })
    .attr("cy", (d) => {
      const angle = angleScale(d.metricIndex) - Math.PI / 2;
      const rs = radialScales[d.metric];
      const baseR = rs(d.value);
      const offset = (REGION_ORDER.indexOf(d.region) - 2.5) * 2;
      const jitterAngle = angle + (offset * Math.PI) / 180;
      return Math.sin(jitterAngle) * baseR;
    });

  dots.exit().remove();

  // ----- Purple arc -----
  const strongCount = metricInfo.filter((d) => d.stronger).length;
  const arcAngleEnd = angleScale(strongCount);

  const arcLayer = chartG.select(".arc-layer");
  let purpleArc = arcLayer.selectAll(".purple-arc").data([strongCount]);

  const arcGenerator = d3
    .arc()
    .innerRadius(arcInnerRadius)
    .outerRadius(arcOuterRadius)
    .startAngle(0);

  purpleArc
    .enter()
    .append("path")
    .attr("class", "purple-arc")
    .merge(purpleArc)
    .transition()
    .duration(700)
    .attrTween("d", () => {
      const i = d3.interpolate(0, arcAngleEnd);
      return (t) => arcGenerator.endAngle(i(t))();
    });

  purpleArc.exit().remove();

  // ----- Center summary text -----
  const percent = (strongCount / metricInfo.length) * 100;
  d3.select("#center-percent").text(`${Math.round(percent)}%`);
}
