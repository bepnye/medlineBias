var lDate, rDate;
var time_range;

var xScale;
var yScaleYear;

var yearMargin = {top : 20,
              bottom: 40,
              left : 50,
              right: 60};

var timeBrush = d3.brushX()
  .extent([[yearMargin.left, yearMargin.top], [width-yearMargin.right, height-yearMargin.bottom]])
  .on("brush", display_dates)
  .on("end", brushed_time);

function roundDate(date){
  //average 365.2425 days in a year over full leap year cycle
  return Math.round(date/(1000*60*60*24*365.2425))+1970
}
  
function drawYearData() {

  rightSvg.selectAll('*').remove();
  rightSvg.call(d3.zoom().on("zoom", null));
  rightSvg.attr("transform", d3.zoomIdentity);
  rightSvg.append("g").call(timeBrush);
  
  var height = 600 - margin.top - margin.bottom;
  var width = document.getElementById("right_div").clientWidth*0.95;
  rightSvg.attr('width', width);
  rightSvg.attr('height', height);

  var data = [];
  yearData.forEach(function(d) {
    data.push({
      'year': parseInt(d.year),
      'bias': parseFloat(d.bias),
	  'art' : d.pmids.length
      }
    );
  });
  
  data.sort(function(a,b) {return a.year-b.year; });

	xScale = d3.scaleTime().range([yearMargin.left, width-yearMargin.right]);
	yScaleYear = d3.scaleLinear().range([height-yearMargin.bottom, yearMargin.top]);
	yScaleArt = d3.scaleLinear().range([height-yearMargin.bottom, yearMargin.top]);
  
  time_range = d3.extent(data, function(d) { return d.year; });
  xScale.domain([new Date(time_range[0], 0, 0), new Date(time_range[1], 0, 0)]);
  yScaleYear.domain([-1,1]);
  yScaleArt.domain([0, d3.extent(data, function(d) { return d.art })[1]]);

  var barWidth = 8;
  var bars = rightSvg.selectAll("rect.bar")
     .data(data)
     .enter()
     .append("rect")
          .attr("x", function(d) {
			  if(d.year == time_range[0]){
				  return xScale(new Date(d.year, 0, 0));
			  }else{
			      return xScale(new Date(d.year, 0, 0)) - barWidth/2;
			  }
          })
          .attr("y", function(d) {return yScaleArt(d.art); })
          .attr("width", function(d) {
			  if(d.year == time_range[0] || d.year == time_range[1]){
				  return barWidth/2;
			  }else{
				  return barWidth;
		  };})
          .attr("height", function(d) {
               return height - yearMargin.bottom - yScaleArt(d.art);
          })
          .attr("fill", "lightgray")
		  .style("opacity", 0.5);
  
  var biasLine = d3.line()
      .x(function(d) { return xScale(new Date(d.year, 0, 0)); })
      .y(function(d) { return yScaleYear(d.bias); });
  
  rightSvg.append("path")
    .data([data])
    .attr("fill", "none")
    .attr("stroke", 'black')
    .attr("stroke-width", 1.5)
    .attr("d", biasLine);
  
  var zeroLine = d3.line()
    .x(function(d, i) { return xScale(xScale.domain()[i]); })
    .y(function(d, i) { return yScaleYear(d); });
  
  rightSvg.append("path")
      .data([[0,0]])
      .attr("d", zeroLine)
      .attr("fill", "none")
      .attr("stroke", "lightgray")
      .attr("stroke-linecap", "butt")
      .attr("stroke-dasharray", ("10,3"))
      .attr("stroke-width", 1);
	
  var xAxis = rightSvg.append("g")
		.attr("transform", "translate(0," +(height-yearMargin.bottom) + ")")
		.call(d3.axisBottom().scale(xScale));
		
	var yAxisYear = rightSvg.append("g")
		.attr("transform", "translate(" + yearMargin.left + ",0)")
		.call(d3.axisLeft().scale(yScaleYear));
		
	var yAxisArt = rightSvg.append("g")
		.attr("transform", "translate(" + (width - yearMargin.right) + ",0)")
		.call(d3.axisRight().scale(yScaleArt));

	rightSvg.append("text")
			 .text("Bias Score")
			 .attr("text-anchor", "middle")
			 .attr("transform", "translate(20," + (((height-yearMargin.top-yearMargin.bottom) / 2)+yearMargin.top) + ") rotate(-90)");

	rightSvg.append("text")
			 .text("Number of Articles")
			 .attr("text-anchor", "middle")
			 .attr("transform", "translate(" + (width-15) + "," + (((height-yearMargin.top-yearMargin.bottom) / 2)+yearMargin.top) + ") rotate(90)");		 
	
	rightSvg.append("text")
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
    lDate = rightSvg.append("text")
      .text(roundDate(xScale.invert(s[0])))
      .attr("fill", "slategray")
      .attr("text-anchor", "start")
      .attr("transform", "translate(" + s[0] + "," + (((height-yearMargin.top-yearMargin.bottom) / 2)+yearMargin.top) + ")");
    rDate = rightSvg.append("text")
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
