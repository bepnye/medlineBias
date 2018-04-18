function drawToolbar(){
	toolbarSvg.selectAll('*').remove();
	
	var margin = {right: 30, left: 30};
	var width = document.getElementById("toolBar_div").clientWidth-margin.right-margin.left;
	
	var linearGradient = toolbarSvg.append("defs")
		.append("linearGradient")
		.attr("id", "linear-gradient")
		.attr("x1", "0%")
		.attr("y1", "0%")
		.attr("x2", "100%")
		.attr("y2", "0%");
	var stops = [];
	for (var i = -100; i <= 100; i++) {
		stops.push(i*0.01);
	}
	linearGradient.selectAll("stop")
		.data(stops)
		.enter()
		.append("stop")
		.attr("offset", function(d) { return (d/2)+0.5; })
		.attr("stop-color", function(d) { return colorMap(d); });
	toolbarSvg.append("rect")
		.attr("width", width)
		.attr("height", 20)
		.attr("transform", "translate(" + margin.left + ",0)")
		.style("fill", "url(#linear-gradient)");
		
	var labelScale = d3.scaleOrdinal()
		.domain(["Female Bias", "No Bias", "Male Bias"])
		.range([0,width/2,width]);
	var xAxis = toolbarSvg.append("g")
		.attr("transform", "translate(" + margin.left + "," + 20 + ")")
		.call(d3.axisBottom().scale(labelScale));
}
