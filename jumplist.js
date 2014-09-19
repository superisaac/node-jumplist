function JumpList(opts) {
  opts = opts||{};
  if(typeof opts == 'function') opts = {compareFunc:opts};
  this.compare = opts.compareFunc||function(k1, k2) {return k1>k2?1:(k1==k2?0:-1)};
  this.genRate = opts.genRate||0.25;
  this.root = {key: null, value: null, jumpTable:[]};

  this.len  = 0;
  this.compareNode = function(n1, n2) {
    if(n1 == this.root && n2 == this.root) {
      return 0;
    } else if (n1 == this.root) {
      return -1;
    } else if (n2 == this.root) {
      return 1;
    } else {
      return this.compare(n1.key, n2.key);
    }
  };

  this.valid = function(node) {
    return !!node && node != this.root;
  }

  this.prevNode = function(start, level, key) {
    if(this.compareNode(start, {key:key}) > 0)  return null;

    while(this.valid(start.jumpTable[level].next)) {
      if(this.compareNode(start.jumpTable[level].next, {key:key}) > 0) {
	return start;
      }
      start = start.jumpTable[level].next;
    }
    return start;
  };

  this.prevNodes = function(key) {
    var nodes = [];
    var start = null;
    
    for(var level=this.root.jumpTable.length-1; level>=0;level--) {
      if(!start) start = this.root;
      var start = this.prevNode(start, level, key);
      if(start) {
	nodes.push(start);
      }
    }
    nodes = nodes.reverse();
    return nodes;
  };
  
  this.updateCount = function(node, level) {
    if(level == 0) {
      node.jumpTable[0].cnt = 1;
    } else {
      var sumCnt = 0;
      var next = node.jumpTable[level].next;
      var p = node;
      while(true) {
	if(this.valid(next) && this.compareNode(p, next) >= 0) break;
	sumCnt += p.jumpTable[level-1].cnt;
	p = p.jumpTable[level-1].next;
	if(!this.valid(p)) break;
      }
      node.jumpTable[level].cnt = sumCnt;
    }
  };

  this.getNode = function(key) {
    var bounds = this.prevNodes(key);
    if(bounds.length > 0 && this.compareNode(bounds[0], {key:key}) == 0) {
      return bounds[0];
    }
  };

  this.skip = function(node, n, level) {
    if(level == undefined) level = this.root.jumpTable.length - 1;
    var sumn = 0;
    while(true) {
      if(sumn + node.jumpTable[level].cnt < n ||
	 (level == 0 && sumn + 1 == n)) {
	sumn += node.jumpTable[level].cnt;
	node = node.jumpTable[level].next;
	if(!this.valid(node)) {
	  break;
	}
      } else if(level == 0) {
	return node;
      } else {
	level--;
      }
    }
  };
};

JumpList.prototype.size = function() {
  if(this.root.jumpTable.length > 0) {
    var highLevel = this.root.jumpTable.length - 1;
    var p = this.root;
    var sumCnt = 0;
    do {
      sumCnt += p.jumpTable[highLevel].cnt;
      p = p.jumpTable[highLevel].next;
    } while(this.valid(p));
    return sumCnt - 1;
  } else {
    return 0;
  }
};


JumpList.prototype.getAt = function(index) {
  if(index < 0) return;
  var level = this.root.jumpTable.length - 1;
  if(level < 0) return;
  for(; level>0 && this.root.jumpTable[level].cnt > index;level--) {}
  var p = this.skip(this.root.jumpTable[level].next,
		    index - this.root.jumpTable[level].cnt+1,
		    level);
  if(p) return p.item();
};

JumpList.prototype.get = function(key) {
  var node = this.getNode(key);
  if(node) return node.value;
};

JumpList.prototype.set = function(key, val) {
  var bounds = this.prevNodes(key);
  
  if(bounds.length > 0 && this.compareNode(bounds[0], {key:key}) == 0) {
    bounds[0].value = val;
  } else {
    var node = {key: key,
		value: val,
		jumpTable:[],
		item: function() {
		  return {key: this.key, value: this.value};
		}};
    var r = 1.0, level=0;
    while(r > Math.random()) {
      // Insert a skip at a level
      var bound = bounds[level];
      var skip = {cnt:1};
      if(bound) {
	skip.next = bound.jumpTable[level].next,
	skip.prev = bound;
	if(skip.next) {
	  skip.next.jumpTable[level].prev = node;
	}
	bound.jumpTable[level].next = node;
      } else {
	var rootSkip = {cnt: 1, next: node, prev: node};
	this.root.jumpTable.push(rootSkip);
	skip.next = this.root;
	skip.prev = this.root;
	bounds.push(this.root);
      }      
      node.jumpTable.push(skip);
      r *= this.genRate;
      level++;
    }

    for(var level=0;level<node.jumpTable.length; level++) {
      this.updateCount(node, level);
    }
    for(var level=0;level<bounds.length; level++) {
      this.updateCount(bounds[level], level);
    }
  }
};

/**
 * Remove an element by key
 */
JumpList.prototype.remove = function(key) {
  var bounds = this.prevNodes(key);
  if(bounds.length > 0 && this.compareNode(bounds[0], {key: key}) == 0) {
    var node = bounds[0];
    for(var level=0; level<node.jumpTable.length; level++) {
      if(this.compareNode(bounds[level], {key:key}) == 0) {
	bounds[level] = node.jumpTable[level].prev;
      }
      var next = node.jumpTable[level].next;
      var prev = node.jumpTable[level].prev;
      next.jumpTable[level].prev = prev;
      prev.jumpTable[level].next = next;
    }

    for(var level = this.root.jumpTable.length - 1;level>=0;level--) {
      if(!this.valid(this.root.jumpTable[level].next)) {
	this.root.jumpTable.pop();
	bounds.pop();
      }
    }
    for(var level=0;level<bounds.length; level++) {
      if(bounds[level]) {
	this.updateCount(bounds[level], level);
      }
    }
    return true;
  } else {
    return false;
  }
};

/**
 * Return a iterator of elems where startKey <= elem.key <= endKey
 * 
 */ 
JumpList.prototype.range = function(startKey, endKey, callback) {
  var node;
  if(this.compareNode({key:startKey}, {key:endKey}) <= 0) {
    var bounds = this.prevNodes(startKey);
    if(bounds.length > 0) {
      node = this.compareNode(bounds[0], {key:startKey})==0?bounds[0]:bounds[0].jumpTable[0].next;
    } else {
      node = this.root.jumpTable[0].next;
    }
    var i = 0;
    for(;node && this.compareNode(node, {key:endKey}) <= 0; node=node.jumpTable[0].next) {
      if(false === callback(node.key, node.value, i++)) break;
    }
  } else {
    var bounds = this.prevNodes(startKey);
    if(bounds.length > 0) {
      node = bounds[0];
    } else {
      return;
    }
    var i = 0;
    for(;node && this.compareNode(node, {key:endKey}) >= 0; node=node.jumpTable[0].prev) {
      if(false === callback(node.key, node.value, i++)) break;
    }    
  }
};

JumpList.prototype.tail = function() {
  var prev = this.root.jumpTable[0].prev;
  if(prev) {
    return prev.item();
  }
  return null;
};

JumpList.prototype.head = function() {
  return this.root.jumpTable[0].next.item();
};

JumpList.prototype.forEach = function(callback) {
  if(this.root.jumpTable.length <= 0) {
    return;
  }
  var p = this.root.jumpTable[0].next;
  var i = 0;
  while(this.valid(p)) {
    var r = callback(p.key, p.value, i++);
    if(r === false) break;
    p = p.jumpTable[0].next;
  }
};

JumpList.prototype.map = function(callback) {
  var arr = [];
  this.forEach(function(key, value) {
    var a = callback(key, value);
    arr.push(a);
  });
  return arr;
};

JumpList.prototype.clear = function() {
  if(this.root.jumpTable.length < 1) {
    return;
  }
  var p = this.root.jumpTable[0].next;
  while(this.valid(p)) {
    var nextp = p.jumpTable[0].next;
    p.jumpTable = [];
    p = nextp;
  }
  this.root = {key: null, value: null, jumpTable:[]};
};

JumpList.compareArray = function(arr, brr) {
  for(var i=0; i<arr.length; i++) {
    var a = arr[i];
    var b = brr[i];
    if(a == b) {
      continue;
    } else if(a > b) {
      return 1;
    } else {
      return -1;
    }
  }
  return 0;
};


if(typeof module != 'undefined' && module.exports) {
  module.exports = JumpList;
}
