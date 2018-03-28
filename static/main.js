var margin = {
  top: 40,
  right: 40,
  bottom: 60,
  left: 60
}

console.log(graphData);

var width = 500 - margin.left - margin.right;
var height = 500 - margin.top - margin.bottom;

var svg = d3.select("body").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var xScale = d3.scaleLinear()
  .range([0, width])
  .domain([0, 9000]);


var yScale = d3.scaleLinear()
  .range([height, 0])
  .domain([0, 9000]);

var xAxis = svg.append('g')
  .attr('transform', 'translate(0,' + height + ')')
  .call(d3.axisBottom().scale(xScale));

var yAxis = svg.append('g')
  .call(d3.axisLeft().scale(yScale));

svg.append("text")
  .attr("transform",
    "translate(" + (width / 2) + " ," +
    (height + margin.top) + ")")
  .style("text-anchor", "middle")
  .text("Building Value");

svg.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 0 - margin.left)
  .attr("x", 0 - (height / 2))
  .attr("dy", "1em")
  .style("text-anchor", "middle")
  .text("Building Sq Ft");

svg.append("text")
  .attr("transform",
    "translate(" + (width / 2) + " ,-10)")
  .style("text-anchor", "middle")
  .text("Building Value vs Size");
