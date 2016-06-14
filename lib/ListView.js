'use strict';

var React = require('react');
var assign = require('object-assign');
var Scroller = require('scroller');
var Group = require('./Group');
var clamp = require('./clamp');

var ListView = React.createClass({

  propTypes: {
    style: React.PropTypes.object,
    numberOfItemsGetter: React.PropTypes.func.isRequired,
    itemHeightGetter: React.PropTypes.func.isRequired,
    itemGetter: React.PropTypes.func.isRequired,
    snapping: React.PropTypes.bool,
    scrollingDeceleration: React.PropTypes.number,
    scrollingPenetrationAcceleration: React.PropTypes.number,
    onScroll: React.PropTypes.func,
    onRefresh: React.PropTypes.func,
    refreshHeight: React.PropTypes.number,
    scrollState: React.PropTypes.object,
  },

  getDefaultProps: function () {
    return {
      style: { left: 0, top: 0, width: 0, height: 0 },
      snapping: false,
      scrollingDeceleration: 0.95,
      scrollingPenetrationAcceleration: 0.08
    };
  },

  getInitialState: function () {
    return {
      scroll: this.props.scrollState || {
        scrollTop: 0,
        itemHeights: {},
      },
      wheelDelta: null,
      stopScrolling: false,
    };
  },

  componentDidMount: function () {
    this.createScroller();
    this.updateScrollingDimensions();
    window.addEventListener('wheel', this.handleWheel);
  },

  componentWillUnmount: function () {
    window.removeEventListener('wheel', this.handleWheel);
  },

  heightOf: function (index) {
    var h = 0;
    //TODO: faster height calculation by using pageHeights
    for (var i = 0; i < index; i++) {
      if (this.state.scroll.itemHeights[i]) {
        h += this.state.scroll.itemHeights[i];
      }
    }
    return h;
  },

  render: function () {
    var items = this.getVisibleItemIndexes().map(this.renderItem);
    return (
      React.createElement(Group, {
        style: this.props.style,
        onTouchStart: this.handleTouchStart,
        onTouchMove: this.handleTouchMove,
        onTouchEnd: this.handleTouchEnd,
        onTouchCancel: this.handleTouchEnd},
        items
      )
    );
  },

  renderItem: function (itemIndex) {
    var item = this.props.itemGetter(itemIndex, this.state.scrollTop);
    var itemHeight = this.props.itemHeightGetter(itemIndex);
    this.state.scroll.itemHeights[itemIndex] = itemHeight;
    var style = {
      top: 0,
      left: 0,
      width: this.props.style.width,
      height: itemHeight,
      translateY: this.heightOf(itemIndex) - this.state.scroll.scrollTop,
      zIndex: itemIndex
    };

    return (
      React.createElement(Group, {style: style, key: itemIndex},
        item
      )
    );
  },

  // Events
  // ======

  handleTouchStart: function (e) {
    if (this.scroller) {
      this.scroller.doTouchStart(e.touches, e.timeStamp);
    }
  },

  handleTouchMove: function (e) {
    if (this.scroller) {
      e.preventDefault();
      this.scroller.doTouchMove(e.touches, e.timeStamp, e.scale);
    }
  },

  handleTouchEnd: function (e) {
    if (this.scroller) {
      this.scroller.doTouchEnd(e.timeStamp);
      if (this.props.snapping) {
        this.updateScrollingDeceleration();
      }
    }
  },

  handleScroll: function (left, top) {
    this.state.scroll.scrollTop = top;
    /*if (top < 0 && !this.state.stopScrolling) {
      this.state.stopScrolling = true;
    }*/
    this.setState({ scroll: this.state.scroll });
    if (this.props.onScroll) {
      this.props.onScroll(top);
    }
  },

  //emurate touch events
  handleWheel: function(e) {
    if (this.scroller) {
      //  console.log("handleWheel:" + e.wheelDelta + "|" + e.timeStamp + "|" + e.pageX + "|" + e.pageY + "|" + this.state.startWheel);
      if (this.state.wheelDelta == null) {
        this.state.wheelDelta = 0;
        this.scroller.doTouchStart([e], e.timeStamp);
      } 
      else if (e.wheelDelta != 0) {
        var delta = e.wheelDelta / 3;
        var ts = e.timeStamp;
        /*if ((this.state.wheelDelta + delta + e.pageY) <= 0) {
          this.scroller.doTouchEnd(ts);
          this.scroller.doTouchStart([e], ts);
          this.state.wheelDelta = 0;
        }*/
        this.state.wheelDelta += delta;
        var ev = {
          pageX: e.pageX,
          pageY: e.pageY + this.state.wheelDelta,
        }
        //console.log("handleWheel:" + ev.pageX + "|" + ev.pageY);
        this.scroller.doTouchMove([ev], ts);
      }
      else {
        this.state.wheelDelta = null;
        this.scroller.doTouchEnd(e.timeStamp);
      }
      e.preventDefault();
      //e.stopImmediatePropagation();
    }
  },

  // Scrolling
  // =========

  createScroller: function () {
    var options = {
      scrollingX: false,
      scrollingY: true,
      decelerationRate: this.props.scrollingDeceleration,
      penetrationAcceleration: this.props.scrollingPenetrationAcceleration,
    };
    this.scroller = new Scroller(this.handleScroll, options);
    if (this.props.onRefresh != null) {
      //activate refresh
      var onRefresh = this.props.onRefresh;
      var scroller = this.scroller;
      this.scroller.activatePullToRefresh(
        this.props.refreshHeight || 75,
        function () {
          scroller.doTouchEnd((new Date()).getTime());
          onRefresh("activate");
        },
        function () {onRefresh("deactivate");},
        function () {onRefresh("start", function () {
          scroller.finishPullToRefresh();
        });}
      );
    }
    if (this.state.scroll.scrollTop && this.state.scroll.scrollTop > 0) {
      //set allowed max scroll to provided scrollTop (because scroller rounds by this value)
      this.scroller.__maxScrollTop = this.state.scroll.scrollTop;
      this.scroller.scrollBy(0, this.state.scroll.scrollTop); //no animation (3rd arg)
    }
  },

  updateScrollingDimensions: function () {
    var width = this.props.style.width;
    var height = this.props.style.height;
    var scrollWidth = width;
    var scrollHeight = this.props.style.scrollHeight || 
      this.props.numberOfItemsGetter() * this.props.itemHeightGetter(0);
    this.scroller.setDimensions(width, height, scrollWidth, scrollHeight);
  },

  getVisibleItemIndexes: function () {
    var itemIndexes = [];
    var itemCount = this.props.numberOfItemsGetter();
    var scrollTop = this.state.scroll.scrollTop;
    var itemScrollTop = 0;

    for (var index=0; index < itemCount; index++) {
      itemScrollTop = this.heightOf(index) - scrollTop;

      // Item is completely off-screen bottom
      if (itemScrollTop >= this.props.style.height) {
        continue;
      }

      // Item is completely off-screen top
      if (itemScrollTop <= -this.props.style.height) {
        continue;
      }

      // Part of item is on-screen.
      itemIndexes.push(index);
    }

    return itemIndexes;
  },

  updateScrollingDeceleration: function () {
    var currVelocity = this.scroller.__decelerationVelocityY;
    var currScrollTop = this.state.scroll.scrollTop;
    var targetScrollTop = 0;
    var estimatedEndScrollTop = currScrollTop;

    while (Math.abs(currVelocity).toFixed(6) > 0) {
      estimatedEndScrollTop += currVelocity;
      currVelocity *= this.props.scrollingDeceleration;
    }

    // Find the page whose estimated end scrollTop is closest to 0.
    var closestZeroDelta = Infinity;
    var pageCount = this.props.numberOfItemsGetter();
    var pageScrollTop;

    for (var pageIndex=0, len=pageCount; pageIndex < len; pageIndex++) {
      pageScrollTop = this.heightOf(pageIndex) - estimatedEndScrollTop;
      if (Math.abs(pageScrollTop) < closestZeroDelta) {
        closestZeroDelta = Math.abs(pageScrollTop);
        targetScrollTop = this.heightOf(pageIndex);
      }
    }

    this.scroller.__minDecelerationScrollTop = targetScrollTop;
    this.scroller.__maxDecelerationScrollTop = targetScrollTop;
  }

});

module.exports = ListView;
