var height_per_bar;
var movement = 0;

var xScale;
var yAxisL;
var yAxisR;
var bars;

var data;
var barWidth;
var windowWidth;
var yTop;
var yBottom;

var diseases;

function compare(a,b) {
  var biasA = Math.abs(a.bias);
  var biasB = Math.abs(b.bias);
  if (biasA < biasB)
    return -1;
  if (biasA > biasB)
    return 1;
  return 0;
}

function drawMeshData() {
  topSvg.selectAll('*').remove();

  topSvg.call(d3.drag().on("drag", dragged).on("end", drag_ended));

  var height = 600 - margin.top - margin.bottom;
  var width = 900 - margin.left - margin.right;
  topSvg.attr('width', width);
  topSvg.attr('height', height);

	data = meshData.slice();
	data.sort(compare);

	diseases = [];
	for (i = 0; i < data.length; i++) { 
		diseases.push(data[i].name);
	}

	xScale = d3.scaleLinear()
		.domain([-1,1])
		.range([margin.left, width-margin.right]);
	var xAxis = topSvg.append("g")
		.attr("transform", "translate(0," + margin.top + ")")
		.call(d3.axisTop().scale(xScale));
	topSvg.append("text")
			 .text("Bias Score")
			 .attr("text-anchor", "middle")
			 .attr("transform", "translate(" + (((width - margin.left - margin.right) / 2) + margin.left) + ",10)")
		
	barWidth = 20;
	windowWidth = 6;
	height_per_bar = (height-margin.top-margin.bottom)/windowWidth;
	yTop = diseases.length;
	yBottom = diseases.length-windowWidth;

  plot();
}

function plot(){
  if(yAxisL){
    yAxisL.remove();
  }
  if(yAxisR){
    yAxisR.remove();
  }
  if(bars){
    bars.remove();
  }

  var fBiasDiseasesL = [];
  for (i = yBottom; i < yTop; i++){
    if(data[i].bias < 0){
      fBiasDiseasesL.push(i-yBottom);
    }
  }
  var fBiasDiseasesR = fBiasDiseasesL.slice();
  
  var yScale =  d3.scaleBand()
    .domain(diseases.slice(yBottom, yTop))
    .range([height-margin.bottom, margin.top]);
  yAxisL = topSvg.append("g")
    .attr("transform", "translate(" + xScale(0) + ",0)")
    .call(d3.axisLeft().scale(yScale));
  yAxisR = topSvg.append("g")
    .attr("transform", "translate(" + xScale(0) + ",0)")
    .call(d3.axisRight().scale(yScale));
  
  var nextFDisease = fBiasDiseasesL.shift();
  yAxisL.selectAll("text")
    .filter(function(d, i) {
        if(i == nextFDisease){
          nextFDisease = fBiasDiseasesL.shift();
          return true;
        } else{
          return false;
        }
      })
    .remove();
  nextFDisease = fBiasDiseasesR.shift();
  yAxisR.selectAll("text")
    .filter(function(d, i) {
        if(i == nextFDisease){
          nextFDisease = fBiasDiseasesR.shift();
          return false;
        } else{
          return true;
        }
      })
    .remove();
  
  bars = topSvg.selectAll("rect")
    .data(data)
    .enter()
    .filter(function(d, i) { return yScale(d.name); })
    .append("rect")
      .attr("x", function(d) { return Math.min(xScale(0),xScale(d.bias)); })
      .attr("y", function(d) {
          return yScale(d.name) + yScale.bandwidth()/2 - barWidth/2;
        })
      .attr("width", function(d) {
          if(d.bias > 0){
            return xScale(d.bias)-xScale(0);
          } else{
            return xScale(0)-xScale(d.bias);
          }
        })
      .attr("height", barWidth)
      .attr("stroke", "black")
      .attr("stroke-linejoin", "round")
      .attr("fill", function(d) { return colorMap(d.bias);     })
}
function dragged() {
  if (topPlot != LIST_PLOT) { return; }
  var dy = d3.event.dy;
  if((yTop == diseases.length && dy > 0) ||
     (yBottom == 0 && dy < 0)){
       return;
  }
  movement+=dy;
  var intervals_moved = Math.trunc(movement/height_per_bar);
  if(Math.abs(intervals_moved) >= 1){
    movement -= intervals_moved*height_per_bar;
  }
  yTop += intervals_moved;
  if(yTop > diseases.length){
    yTop = diseases.length;
  }
  if(yTop  < windowWidth){
    yTop = windowWidth
  }
  yBottom = yTop-windowWidth;
  plot();
}

function drag_ended() {
  if (topPlot != LIST_PLOT) { return; }
  movement = 0;
}
