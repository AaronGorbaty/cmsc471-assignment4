const margin = {top: 40, right: 40, bottom: 40, left: 60};
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// The margin code above

// json sample data
const data = [
    {count: 10, catergory: 'Apple'},
    {count: 30, catergory: 'Banana'},
    {count: 45, catergory: 'Pear'},
    {count: 60, catergory: 'Orange'},
    {count: 20, catergory: 'Grape'}
]


// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const xScale = d3.scaleBand()
    .domain(data.map(d => d.catergory))
    .range([0, width])
    .padding(0.2)

const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .range([height, 0]);  // Inverted for SVG coordinates

const color = d3.scaleOrdinal()
    .domain(data.map(d => d.catergory))
    .range(d3.schemeCategory10);

svg.selectAll('rect')  // Select all rectangles (none exist yet so they are placeholders)
    .data(data)        // Bind data array to selection
    .enter()           // Get 'enter' selection for new elements
    .append('rect')        // Add rectangle for each data point
    .attr('class', 'bar')  // Add CSS class for styling
    .attr('x', d => xScale(d.catergory))  // X position from band scale
    .attr('y', d => yScale(d.count))       // Y position from linear scale
    .attr('width', xScale.bandwidth())        // Width from band scale, a fixed number
    .attr('height', d => height - yScale(d.count))  // Height calculation
    .style('fill', d => color(d.catergory));

const xAxis = d3.axisBottom(xScale);

svg.append('g')
   .attr('transform', `translate(0,${height})`)
   .call(xAxis);

const yAxis = d3.axisLeft(yScale)
    .ticks(3);

svg.append('g')
    .attr('class', 'y-axis')
    .call(yAxis);
    

svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 10)
    .style('text-anchor', 'middle')
    .text('fruit');

svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .style('text-anchor', 'middle')
    .text('count');

