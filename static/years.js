var lDate, rDate;
var time_range;

var xScale;
var yScale;

var yearMargin = {top : 20,
              bottom: 40,
              left : 50,
              right: 20};

var timeBrush = d3.brushX()
  .extent([[yearMargin.left, yearMargin.top], [width-yearMargin.right, height-yearMargin.bottom]])
  .on("brush", display_dates)
  .on("end", brushed_time);

function roundDate(date){
  //average 365.2425 days in a year over full leap year cycle
  return Math.round(date/(1000*60*60*24*365.2425))+1970
}
  
function drawYearData() {

  bottomSvg.selectAll('*').remove();
  bottomSvg.append("g").call(timeBrush);

  var data = [];
  yearData.forEach(function(d) {
    data.push({
      'year': parseInt(d.year),
      'bias': parseFloat(d.bias),
      }
    );
  });
  data.sort(function(a,b) {return a.year-b.year; });

	xScale = d3.scaleTime().range([yearMargin.left, width-yearMargin.right]);
	yScale = d3.scaleLinear().range([height-yearMargin.bottom, yearMargin.top]);
  
  var extent = d3.extent(data, function(d) { return d.year; });
  xScale.domain([new Date(extent[0], 0, 0), new Date(extent[1], 0, 0)]);
  yScale.domain([-1,1]);

  var biasLine = d3.line()
      .x(function(d) { return xScale(new Date(d.year, 0, 0)); })
      .y(function(d) { return yScale(d.bias); });
  
  bottomSvg.append("path")
    .data([data])
    .attr("fill", "none")
    .attr("stroke", 'black')
    .attr("stroke-width", 1.5)
    .attr("d", biasLine);
  
  var zeroLine = d3.line()
    .x(function(d, i) { return xScale(xScale.domain()[i]); })
    .y(function(d, i) { return yScale(d); });
  
  bottomSvg.append("path")
      .data([[0,0]])
      .attr("d", zeroLine)
      .attr("fill", "none")
      .attr("stroke", "lightgray")
      .attr("stroke-linecap", "butt")
      .attr("stroke-dasharray", ("10,3"))
      .attr("stroke-width", 1);
	
  var xAxis = bottomSvg.append("g")
		.attr("transform", "translate(0," +(height-yearMargin.bottom) + ")")
		.call(d3.axisBottom().scale(xScale));
		
	var yAxis = bottomSvg.append("g")
		.attr("transform", "translate(" + yearMargin.left + ",0)")
		.call(d3.axisLeft().scale(yScale));

	bottomSvg.append("text")
			 .text("Bias Score")
			 .attr("text-anchor", "middle")
			 .attr("transform", "translate(20," + (((height-yearMargin.top-yearMargin.bottom) / 2)+yearMargin.top) + ") rotate(-90)");

	bottomSvg.append("text")
			 .text("Year")
			 .attr("text-anchor", "middle")
			 .attr("transform", "translate(" + (((width - yearMargin.left - yearMargin.right) / 2) + yearMargin.left) + "," + height + ")")
}


function display_dates(){
  if (bottomPlot != TIME_PLOT) { return; }
  if(lDate){
    lDate.remove();
  }
  if(rDate){
    rDate.remove()
  }
  var s = d3.event.selection;
  if(s){
    lDate = bottomSvg.append("text")
      .text(roundDate(xScale.invert(s[0])))
      .attr("fill", "slategray")
      .attr("text-anchor", "start")
      .attr("transform", "translate(" + s[0] + "," + (((height-yearMargin.top-yearMargin.bottom) / 2)+yearMargin.top) + ")");
    rDate = bottomSvg.append("text")
      .text(roundDate(xScale.invert(s[1])))
      .attr("fill", "slategray")
      .attr("text-anchor", "end")
      .attr("transform", "translate(" + s[1] + "," + (((height-yearMargin.top-yearMargin.bottom) / 2)+yearMargin.top) + ")");
  }
}

function brushed_time(){
  if (bottomPlot != TIME_PLOT) { return; }
  var s = d3.event.selection;
  if(!s){
    if(lDate){
      lDate.remove();
    }
    if(rDate){
      rDate.remove();
    }
    time_range = xScale.domain();
  } else{
    time_range = [xScale.invert(s[0]), xScale.invert(s[1])];
  }
  time_range[0] = roundDate(time_range[0]);
  time_range[1] = roundDate(time_range[1]);
  newSelectedArticles = [];
  yearData.forEach(function(d) {
    if (time_range[0] <= d.year && d.year <= time_range[1]) {
      newSelectedArticles = newSelectedArticles.concat(d.pmids);
    }
  });
  updateSelectedArticles(newSelectedArticles);
}
