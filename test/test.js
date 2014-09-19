'use strict';
var assert = require('assert');
var JumpList = require('../jumplist');

JumpList.prototype.print = function() {
  var node = this.root;
  do {
    var s = node.key + ':' + node.value;
    for(var i=0; i<node.jumpTable.length; i++) {
      var skip = node.jumpTable[i];
      s += '\t\t' + (skip.prev?skip.prev.key:'') + ',' + (skip.next?skip.next.key:'') + ',c=' + skip.cnt;
    }
    console.info(s);
    node = node.jumpTable[0].next;
  }while(this.valid(node));
};

describe('JumpList', function(){
  it('many items', function() {
    var list = new JumpList();
    for(var i=0; i<1000; i++) {
      list.set(i, i+1000);
    }
    assert.equal(list.getAt(561).value, 1561);
    
    var ri = Math.floor(999 * Math.random());
    assert.equal(list.getAt(ri).value, ri+1000);

    list.remove(ri);
    assert.equal(list.getAt(ri).value, ri+1001);
  });

  it('should have alphabetic orders', function() {
    var list = new JumpList();
    list.set('b', 3);
    list.set('a', 5);

    assert.equal(list.get('b'), 3);
    assert.equal(list.getAt(0).key, 'a');
    assert.equal(list.getAt(0).value, 5);

    assert.equal(list.size(), 2);
  });

  it('should sastain deletion', function() {
    var list = new JumpList();

    list.set('b', 3);
    list.set('a', 5);
    list.set('c', 10);

    assert.equal(list.size(), 3);
    assert.equal(list.getAt(0).key, 'a');

    list.remove('b');

    assert.equal(list.size(), 2);
    assert.equal(list.getAt(0).key, 'a');
    assert.equal(list.getAt(1).key, 'c');
    assert.equal(list.getAt(1).value, 10);

    list.set('d', 17);
    assert.equal(list.getAt(2).key, 'd');

    list.remove('e');
    assert.equal(list.getAt(2).key, 'd');

    var arr = list.map(function(k, v) {
      return k;
    });
    assert.deepEqual(arr, ['a', 'c', 'd']);

    list.clear();
    assert.equal(list.size(), 0);
  });

  it('void list', function() {
    var list = new JumpList();
    assert.equal(list.size(), 0);
    assert.ok(!list.getAt(100));
    assert.deepEqual(list.map(function(k, v){return v;}), []);
  });
});
