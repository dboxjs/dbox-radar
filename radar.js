/*
 * Build a radar chart.
 */

export default function(config) {
  function Radar(config) {
    var vm = this, size;

    vm.CIRCLE_RADIANS = 2 * Math.PI;

    // The first axis must be at the circle's top.
    vm.RADIANS_TO_ROTATE = vm.CIRCLE_RADIANS / -4;

    vm._config = config ? config : {};
    vm._data = [];
    vm._scales = {};
    vm._axes = {};
    vm._axesData = {};
    vm._filter = null;
    vm._minMax = [0, 0];
    vm._viewData = [];
    vm._colorMap = {};
    vm._ticks = 0;
    vm._scale = null;
    vm._excludedPolygons = [];

    // Set defaults.
    if(!vm._config.ticks) {
      vm._config.ticks = 10;
    }

    if(!vm._config.transitionDuration) {
      vm._config.transitionDuration = 400;
    }

    if(!vm._config.axisLabelMargin) {
      vm._config.axisLabelMargin = 24;
    }

    if(!vm._config.legend) {
      vm._config.legend = {
        enable: true
      };
    }

    if(!vm._config.legend.at) {
      vm._config.legend.at = {
        x: 20,
        y: 20
      };
    }

    // Calculate basic data.
    size = vm._config.size;

    vm._center = {
      x: (size.width / 2) - size.margin.left,
      y: (size.height / 2) - size.margin.top
    };

    vm._radius = Math.min(
      (size.width - size.margin.left - size.margin.right) / 2,
      (size.height - size.margin.top - size.margin.bottom) / 2
    );
  }

  // User API.

  Radar.prototype.polygonsFrom = function(column) {
    var vm = this;
    vm._config.polygonsFrom = column;
    return vm;
  };

  Radar.prototype.axesFrom = function(column) {
    var vm = this;
    vm._config.axesFrom = column;
    return vm;
  };

  Radar.prototype.valuesFrom = function(column) {
    var vm = this;
    vm._config.valuesFrom = column;
    return vm;
  };

  Radar.prototype.ticks = function(ticks) {
    var vm = this;
    vm._config.ticks = ticks;
    return vm;
  };

  Radar.prototype.colors = function(colors) {
    var vm = this;
    vm._config.colors = colors;
    return vm;
  };

  Radar.prototype.end = function() {
    var vm = this;
    return vm._chart;
  };

  // Internal helpers.

  Radar.prototype.drawTicks = function() {
    var vm = this,
      svg = vm._chart._svg,
      dur = vm._config.transitionDuration,
      sel;

    sel = svg.selectAll('circle.tick')
      .data(vm._ticks);

    sel
      .transition()
      .duration(dur)
      .attr('r', function(d) { return vm._scale(d); });

    sel.enter()
      .append('circle')
      .classed('tick', true)
      .attr('cx', vm._center.x)
      .attr('cy', vm._center.y)
      .style('fill', 'none')
      .style('stroke', 'gray')
      .attr('r', function(d) { return vm._scale(d); })
      .attr('opacity', 0)
      .transition()
      .duration(dur)
      .attr('opacity', 1);

    sel.exit()
      .transition()
      .duration(dur)
      .attr('opacity', 0)
      .remove();
  };

  Radar.prototype.drawTicksLabels = function() {
    var vm = this,
      svg = vm._chart._svg,
      margin = 2,
      dur = vm._config.transitionDuration,
      sel;

    sel = svg.selectAll('text.tick-label')
      .data(vm._ticks);

    sel
      .transition()
      .duration(dur)
      .text(function(d) { return d; })
      .attr('y', function(d) { return vm._center.y - margin - vm._scale(d); });

    sel.enter()
      .append('text')
      .text(function(d) { return d; })
      .attr('class', 'tick-label')
      .attr('x', vm._center.x + margin)
      .attr('y', function(d) { return vm._center.y - margin - vm._scale(d); })
      .attr('fill', 'gray')
      .style('font-family', 'sans-serif')
      .attr('opacity', 0)
      .transition()
      .duration(dur)
      .attr('opacity', 1);

    sel.exit()
      .transition()
      .duration(dur)
      .attr('opacity', 0)
      .remove();
  };

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
      function(item, idx) {
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
  };

  Radar.prototype.buildColorMap = function(data) {
    var vm = this,
      colors = vm._config.colors;
    return data.reduce(function(cMap, row) {
      var polyg = row[vm._config.polygonsFrom],
        cIdx = cMap.index.indexOf(polyg);

      if(cIdx == -1) {
        cIdx = cMap.index.push(polyg) - 1;
        cMap.hash[polyg] = colors[cIdx];
        cMap.list.push({polygon: polyg, color: colors[cIdx]});
      }
      return cMap;
    }, {index: [], hash: {}, list: []});
  };

  Radar.prototype.drawAxes = function() {
    var vm = this,
      svg = vm._chart._svg,
      duration = vm._config.transitionDuration,
      selection;

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
      .attr('x2', function(d) {
        return vm.xOf(d.rads, vm._radius + 8);
      })
      .attr('y2', function(d) {
        return vm.yOf(d.rads, vm._radius + 8);
      });

    selection
      .transition()
      .duration(duration)
      .attr('x2', function(d) {
        return vm.xOf(d.rads, vm._radius + 8);
      })
      .attr('y2', function(d) {
        return vm.yOf(d.rads, vm._radius + 8);
      });

    selection.exit()
      .transition()
      .duration(duration)
      .attr('x2', vm._center.x)
      .attr('y2', vm._center.y)
      .remove();
  };

  Radar.prototype.drawAxesLabels = function() {
    var vm = this,
      svg = vm._chart._svg,
      duration = vm._config.transitionDuration,
      fromCenter = vm._radius + vm._config.axisLabelMargin,
      labels;

    labels = svg.selectAll('text.axis-label')
      .data(vm._axesData.list, function(d) { return d.axis; });

    labels
      .transition()
      .duration(duration)
      .attr('x', (d) => vm.xOf(d.rads, fromCenter))
      .attr('y', (d) => vm.yOf(d.rads, fromCenter));

    labels.enter()
      .append('text')
      .attr('class', 'axis-label')
      .attr('text-anchor', 'middle')
      .attr('fill', 'gray')
      .style('font-family', 'sans-serif')
      .text(function(d) { return d.axis; })
      .attr('x', (d) => vm.xOf(d.rads, fromCenter))
      .attr('y', (d) => vm.yOf(d.rads, fromCenter))
      .attr('opacity', 0)
      .transition()
      .duration(duration)
      .attr('opacity', 1);

    labels.exit()
      .transition()
      .duration(duration)
      .attr('opacity', 0)
      .remove();
  };

  Radar.prototype.drawPolygons = function() {
    var vm = this,
      data = vm._viewData,
      svg = vm._chart._svg,
      duration = vm._config.transitionDuration,
      groupedData,
      gs, gsExit, gsEnter;

    // Prepare the data.
    groupedData = data.reduce(function(bundle, row) {
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

    vm._buildNestedPolygons(gs, gsEnter, gsExit);
    vm._buildNestedVertexes(gs, gsEnter, gsExit);
  };

  Radar.prototype._buildNestedVertexes = function(update, enter, exit) {
    var vm = this,
      duration = vm._config.transitionDuration,
      selector = 'circle.vertex',
      svg = vm._chart._svg,
      toUpdate;

    function appendHelper(selection) {
      selection
        .append('circle')
        .attr('class', 'vertex')
        .attr('cx', vm._center.x)
        .attr('cy', vm._center.y)
        .attr('r', 4)
        .attr('fill', function(d) { return d.color; })
        .call(updateHelper)
        .on('mouseover', d => {
          var tt = svg.append('g')
            .attr('class', 'tooltip')
            .attr('opacity', 1);

          tt.append('text')
            .text(`${d.polygon} - ${d.axis} - ${d.value}`)
            .attr('x', d.xy[0] + 4)
            .attr('y', d.xy[1] - 10)
            .style('font-family', 'sans-serif');

          tt.transition()
            .duration(200)
            .attr('opacity', 1);
        })
        .on('mouseout', () => {
          svg.selectAll('g.tooltip')
            .transition()
            .duration(200)
            .attr('opacity', 0)
            .remove();
        });

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
  };

  Radar.prototype._buildNestedPolygons = function(update, enter, exit) {
    var vm = this,
      duration = vm._config.transitionDuration,
      selector = 'polygon.category',
      toUpdate;

    // Used for the transitions where the polygons expand from
    // or shrink to the center.
    function centerPoints(data) {
      var center = [vm._center.x, vm._center.y].join(',');
      return data.points.map(function() {
        // All polygon's points move to the center.
        return center;
      }).join(' ');
    }

    function appendHelper(selection) {
      selection
        .append('polygon')
        .attr('class', 'category')
        .attr('points', centerPoints)
        .style('stroke', function(d) { return d.color; })
        .style('fill', function(d) { return d.color; })
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

    function dataFunc(d) { return [d]; }

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

  };

  Radar.prototype.drawLegend = function() {
    var vm = this,
      cMap = vm._colorMap.list,
      svg = vm._chart._svg,
      at = vm._config.legend.at,
      side = 14,
      margin = 4,
      legend, newLegend;

    legend = svg.selectAll('g.legend-item')
      .data(cMap, function(d) { return d.polygon; })
      .attr('opacity', d => {
        return vm._excludedPolygons.indexOf(d.polygon) > -1 ? .4 : 1;
      });

    newLegend = legend.enter()
      .append('g')
      .on('click', (d) => {
        vm._excludedPolygons = vm._toggleList(
          vm._excludedPolygons, [d.polygon]);
        vm.draw();
      })
      .attr('class', 'legend-item');

    newLegend
      .append('text')
      .text(d => d.polygon)
      .attr('x', at.x + side + margin)
      .attr('y', (d, i) => ((side + margin) * i) + at.y + side)
      .style('font-family', 'sans-serif');

    newLegend
      .append('rect')
      .attr('fill', d => d.color)
      .attr('width', side)
      .attr('height', side)
      .attr('x', at.x)
      .attr('y', (d, i) => ((side + margin) * i) + at.y);
  };

  /**
   * Append items not present in base from items and pop those which are.
   * @param  {array} base   Array to append to remove from.
   * @param  {array} items  Items to be toogled (appended or removed).
   * @return {array}        A new array.
   */
  Radar.prototype._toggleList = (base, items) => {
    var newItems = items.filter(it => base.indexOf(it) == -1);
    return base.filter(it => items.indexOf(it) == -1).concat(newItems);
  };

  Radar.prototype.xOf = function(rads, value) {
    var vm = this;
    return vm._center.x + (value * Math.cos(rads));
  };

  Radar.prototype.yOf = function(rads, value) {
    var vm = this;
    return vm._center.y + (value * Math.sin(rads));
  };

  Radar.prototype.minMax = function(data) {
    var vm = this;
    return data.reduce(function(minMax, row) {
      var val = parseInt(row[vm._config.valuesFrom]);
      if(minMax.length == 0) {
        return [val, val];
      }
      return [
        val < minMax[0] ? val : minMax[0],
        val > minMax[1] ? val : minMax[1]
      ];
    }, []);
  };

  // Build the data with coords.
  Radar.prototype.dataForVisualization = function(data) {
    var vm = this,
      scale = vm._scale,
      axisKey = vm._config.axesFrom,
      valKey = vm._config.valuesFrom,
      polygKey = vm._config.polygonsFrom,
      axesHash = vm._axesData.hash;

    return data.map(function(row) {
      var axis = row[axisKey],
        rads = axesHash[axis].rads,
        polygon = row[polygKey],
        val = row[valKey],
        scVal = scale(val);
      return {
        xy: [
          vm.xOf(rads, scVal),
          vm.yOf(rads, scVal)
        ],
        value: val,
        polygon: polygon,
        axis: axis,
        color: vm._colorMap.hash[polygon],
        rawData: row
      };
    });
  };

  Radar.prototype.filter = function(fun) {
    var vm = this;
    vm._filter = fun;
    return vm;
  };

  // DBOX internals.

  Radar.prototype.chart = function(chart) {
    var vm = this;
    vm._chart = chart;
    return vm;
  };

  Radar.prototype.data = function(data) {
    var vm = this;
    vm._data = data;
    return vm;
  };

  Radar.prototype.scales = function(scales) {
    var vm = this;
    vm._scales = scales;
    // We only need one scale.
    vm._scale = vm._scales.x;
    vm._scale.range([0, vm._radius]);
    return vm;
  };

  Radar.prototype.axes = function(axes) {
    var vm = this;
    // TODO Do nothing?
    return vm;
  };

  Radar.prototype.domains = function() {
    var vm = this;
    vm._calcDomains(vm._data);
    return vm;
  };

  Radar.prototype._calcDomains = function(data) {
    var vm = this;
    vm._minMax = vm.minMax(data);
    vm._scale.domain(vm._minMax);
    vm._ticks = vm._scale.ticks(vm._config.ticks);
    // Exclude 0 from ticks if it is the first element.
    // We don't need to have the 0 actually rendered.
    if(vm._ticks.length > 0 && vm._ticks[0] === 0) {
      vm._ticks = vm._ticks.slice(1);
    }
  };

  Radar.prototype.draw = function() {
    var vm = this,
      data = vm._data;

    // Build the color map previusly to filtering in order to keep the
    // association between colors and polygons even when some of them (the
    // polygons) have been filtered out.
    vm._colorMap = vm.buildColorMap(data);

    // Apply the filter function, if it's present.
    if(typeof vm._filter === 'function') {
      data = data.filter(vm._filter);
    }

    // Filter out excluded polygons from.
    if(vm._excludedPolygons.length > 0) {
      data = data.filter(it => {
        return vm._excludedPolygons.indexOf(
          it[vm._config.polygonsFrom]) == -1;
      });
    }

    vm._calcDomains(data);
    vm._axesData = vm.extractAxes(data);
    vm._viewData = vm.dataForVisualization(data);

    vm.drawTicks();
    vm.drawAxes();
    vm.drawAxesLabels();
    vm.drawTicksLabels();
    vm.drawPolygons();
    vm.drawLegend();
  };

  return new Radar(config);

}
