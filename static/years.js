var lDate, rDate;
var time_range;

var xScale;
var yScale;

var timeBrush = d3.brushX()
  .extent([[margin.left, margin.top], [width-margin.right, height-margin.bottom]])
  .on("brush", display_dates)
  .on("end", brushed_time);

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

	xScale = d3.scaleLinear().range([margin.left, width-margin.right]);
	yScale = d3.scaleLinear().range([height-margin.bottom, margin.top]);
  
  xScale.domain(d3.extent(data, function(d) { return d.year; }));
  yScale.domain([-1,1]);

  var biasLine = d3.line()
      .x(function(d) { return xScale(d.year); })
      .y(function(d) { return yScale(d.bias); });

  bottomSvg.append("path")
    .data([data])
    .attr("fill", "none")
    .attr("stroke", 'black')
    .attr("stroke-width", 1.5)
    .attr("d", biasLine);
	
  var xAxis = bottomSvg.append("g")
		.attr("transform", "translate(0," +(height-margin.bottom) + ")")
		.call(d3.axisBottom().scale(xScale));
		
	var yAxis = bottomSvg.append("g")
		.attr("transform", "translate(" + margin.left + ",0)")
		.call(d3.axisLeft().scale(yScale));

	bottomSvg.append("text")
			 .text("Bias Score")
			 .attr("text-anchor", "middle")
			 .attr("transform", "translate(20," + (((height-margin.top-margin.bottom) / 2)+margin.top) + ") rotate(-90)");

	bottomSvg.append("text")
			 .text("Year")
			 .attr("text-anchor", "middle")
			 .attr("transform", "translate(" + (((width - margin.left - margin.right) / 2) + margin.left) + "," + height + ")")
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
      .text(xScale.invert(s[0]))
      .attr("fill", "slategray")
      .attr("text-anchor", "start")
      .attr("transform", "translate(" + s[0] + "," + (((height-margin.top-margin.bottom) / 2)+margin.top) + ")");
    rDate = bottomSvg.append("text")
      .text(xScale.invert(s[1]))
      .attr("fill", "slategray")
      .attr("text-anchor", "end")
      .attr("transform", "translate(" + s[1] + "," + (((height-margin.top-margin.bottom) / 2)+margin.top) + ")");
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
  time_range[0] = time_range[0];
  time_range[1] = time_range[1];
}
