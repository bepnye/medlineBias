var meshLookup = new Map();
var articleLookup = new Map();
var meshNameToUid = new Map();

function getSubtreeMesh(root) {
  var queue = [root];
  // Get ids for all the subtree mesh terms
  var subMesh = new Set();
  while (queue.length > 0) {
    var m = queue.shift();
    subMesh.add(m);
    meshLookup.get(m).children.forEach(function(c) {
      if (meshLookup.has(c)) {
        queue.push(meshLookup.get(c).uid);
      }
    });
  }
  return Array.from(subMesh);
}

console.log('building _meshData');
_meshData.forEach(function(m) {
  m.children = m.children.filter(function(c) { return c != ""; });
  m.treeTypes = new Set();
  m.treepos.forEach(function(t) { m.treeTypes.add(t[0]); });
  meshLookup.set(m.uid, m);
  meshNameToUid.set(m.name, m.uid);
});
console.log('building _articleData');
_articleData.forEach(function(a) {
  a.mesh = a.mesh.map(function (m) { return meshNameToUid.get(m); });
  a.mesh = a.mesh.filter(function (m) { return m; });
	articleLookup.set(a.pmid, a);
});
console.log('mapping mesh pmids');
_meshToArticles.forEach(function(d) {
  meshLookup.get(d.uid).pmids = d.pmids.filter(function (p) { return p != "" && articleLookup.has(p); });
});
console.log('adding parents');
_meshData.forEach(function(m) {
  mesh = meshLookup.get(m.uid);
  mesh.children.forEach(function (c) {
    var child = meshLookup.get(c);
    child.source = m.uid;
  });
});
console.log('computing subtrees');
_meshData.forEach(function(m) {
  mesh = meshLookup.get(m.uid);
  var subPmids = new Set(mesh.pmids);
  mesh.subs = getSubtreeMesh(m.uid);
  mesh.subs.forEach(function(d) {
    meshLookup.get(d).pmids.forEach(function(p) {
      subPmids.add(p);
    });
  });
  mesh.subPmids = Array.from(subPmids);
  mesh.selectedPmids = mesh.subPmids.slice();
});
console.log('done');
console.log(meshLookup);
console.log(articleLookup);

var MIN_ARTS = 50;

var allMesh = new Set(Array.from(meshLookup.keys()).filter(function(m) { return meshLookup.get(m).subPmids.length > 50;}));
var allArticles = new Set(Array.from(articleLookup.keys()));

var rootMesh = 'D0';
var selectedMesh = new Set(allMesh);
var selectedArticles = new Set(allArticles);

// Unique ids for checking which plot is active
var TREE_PLOT = 0;
var LIST_PLOT = 1;
var TIME_PLOT = 2;
var MAP_PLOT = 4;

var topPlot = TREE_PLOT;
var bottomPlot = TIME_PLOT;

var treeData;
var meshData;
var yearData;
var countryData;

var filters = [];

function getBiasFromLabels(labels) {
  if (labels.length == 0) { return 0.0; }
	var nF = 0.0;
	var nM = 0.0;
	labels.forEach(function(l) {
    switch (l) {
      case 'M': nM += 1.0; break;
      case 'F': nF += 1.0; break;
      case 'X': nM += 0.5;
                nF += 0.5; break;
      default: ; break;
    }
	});
  //return Math.log(nM/nF);
  //return nM/(nM+nF) - nF/(nM+nF);
  return Math.tanh(3.0*((nM-nF)/(nM+nF)));
}

function getBiasFromPmids(pmids) {
  var labels = pmids.map(function (p) { return articleLookup.get(p).label; });
  return getBiasFromLabels(labels);
}

function updateMeshBias() {
  console.log('Updating mesh bias...');
  meshLookup.forEach(function(m, ui, map) {
    m.bias = getBiasFromPmids(m.selectedPmids);
  });
  console.log('done!');
};

function computeYearData() {
  console.log('Computing year data...');
  var yearData = new Map();
  selectedArticles.forEach(function(a,a,set) {
    var article = articleLookup.get(a);
    var y = article.date;
    if (!yearData.has(y)) {
      yearData.set(y, { 'pmids': [], 'year': y });
    }
    yearData.get(y).pmids.push(article.pmid);
  });
  var years = Array.from(yearData.keys());
  years.forEach(function(y) {
    yearData.get(y).bias = getBiasFromPmids(yearData.get(y).pmids);
  });
  console.log('done!');
  return Array.from(yearData.values());
}

function computeCountryData() {
  console.log('Computing country data...');
	var countryData = new Map();
  selectedArticles.forEach(function(a,a,set) {
    var article = articleLookup.get(a);
    var c = countryDict[article.country];
    if (!countryData.has(c)) {
      countryData.set(c, { 'pmids': [], 'names': new Set() });
    }
    countryData.get(c).pmids.push(article.pmid);
    countryData.get(c).names.add(article.country);
  });
  Array.from(countryData.keys()).forEach(function(c) {
    countryData.get(c).bias = getBiasFromPmids(countryData.get(c).pmids);
  });
  console.log('done!');
  return countryData;
}

function computeMeshData() {
  console.log('Computing mesh data...');
  var meshData = [];
  selectedMesh.forEach(function(m,m,set) {
    meshData.push(meshLookup.get(m));
  });
  console.log('done!');
  return meshData;
}

function computeAllData() {
  updateMeshBias();
  treeData = computeTreeData();
  meshData = computeMeshData();
  yearData = computeYearData();
  countryData = computeCountryData();
}

function setRootMesh() {
  var meshName = document.getElementById("meshNode").value;
  if (!meshNameToUid.has(meshName)) {
    alert('No matching mesh found ('+meshName+')');
  } else {
    // Look up the id for the new mesh name
    rootMesh = meshNameToUid.get(meshName);
    // Get ids for all the subtree mesh terms
    updateSelectedMesh(getSubtreeMesh(rootMesh));
  }
}

function setParentRoot() {
  var source = meshLookup.get(rootMesh).source;
  if (source) {
    rootMesh = source;
  } else {
    rootMesh = 'D0';
  }
  treeData = computeTreeData();
  drawTree();
}

function selectCountries(countryId) {
}

function addFilter(target, desc, fn) {
  var newFilter = {
    'target': target,
    'desc': desc,
    'fn': fn
  }
  filters.push(newFilter);
  var button = document.createElement("input");
  button.type = "button";
  button.id = desc;
  button.value = desc;
  button.addEventListener('click', function() { removeFilter(this); });
  document.getElementById("topBar").appendChild(button);
  computeSelection();
}

function removeFilter(button) {
  button.parentNode.removeChild(button);
  filters = filters.filter(function(f) { return f.desc != button.value; });
  computeSelection();
}

function addYearFilter(dateRange) {
  console.log('adding filter for', dateRange);
  addFilter('articles', 'Years '+dateRange[0]+' to '+dateRange[1], function (a) { return dateRange[0] <= a.date && a.date <= dateRange[1]; });
}

function addCountryFilter(countryId, inclusion) {
  var fn;
  var desc = countryNameLookup.get(countryId);
  if (inclusion == true) {
    fn = function (a) { return countryDict[a.country] == countryId; }
    desc += ' only';
  } else {
    fn = function (a) { return countryDict[a.country] != countryId; }
    desc += ' excluded';
  }
  addFilter('articles', desc, fn);
}

function addMeshFilter(uid, inclusion) {
  var target;
  var fn;
  var desc = meshLookup.get(uid).name;
  if (inclusion == true) {
    target = 'mesh'
    fn = function(m) { return meshLookup.get(uid).subs.indexOf(m.uid) >= 0; }
    desc += ' only';
  } else {
    target = 'mesh'
    //fn = function(a) { return a.mesh.indexOf(uid) < 0; }
    fn = function(m) { return meshLookup.get(uid).subs.indexOf(m.uid) < 0; }
    desc += ' excluded';
  }
  addFilter(target, desc, fn);
}

function computeSelection() {
  var newArticles = [];
  var newMesh = [];
  allArticles.forEach(function (a,a,set) { newArticles.push(articleLookup.get(a)); });
  allMesh.forEach(function (m,m,set) { newMesh.push(meshLookup.get(m)); });
  filters.forEach(function (f) {
    console.log(f);
    if (f.target == 'articles') {
      newArticles = newArticles.filter(f.fn);
    } else if (f.target == 'mesh') {
      newMesh = newMesh.filter(f.fn);
    }
  });
  newPmids = new Set(newArticles.map(function(a) { return a.pmid; }));
  newMesh.forEach(function (m) {
    m.selectedPmids = m.subPmids.filter(function (p) { return newPmids.has(p); });
  });
  newMesh = newMesh.filter(function (m) { return m.selectedPmids.length > 50; });
  selectedMesh = new Set(newMesh.map(function(m) { return m.uid; }));
  
  selectedArticles = new Set();
  newMesh.forEach(function(m) {
    m.selectedPmids.forEach(function (p) {
      if (newPmids.has(p)) {
        selectedArticles.add(p);
      }
    });
    m.selectedSubs = m.subs.filter(function(s) { return selectedMesh.has(s); });
  });

  document.getElementById('filterStats').innerHTML = '['+selectedArticles.size+' Articles] ['+selectedMesh.size+' Mesh] Current filters: ';
  computeAllData();
  refreshPlots();
}

function refreshPlots() {
  if (topPlot == TREE_PLOT) {
    drawTree();
  } else {
    drawList();
  }
  if (bottomPlot == TIME_PLOT) {
    drawTime();
  } else {
    drawMap();
  }
  drawToolbar();
}

function resetData() {
  rootMesh = 'D0';
  selectedMesh = new Set(allMesh);
  selectedArticles = new Set(allArticles);
  computeAllData();
  hideDiseaseTooltip();
  hideCountryTooltip();
  refreshPlots();
}

function resetCountry() {
  selectedCountry = null;
}

function drawTree() {
  d3.select("#listDropdownText").style("visibility", "hidden")
  d3.select("#listDropdown").style("visibility", "hidden")
  d3.select("#parentRoot").style("visibility", "visible")
  topPlot = TREE_PLOT;
  document.getElementById("treeButton").checked = true;
  drawTreeData();
}
function drawList() {
  d3.select("#listDropdownText").style("visibility", "visible")
  d3.select("#listDropdown").style("visibility", "visible")
  d3.select("#parentRoot").style("visibility", "hidden")
  topPlot = LIST_PLOT;
  document.getElementById("listButton").checked = true;
  drawMeshData();
}
function drawTime() {
  bottomPlot = TIME_PLOT;
  document.getElementById("timeButton").checked = true;
  drawYearData();
}
function drawMap() {
  bottomPlot = MAP_PLOT;
  document.getElementById("mapButton").checked = true;
  drawCountryData();
}

function showDiseaseTooltip(mesh, x, y) {
  if (meshLookup.has(mesh)) {
    var m = meshLookup.get(mesh);
    d3.select("#tooltip1")
      .style("visibility", "visible")
      .html('<b>'+m.name+'</b><br>'+
            'Articles: '+m.selectedPmids.length+'<br>'+
            'Tree Size: '+m.selectedSubs.length)
      .style("left", x + "px")
      .style("top", y + "px");
  }
  else {
    console.log('no tooltip for', mesh);
  }
}

function hideDiseaseTooltip() {
  d3.select("#tooltip1")
    .style("visibility", "hidden");
}

function showCountryTooltip(country, x, y) {
  if (countryData.has(country)) {
    var c = countryData.get(country);
    d3.select("#tooltip2")
      .style("visibility", "visible")
      .html('<b>'+countryNameLookup.get(country)+'</b><br>'+'Articles: '+c.pmids.length)
      .style("left", x + "px")
      .style("top", y + "px");
  }
  else {
    console.log('no tooltip for', c);
  }
}

function hideCountryTooltip() {
  d3.select("#tooltip2")
    .style("visibility", "hidden");
}

function init() {
	console.log('initializing...');
  drawToolbar();
  computeSelection();
}

//console.log(articleData);
