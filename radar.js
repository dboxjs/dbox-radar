/*
 * Build a radar chart.
 */

import * as d3 from 'd3';

export default function(config) {
  function Radar(config) {
    var vm = this;
    vm._config = config ? config : {};
    vm._data = [];
    vm._scales = {};
    vm._axes = {};

    vm.CIRCLE_RADIANS = 2 * Math.PI;

    // The first axis must be at the circle's top.
    vm.RADIANS_TO_ROTATE = vm.CIRCLE_RADIANS / -4;

    // Set defaults.
    if(!vm._config.levels) {
      vm._config.levels = 5;
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

  Radar.prototype.groupBy = function(column) {
    var vm = this;
    vm._config.groupBy = column;
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

    return result.map(
      function(item, idx, arr) {
        return [
          item,
          (idx * radiansPerAxis) + vm.RADIANS_TO_ROTATE
        ];
      });
  }

  Radar.prototype.drawAxes = function() {
    var vm = this,
      svg = vm._chart._svg;
    console.log(vm._axes);
    svg.selectAll('line.axis')
      .data(vm._axes, function(d) { return d[0]; })
      .enter()
      .append('line')
      .classed('axis', true)
      .attr('x1', vm._center.x)
      .attr('y1', vm._center.y)
      .attr('x2', function(d, i) {
        return vm._center.x + (vm._radius * Math.cos(d[1]))
      })
      .attr('y2', function(d, i) {
        return vm._center.y + (vm._radius * Math.sin(d[1]))
      })
      .style('stroke', 'gray');
  }

  // DBOX internals.

  Radar.prototype.chart = function(chart) {
    var vm = this;
    vm._chart = chart;
    return vm;
  }

  Radar.prototype.data = function(data) {
    var vm = this;
    vm._data = data;
    // @TODO Make further processing of data, if required.
    vm._axes = vm.extractAxes(vm._data);
    console.log(vm._axes);
    return vm;
  }

  Radar.prototype.scales = function(scales) {
    var vm = this;
    vm._scales = scales;
    return vm;
  }

  Radar.prototype.axes = function(axes) {
    var vm = this;
    // TODO Do nothing?
    //vm._axes = axes;
    return vm;
  }

  Radar.prototype.domains = function() {
    var vm = this;
    // TODO Implement
    return vm;
  }

  Radar.prototype.draw = function() {
    var vm = this;
    vm.drawLevels();
    vm.drawAxes();
  }

  return new Radar(config);

}
