var listMargin = {top : 40,
              bottom: 20,
              left : 20,
              right: 20};

var comparator = orderArticleCount;	  
var axisDiv;
			  
function drawMeshData() {
  leftSvg.selectAll('*').remove();
  if(axisDiv){
	  axisDiv.remove();
  }
  
  d3.select("#orderRadio").style("visibility", "visible")

  var barWidth = 20;
  var height = (barWidth*1.5*meshData.length) + listMargin.top + listMargin.bottom;
  var width = document.getElementById("left_div").clientWidth*0.95;
  leftSvg.attr('width', width);
  leftSvg.attr('height', height);

	var data = meshData.slice();
	data.sort(comparator);

	var diseases = [];
	for (i = 0; i < data.length; i++) { 
		diseases.push(data[i].name);
	}

	axisDiv = d3.select("#left_div").append("div")
		.style('position','absolute')
		.style('top', document.getElementById('left_div').getBoundingClientRect().top+'px');
	var axisSvg = axisDiv.append("svg")
		.attr("width", width)
		.attr("height", (listMargin.top+margin.top))
		.attr("transform", "translate("
					+ listMargin.left + ",0)");
	axisSvg.append("rect")
		.attr("width", "100%")
		.attr("height", "100%")
		.attr("fill", "#eee");
	
	var xScale = d3.scaleLinear()
		.domain([-1,1])
		.range([listMargin.left, width-listMargin.right]);
	var xAxis = axisSvg.append("g")
		.attr("transform", "translate(0," + (listMargin.top+margin.top-1) + ")")
		.call(d3.axisTop().scale(xScale));
	axisSvg.append("text")
			 .text("Bias Score")
			 .attr("text-anchor", "middle")
			 .attr("transform", "translate(" + (((width - listMargin.left - listMargin.right) / 2) + listMargin.left) + ",30)")

  var fBiasDiseasesL = [];
  for (i = 0; i < data.length; i++){
    if(data[i].bias < 0){
      fBiasDiseasesL.push(i);
    }
  }
  var fBiasDiseasesR = fBiasDiseasesL.slice();
  
  var yScale =  d3.scaleBand()
    .domain(diseases)
    .range([height-listMargin.bottom, listMargin.top]);
  var yAxisL = leftSvg.append("g")
    .attr("transform", "translate(" + xScale(0) + ",0)")
    .call(d3.axisLeft().scale(yScale));
  var yAxisR = leftSvg.append("g")
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
	
  var bars = leftSvg.selectAll("rect.bar")
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
        showDiseaseTooltip(d.uid, listMargin.left, d3.event.pageY);
      })
      .on('mouseout', function(d) { hideDiseaseTooltip(); })
      .on('dblclick', function(d) {
        rootMesh = d.uid;
        topPlot = TREE_PLOT;
        updateSelectedMesh(getSubtreeMesh(rootMesh));
        })
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