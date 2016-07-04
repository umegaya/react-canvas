'use strict';

var createComponent = require('./createComponent');
var ContainerMixin = require('./ContainerMixin');
var LayerMixin = require('./LayerMixin');
var RenderLayer = require('./RenderLayer');
var Easing = require('./Easing');
var FrameUtils = require('./FrameUtils');
var registerLayerType = require('./DrawingUtils').registerLayerType
var drawBaseRenderLayer = require('./DrawingUtils').drawBaseRenderLayer
var clamp = require('./clamp');

//tap effect
function updateFrame() {
  if (this.tapped.factor >= 1) {
    this.tapped = null;
    this.invalidateLayout();
    return; //finish animation.
  }
  const FADE_DURATION_MS = 200;
  var factor = Easing.linear((Date.now() - this.tapped.start) / FADE_DURATION_MS);
  this.tapped.factor = clamp(factor, 0, 1);
  this.invalidateLayout();
  requestAnimationFrame(updateFrame.bind(this));
}
registerLayerType('group', function (ctx, layer) {
  drawBaseRenderLayer(ctx, layer);
  if (!layer.tapped) {
    return;
  }
  var centerX = layer.tapped.x; 
  var centerY = layer.tapped.y;
  var factor = layer.tapped.factor;
  
  ctx.beginPath();
  ctx.rect(layer.frame.x, layer.frame.y, layer.frame.width, layer.frame.height);
  ctx.clip();
  ctx.globalAlpha = 0.8 * (1 - factor);
  ctx.beginPath();
  ctx.arc(centerX, centerY, layer.tapped.radius * factor, 0, 2 * Math.PI, false);
  ctx.fillStyle = '#CCC';
  ctx.fill();
});

function setLayerTapped(layer, ev) {
  //TODO: handling the case canvas element top > 0,
  var tx = 0, ty = 0;
  var ancester = layer;
  while (ancester) {
    tx += (ancester.translateX || 0);
    ty += (ancester.translateY || 0);
    if (!ancester.parentLayer) {
      //means reach to root layer. if root layer contains position 
      //relative to screen, then add position data 
    }
    ancester = ancester.parentLayer;
  }
  var x = ev.clientX - tx, y = ev.clientY - ty;
  layer.tapped = {
    x: x,
    y: y,
    radius: FrameUtils.longestDistance(layer.frame, x, y),
    factor: 0,
    start: Date.now(),
  };  
  requestAnimationFrame(updateFrame.bind(layer));
}

var Group = createComponent('Group', LayerMixin, ContainerMixin, {

  mountComponent: function (transaction, nativeParent, nativeContainerInfo, context) {
    var props = this._currentElement.props;
    var layer = this.node;
    layer.type = 'group';
    if (props.onClick) {
      var onclick = props.onClick;
      props.onClick = function (ev) {
        setLayerTapped(layer, ev);
        onclick(ev);
      }
    }

    this.applyLayerProps({}, props);
    this.mountAndInjectChildren(props.children, transaction, context);

    return layer;
  },

  receiveComponent: function (nextComponent, transaction, context) {
    var props = nextComponent.props;
    var prevProps = this._currentElement.props;
    this.applyLayerProps(prevProps, props);
    this.updateChildren(props.children, transaction, context);
    this._currentElement = nextComponent;
    this.node.invalidateLayout();
  },

  unmountComponent: function () {
    LayerMixin.unmountComponent.call(this);
    this.unmountChildren();
  }

});

module.exports = Group;
