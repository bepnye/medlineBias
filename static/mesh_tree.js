var i = 0,
		duration = 300,
		root,
		treemap;

var meshToNode = function(source, m) {
  var node = {
    'bias': m.bias,
    'name': m.name,
    'uid': m.uid,
    'size': m.selectedSubs.length,
    'selected': selectedMesh.has(m.uid),
    'children': [],
  }
  m.children.forEach(function(child) {
    node.children.push(meshToNode(node, meshLookup.get(child)));
  });
  return node;
}

function computeTreeData() {
  treeData = meshToNode({'name': null}, meshLookup.get(rootMesh));

	return treeData;
}

function drawTreeData() {

  leftSvg.selectAll('*').remove();
  
  d3.select("#orderRadio").style("visibility", "hidden")

  var height = 600;
  var width = 3000 - margin.left - margin.right;
  leftSvg.attr('width', width);
  leftSvg.attr('height', height);
	// declares a tree layout and assigns the size
	treemap = d3.tree().size([height, width]);

	// Assigns parent, children, height, depth
	root = d3.hierarchy(treeData, function(d) { return d.children; });
	root.x0 = height / 2;
	root.y0 = 0;
  root.parent = {'data': {'size': root.data.size } };

	// Collapse after the second level
	if(root.children){
	  root.children.forEach(collapse);
	}
	update(root);
}

// Collapse the node and all it's children
function collapse(d) {
  if(d.children) {
    d._children = d.children
    d._children.forEach(collapse)
    d.children = null
  }
}

function update(source) {

  // Assigns the x and y position for the nodes
  var treeData = treemap(root);

  // Compute the new tree layout.
  var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);

  // Normalize for fixed-depth.
  //nodes.forEach(function(d){ d.y = d.depth * 180 + 50});
  var rootSize = root.data.size;
  nodes.forEach(function(d){ d.y = 150 + d.depth*220; });

  // ****************** Nodes section ***************************

  // Update the nodes...
  var node = leftSvg.selectAll('g.node')
      .data(nodes, function(d) {return d.id || (d.id = ++i); });

  // Enter any new modes at the parent's previous position.
  var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr("transform", function(d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on('click', click)
    .on('mouseenter', function(d) {
      showDiseaseTooltip(d.data.uid, d3.event.pageX+15, d3.event.pageY-25);
    })
    .on('mouseout', function(d) {
      hideDiseaseTooltip();
    });

  // Add Circle for the nodes
  nodeEnter.append('circle')
      .attr('class', 'node')
      .attr('r', 1e-6)
      .style("fill", function(d) {
          //return d._children ? "lightsteelblue" : "#fff";
          return colorMap(d.data.bias);
      })
      .style('stroke-width', 1)
      .style('stroke', function(d) {
          return d._children ? "black" : "#fff";
      });

  var getNodeRadius = function (d) {
    if (d.data.selected) {
      return 5+15*d.data.size/d.parent.data.size;
    } else {
      return 5;
    }
  };

  var getNodeText = function (d) {
    return d.data.name;
  };

  // Add labels for the nodes
  nodeEnter.append('text')
      .attr("dy", ".35em")
      .attr("x", function(d) {
          return d.children || d._children ? -1*getNodeRadius(d)-4 : getNodeRadius(d)+4;
      })
      .attr("text-anchor", function(d) {
          return d.children || d._children ? "end" : "start";
      })
      .text(getNodeText)
      .style('fill', function(d) {
        return d.data.selected ? 'black' : 'DimGray';
      })

  // UPDATE
  var nodeUpdate = nodeEnter.merge(node);

  // Transition to the proper position for the node
  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", function(d) { 
        return "translate(" + d.y + "," + d.x + ")";
     });

  // Update the node attributes and style
  nodeUpdate.select('circle.node')
    .attr('r', getNodeRadius)
    .style("fill", function(d) {
        return colorMap(d.data.bias);
    })
    .style('stroke', function(d) {
        return d._children ? "black" : "#fff";
    })
    .attr('cursor', 'pointer');


  // Remove any exiting nodes
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
          return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

  // On exit reduce the node circles size to 0
  nodeExit.select('circle')
    .attr('r', 1e-6);

  // On exit reduce the opacity of text labels
  nodeExit.select('text')
    .style('fill-opacity', 1e-6);

  // ****************** links section ***************************

  // Update the links...
  var link = leftSvg.selectAll('path.link')
      .data(links, function(d) { return d.id; });

  // Enter any new links at the parent's previous position.
  var linkEnter = link.enter().insert('path', "g")
      .attr("class", "link")
      .attr('d', function(d){
        var o = {x: source.x0, y: source.y0}
        return diagonal(o, o)
      });

  // UPDATE
  var linkUpdate = linkEnter.merge(link);

  // Transition back to the parent element position
  linkUpdate.transition()
      .duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

  // Remove any exiting links
  var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();

  // Store the old positions for transition.
  nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });

  // Creates a curved (diagonal) path from parent to the child nodes
  function diagonal(s, d) {

    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

    return path
  }

  // Toggle children on click.
  function click(d) {
    if (d3.event.shiftKey) {
      rootMesh = d.data.uid;
      addMeshFilter(d.data.uid, true);
    } else if (d3.event.altKey) {
      addMeshFilter(d.data.uid, false);
    } else {
      if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
      update(d);
    }
  }

  function doubleclick(d) {
  }
}
