import radar from '../';
import * as assert from 'assert';

describe('radar', () => {
  var conf, data, radarLayer;


  before(() => {
    conf = {
      size: {
        width: 600,
        height: 400,
        margin: {
          top: 10,
          left: 20,
          right: 30,
          bottom: 40,
        }
      },
      valuesFrom: 'value',
      polygonsFrom: 'cat',
    };

    data = [
      {value: 100, ax: 'a'},
      {value: 200, ax: 'b'},
      {value: 300, ax: 'b'},
      {value: 400, ax: 'c'},
      {value: 500, ax: 'b'},
      {value: 600, ax: 'd'},
      {value: 10, ax: 'e'},
      {value: 12, ax: 'd'},
      {value: 3, ax: 'd'},
    ];

    radarLayer = radar(conf);

  });

  it('should return an object', () => {
    var rad = radar(conf);
    assert.equal('object', typeof rad);
  });


  describe('minMax()', () => {
    it('should pick the correct min and max', () => {
      assert.deepEqual([3, 600], radarLayer.minMax(data));
    });
  });

  describe('extractAxes()', () => {
    it('should return a dual, list-hash, representation', () => {
      var axes;
      radarLayer.axesFrom('ax');
      axes = radarLayer.extractAxes([{ax: '1'}, {ax: '2'}]);
      assert.deepEqual(['hash', 'list'], Object.keys(axes).sort());
    });

    it('should return the axes according to the conf key', () => {
      var axes;
      radarLayer.axesFrom('ax');
      axes = radarLayer.extractAxes(data).list.map((it) => it.axis);
      assert.deepEqual(['a', 'b', 'c', 'd', 'e'], axes.sort());
    });

    it('should keep axes in order of appearance in data', () => {
      var axes,
        data = [
          {ax: 'a'},
          {ax: 'zz'},
          {ax: '1'},
          {ax: 'a'},
          {ax: '001'},
          {ax: 'zz'}
        ];
      radarLayer.axesFrom('ax');
      axes = radarLayer.extractAxes(data).list.map((it) => it.axis);
      assert.deepEqual(['a', 'zz', '1', '001'], axes);
    });

    it('should correctly calculate the radians of each axis', () => {
      var axes, axRads = 2 * Math.PI / 4,
        rotated = radarLayer.RADIANS_TO_ROTATE,
        // Generate 4 axes.
        data= [
          {ax: '1'},
          {ax: '2'},
          {ax: '3'},
          {ax: '4'}
        ],
        expected = [
          (axRads * 0) + rotated,
          (axRads * 1) + rotated,
          (axRads * 2) + rotated,
          (axRads * 3) + rotated
        ];

      radarLayer.axesFrom('ax');
      axes = radarLayer.extractAxes(data).list.map((it) => it.rads);
      assert.deepEqual(expected.sort(), axes.sort());
    });
  });

  describe('buildColorMap()', function() {
    it('should build an object with a hash and list properties', function() {
      var data = [
          {cat: 'one'},
          {cat: 'two'},
          {cat: 'three'}
        ],
        colors = ['red', 'blue', 'green'],
        keys;

      radarLayer.colors(colors);
      keys = Object.keys(radarLayer.buildColorMap(data));

      assert.ok(keys.indexOf('list') > -1);
      assert.ok(keys.indexOf('hash') > -1);
    });

    it('should map the colors to categories in order', function() {
      var data = [
          {cat: 'one'},
          {cat: 'two'},
          {cat: 'one'},
          {cat: 'three'},
          {cat: 'two'}
        ],
        colors = ['red', 'blue', 'green'],
        map;

      radarLayer.colors(colors);
      map = radarLayer.buildColorMap(data).hash;

      assert.equal('red', map.one);
      assert.equal('blue', map.two);
      assert.equal('green', map.three);
    });

    it('should map only once each category to a color', function() {
      var data = [
          {cat: 'one'},
          {cat: 'two'},
          {cat: 'one'},
          {cat: 'three'},
          {cat: 'two'},
          {cat: 'four'},
          {cat: 'four'},
          {cat: 'five'},
        ],
        colors = ['red', 'blue', 'green', 'gray', 'yellow'],
        listMap;

      radarLayer.colors(colors);
      listMap = radarLayer.buildColorMap(data).list;

      assert.equal(5, listMap.length);
    });

    it('soud add a polygon and color properties to the list', function() {
      var data = [
          {cat: 'one'},
        ],
        colors = ['red', 'blue', 'green'],
        listMap;

      radarLayer.colors(colors);
      listMap = radarLayer.buildColorMap(data).list;

      assert.ok(Object.keys(listMap[0]).indexOf('polygon') > -1);
      assert.ok(Object.keys(listMap[0]).indexOf('color') > -1);
    });
  });
});
