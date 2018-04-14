function drawToolbar(){
	var margin = {right: 50, left: 50};
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
	console.log(stops)
	linearGradient.selectAll("stop")
		.data(stops)
		.enter()
		.append("stop")
		.attr("offset", function(d) { return (d/2)+0.5; })
		.attr("stop-color", function(d) { return colorMap(d); });
	/*linearGradient.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", colorMap(-1));
	linearGradient.append("stop")
		.attr("offset", "25%")
		.attr("stop-color", colorMap(-0.5));
	linearGradient.append("stop")
		.attr("offset", "50%")
		.attr("stop-color", colorMap(0));
	linearGradient.append("stop")
		.attr("offset", "75%")
		.attr("stop-color", colorMap(0.5));
	linearGradient.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", colorMap(1));*/
	toolbarSvg.append("rect")
		.attr("width", width/4)
		.attr("height", 20)
		.attr("transform", "translate(" + margin.left + ",0)")
		.style("fill", "url(#linear-gradient)");
		
	var labelScale = d3.scaleOrdinal()
		.domain(["Female Bias", "No Bias", "Male Bias"])
		.range([0,width/8,width/4]);
	var xAxis = toolbarSvg.append("g")
		.attr("transform", "translate(" + margin.left + "," + 20 + ")")
		.call(d3.axisBottom().scale(labelScale));
}