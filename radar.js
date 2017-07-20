/*
 * Build a radar chart.
 */

import * as d3 from 'd3';

export default function(config) {
  function Radar(config) {
    var vm = this;

    vm.CIRCLE_RADIANS = 2 * Math.PI;

    // The first axis must be at the circle's top.
    vm.RADIANS_TO_ROTATE = vm.CIRCLE_RADIANS / -4;

    vm.DEFAULT_TRANSOTION_DURATION = 400;

    vm._config = config ? config : {};
    vm._data = [];
    vm._scales = {};
    vm._axes = {};
    vm._axesData = {};
    vm._filter = null;
    vm._minMax = [0, 0];
    vm._viewData = [];
    vm._colorMap = [];

    // Set defaults.
    if(!vm._config.levels) {
      vm._config.levels = 5;
    }

    if(!vm._config.transitionDuration) {
      vm._config.transitionDuration = vm.DEFAULT_TRANSOTION_DURATION;
    }

    // Calculate basic data.
    vm._center = {
      x: vm._config.size.width / 2,
      y: vm._config.size.height / 2
    };
    vm._radius = Math.min(
      vm._config.size.width / 2,
      vm._config.size.height / 2
    );
    console.log(vm);
  }

  // User API.

  Radar.prototype.polygonsFrom = function(column) {
    var vm = this;
    vm._config.polygonsFrom = column;
    return vm;
  }

  Radar.prototype.axesFrom = function(column) {
    var vm = this;
    vm._config.axesFrom = column;
    return vm;
  }

  Radar.prototype.valuesFrom = function(column) {
    var vm = this;
    vm._config.valuesFrom = column;
    return vm;
  }

  Radar.prototype.levels = function(levels) {
    var vm = this;
    vm._config.levels = levels;
    return vm;
  }

  Radar.prototype.colors = function(colors) {
    var vm = this;
    vm._config.colors = colors;
    return vm;
  }

  Radar.prototype.end = function() {
    var vm = this;
    return vm._chart;
  }

  // Internal helpers.

  Radar.prototype.drawLevels = function() {
    var vm = this,
      svg = vm._chart._svg,
      levelLength = vm._radius / vm._config.levels,
      levels = [];

    for(var i = 0, lv = 0; i < vm._config.levels; i++) {
      lv += levelLength;
      levels.push(lv);
    }

    console.log(levels);

    svg.selectAll('circle.level')
      .data(levels)
      .enter()
      .append('circle')
      .classed('level', true)
      .attr('r', function(d) { return d; })
      .attr('cx', function(d) { return vm._center.x })
      .attr('cy', function(d) { return vm._center.y })
      .style('fill', 'none')
      .style('stroke', 'gray');
  }

  Radar.prototype.extractAxes = function(data) {
    var result,
      vm = this,
      axes = vm._config.axesFrom,
      radiansPerAxis;

    result = data.reduce(
      function(prev, item) {
        return prev.indexOf(item[axes]) > -1
          ? prev
          : prev.concat(item[axes]);
      }, []);

    radiansPerAxis = (vm.CIRCLE_RADIANS / result.length);

    result = result.map(
      function(item, idx, arr) {
        return {
          axis: item,
          rads: (idx * radiansPerAxis) + vm.RADIANS_TO_ROTATE
        };
      });

    return {
      list: result,
      hash: result.reduce(function(hashed, el) {
        hashed[el.axis] = el;
        return hashed;
      }, {})
    };
  }

  Radar.prototype.buildColorMap = function(data) {
    var vm = this,
      colros = vm._config.colors;
    return data.reduce(function(cMap, row, idx) {
      var polyg = row[vm._config.polygonsFrom],
        cIdx = cMap.index.indexOf(polyg);

      if(cIdx == -1) {
        cIdx = cMap.index.push(polyg) - 1;
        cMap.hash[polyg] = colors[cIdx];
      }
      return cMap;
    }, {index: [], hash: {}}).hash;
  }

  Radar.prototype.drawAxes = function() {
    var vm = this,
      svg = vm._chart._svg,
      duration = vm._config.transitionDuration,
      selection;

    console.log(vm._axesData);
    selection = svg.selectAll('line.axis')
      .data(vm._axesData.list, function(d) { return d.axis; });

    selection.enter()
      .append('line')
      .classed('axis', true)
      .attr('x1', vm._center.x)
      .attr('y1', vm._center.y)
      .style('stroke', 'gray')
      .attr('x2', vm._center.x)
      .attr('y2', vm._center.y)
      .transition()
      .duration(duration)
      .attr('x2', function(d, i) {
        return vm.xOf(d.rads, vm._radius + 8);
      })
      .attr('y2', function(d, i) {
        return vm.yOf(d.rads, vm._radius + 8);
      });

    selection
      .transition()
      .duration(duration)
      .attr('x2', function(d, i) {
        return vm.xOf(d.rads, vm._radius + 8);
      })
      .attr('y2', function(d, i) {
        return vm.yOf(d.rads, vm._radius + 8);
      });

    selection.exit()
      .transition()
      .duration(duration)
      .attr('x2', vm._center.x)
      .attr('y2', vm._center.y)
      .remove();
  }

  Radar.prototype.drawPolygons = function() {
    var vm = this,
      data = vm._viewData,
      svg = vm._chart._svg,
      duration = vm._config.transitionDuration,
      groupedData, selection,
      gs, gsExit, gsEnter;;

    // Prepare the data.
    groupedData = data.reduce(function(bundle, row, idx) {
      var polygIdx = bundle.keys.indexOf(row.polygon);
      if(polygIdx == -1) {
        polygIdx = bundle.keys.push(row.polygon) - 1;
        bundle.polygons.push({
          polygon: row.polygon,
          color: row.color,
          points: [],
          values: []
        });
      }
      bundle.polygons[polygIdx].values.push(row);
      bundle.polygons[polygIdx].points.push(row.xy.join(','));
      return bundle;
    }, {keys: [], polygons:[]}).polygons;

    gs = svg.selectAll('g.polygon-container')
      .data(groupedData, function(d) { return d.polygon + '-container'; });

    gsEnter = gs.enter()
      .append('g')
      .attr('class', 'polygon-container');

    gsExit = gs.exit();
    gsExit.transition().duration(duration).remove();

    vm._buildNestedVertexes(gs, gsEnter, gsExit);
    vm._buildNestedPolygons(gs, gsEnter, gsExit);
  }

  Radar.prototype._buildNestedVertexes = function(update, enter, exit) {
    var vm = this,
      duration = vm._config.transitionDuration,
      selector = 'circle.vertex',
      toUpdate;

    function appendHelper(selection) {
      selection
        .append('circle')
        .attr('class', 'vertex')
        .attr('cx', vm._center.x)
        .attr('cy', vm._center.y)
        .attr('r', 4)
        .attr('fill', function(d) { return d.color; })
        .call(updateHelper);

    }

    function removeHelper(selection) {
      selection
        .transition()
        .duration(duration)
        .attr('cx', vm._center.x)
        .attr('cy', vm._center.y)
        .remove();
    }

    function updateHelper(selection) {
      selection
        .transition()
        .duration(duration)
        .attr('cx', function(d) { return d.xy[0]; })
        .attr('cy', function(d) { return d.xy[1]; });
    }

    function dataFunc(d) { return d.values; }

    function keyFunc(d) { return d.polygon + '-' + d.axis; }

    toUpdate = update.selectAll(selector)
      .data(dataFunc, keyFunc);

    toUpdate
      .call(updateHelper);

    toUpdate.enter()
      .call(appendHelper);

    toUpdate.exit()
      .call(removeHelper);

    enter.selectAll(selector)
      .data(dataFunc, keyFunc)
      .enter()
      .call(appendHelper);

    exit.selectAll(selector)
      .call(removeHelper);
  }

  Radar.prototype._buildNestedPolygons = function(update, enter, exit) {
    var vm = this,
      duration = vm._config.transitionDuration,
      selector = 'polygon.category',
      toUpdate;

    // Used for the transitions where the polygons expand from
    // or shrink to the center.
    function centerPoints(data) {
      var center = [vm._center.x, vm._center.y].join(',')
      return data.points.map(function(p) {
        // All polygon's points move to the center.
        return center;
      }).join(' ');
    }

    function appendHelper(selection) {
      selection
        .append('polygon')
        .attr('class', 'category')
        .attr('points', centerPoints)
        .style('stroke', function(d, i) { return d.color; })
        .style('fill', function(d, i) { return d.color; })
        .style('fill-opacity', 0.4)
        .style('stroke-width', '1px')
        .call(updateHelper);

    }

    function removeHelper(selection) {
      selection
        .transition()
        .duration(duration)
        .attr('points', centerPoints)
        .remove();
    }

    function updateHelper(selection) {
      selection
        .transition()
        .duration(duration)
        .attr('points', function(d) { return d.points.join(' '); });
    }

    function dataFunc(d) { return [d] }

    function keyFunc(d) { return d.polygon; }

    toUpdate = update.selectAll(selector)
      .data(dataFunc, keyFunc);

    toUpdate
      .call(updateHelper);

    toUpdate.enter()
      .call(appendHelper);

    toUpdate.exit()
      .call(removeHelper);

    enter.selectAll(selector)
      .data(dataFunc, keyFunc)
      .enter()
      .call(appendHelper);

    exit.selectAll(selector)
      .call(removeHelper);

  }

  Radar.prototype.xOf = function(rads, value) {
    var vm = this;
    return vm._center.x + (value * Math.cos(rads));
  }

  Radar.prototype.yOf = function(rads, value) {
    var vm = this;
    return vm._center.y + (value * Math.sin(rads));
  }

  Radar.prototype.minMax = function(data) {
    var vm = this;
    return data.reduce(function(minMax, row) {
      var val = row[vm._config.valuesFrom];
      if(minMax.length == 0) {
        return [val, val]
      }
      return [
        val < minMax[0] ? val : minMax[0],
        val > minMax[1] ? val : minMax[1]
      ];
    }, []);
  }

  // Build the data with coords.
  Radar.prototype.dataForVisualization = function(data) {
    var vm = this,
      scale = vm._scales.x,
      axisKey = vm._config.axesFrom,
      valKey = vm._config.valuesFrom,
      polygKey = vm._config.polygonsFrom,
      axesHash = vm._axesData.hash;

    return data.map(function(row) {
      var axis = row[axisKey],
        rads = axesHash[axis].rads,
        polygon = row[polygKey],
        val = scale(row[valKey]);
      return {
        xy: [
          vm.xOf(rads, val),
          vm.yOf(rads, val)
        ],
        value: val,
        polygon: polygon,
        axis: axis,
        color: vm._colorMap[polygon],
        rawData: row
      };
    });
  }

  Radar.prototype.filter = function(fun) {
    var vm = this;
    vm._filter = fun;
    return vm;
  }

  // DBOX internals.

  Radar.prototype.chart = function(chart) {
    var vm = this;
    vm._chart = chart;
    return vm;
  }

  Radar.prototype.data = function(data) {
    var vm = this, dataBundle;
    vm._data = data;
    return vm;
  }

  Radar.prototype.scales = function(scales) {
    var vm = this;
    vm._scales = scales;
    // We only need one scale.
    vm._scales.x.range([0, vm._radius]);
    return vm;
  }

  Radar.prototype.axes = function(axes) {
    var vm = this;
    // TODO Do nothing?
    //vm._axesData = axes;
    return vm;
  }

  Radar.prototype.domains = function() {
    var vm = this;
    vm._minMax = vm.minMax(vm._data);
    vm._scales.x.domain(vm._minMax);
    return vm;
  }

  Radar.prototype.draw = function() {
    var vm = this,
      data = vm._data;

    // Build the color map previusly to filtering in order to keep the
    // association between colors and polygons even when some of them (the
    // polygons) have been filtered out.
    vm._colorMap = vm.buildColorMap(data);

    if(typeof vm._filter === 'function') {
      data = data.filter(vm._filter);
    }
    vm._axesData = vm.extractAxes(data);
    vm._viewData = vm.dataForVisualization(data);

    vm.drawLevels();
    vm.drawAxes();
    vm.drawPolygons();
  }

  return new Radar(config);

}
