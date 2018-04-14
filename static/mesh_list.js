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

var listMargin = {top : 40,
              bottom: 20,
              left : 20,
              right: 20};

var comparator = orderArticleCount;	  
			  
function drawMeshData() {
  leftSvg.selectAll('*').remove();
  
  d3.select("#orderRadio").style("visibility", "visible")

  leftSvg.call(d3.drag().on("drag", dragged).on("end", drag_ended));

  var height = 600 - margin.top - margin.bottom;
  var width = document.getElementById("left_div").clientWidth*0.95;
  leftSvg.attr('width', width);
  leftSvg.attr('height', height);

	data = meshData.slice();
	data.sort(comparator);

	diseases = [];
	for (i = 0; i < data.length; i++) { 
		diseases.push(data[i].name);
	}

	xScale = d3.scaleLinear()
		.domain([-1,1])
		.range([listMargin.left, width-listMargin.right]);
	var xAxis = leftSvg.append("g")
		.attr("transform", "translate(0," + listMargin.top + ")")
		.call(d3.axisTop().scale(xScale));
	leftSvg.append("text")
			 .text("Bias Score")
			 .attr("text-anchor", "middle")
			 .attr("transform", "translate(" + (((width - listMargin.left - listMargin.right) / 2) + listMargin.left) + ",10)")
		
	barWidth = 20;
	windowWidth = Math.floor((height-listMargin.top-listMargin.bottom)/(barWidth*1.5));
	height_per_bar = (height-listMargin.top-listMargin.bottom)/windowWidth;
	yTop = diseases.length;
	yBottom = Math.max(diseases.length-windowWidth, 0);

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
  for (i = yBottom; i < Math.min(yTop, data.length); i++){
    if(data[i].bias < 0){
      fBiasDiseasesL.push(i-yBottom);
    }
  }
  var fBiasDiseasesR = fBiasDiseasesL.slice();
  
  var yScale =  d3.scaleBand()
    .domain(diseases.slice(yBottom, yTop))
    .range([height-listMargin.bottom, listMargin.top]);
  yAxisL = leftSvg.append("g")
    .attr("transform", "translate(" + xScale(0) + ",0)")
    .call(d3.axisLeft().scale(yScale));
  yAxisR = leftSvg.append("g")
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
  
  bars = leftSvg.selectAll("rect")
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
      .attr("fill", function(d) { return colorMap(d.bias); })
      .on("mouseenter", function(d) {
        showDiseaseTooltip(d.uid, margin.left, d3.event.pageY);
      })
      .on('mouseout', function(d) { hideDiseaseTooltip(); })
      .on('dblclick', function(d) {
        rootMesh = d.uid;
        topPlot = TREE_PLOT;
        updateSelectedMesh(getSubtreeMesh(rootMesh));
        })
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
  yBottom = Math.max(yTop-windowWidth, 0);
  plot();
}

function drag_ended() {
  if (topPlot != LIST_PLOT) { return; }
  movement = 0;
}

function selectOrdering(comp){
	comparator = comp;
	drawMeshData();
}

function orderArticleCount(a,b) {
  var countA = a.selectedPmids.length;
  var countB = b.selectedPmids.length;
  if (countA < countB)
    return -1;
  if (countA > countB)
    return 1;
  return 0;
}

function orderBiasMag(a,b) {
  var biasA = Math.abs(a.bias);
  var biasB = Math.abs(b.bias);
  if (biasA < biasB)
    return -1;
  if (biasA > biasB)
    return 1;
  return 0;
}

function orderBiasMale(a,b) {
  var biasA = a.bias;
  var biasB = b.bias;
  if (biasA < biasB)
    return -1;
  if (biasA > biasB)
    return 1;
  return 0;
}

function orderBiasFemale(a,b) {
  var biasA = a.bias;
  var biasB = b.bias;
  if (biasA > biasB)
    return -1;
  if (biasA < biasB)
    return 1;
  return 0;
}