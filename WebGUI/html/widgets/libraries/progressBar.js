var options = {
  className:'.d3-progress',
  height:20,
  width:200,
  progressStartWidth:0,
  progressEndWidth:200,
  barColor:'black',
  progressColor:'tomato',
  animationDuration:2000
};
function renderProgressBar( options ){
  var progress = d3.select(options.className)
				  .append("svg")
					.attr("width",options.width)
					.attr("height",options.height);
  progress.append("rect")
		  .attr("class","progressBar")
		  .attr("width",options.width)
		  .attr("height",options.height/2)
		  .style("fill",options.barColor);
  animateProgressBar(progress,options);
  return progress;
}
function animateProgressBar( element, options){
  d3.selectAll(options.className + " .progress").remove();
   d3.selectAll(options.className + " text").remove();
  element.append("rect")
		  .attr("class","progress")
		  .attr("height",options.height/2)
		  .style("fill",options.progressColor)
		  .attr("width",options.progressStartWidth)
		  .transition()
		  .duration(options.animationDuration)
		  .ease("bounce")
		  .attr("width",options.progressEndWidth);
  element.append("text")
		  .attr("y",options.height)
		  .style("text-anchor","middle")
		  .text("▲")
		  .attr("x",options.progressStartWidth)
		  .transition()
		  .duration(options.animationDuration)
		  .ease("bounce")
		  .attr("x",options.progressEndWidth);
}

var _progress = renderProgressBar(options);

setInterval(function(){ options.progressStartWidth = options.progressEndWidth; options.progressEndWidth = Math.floor((Math.random() * options.width) ); animateProgressBar(_progress,options);},2000);
