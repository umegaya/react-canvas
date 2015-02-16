'use strict';

var createComponent = require('./createComponent');
var LayerMixin = require('./LayerMixin');

/**
 * Given a string of text, available width, and font return the measured width
 * and height.
 * @param {String} text The input string
 */
function createCustomLayer(name, drawFunction) {
  if (typeof name === 'function') {
    drawFunction = name;
    name = drawFunction.name;
  }
  
  return createComponent(name, LayerMixin, {
    
    applyCustomLayerProps: function (prevProps, props) {
      var layer = this.node;
      layer.type = 'custom-layer';
      layer.customDraw = drawFunction;
      layer.elementProps = props;
    },
    
    mountComponent: function (rootID, transaction, context) {
      var props = this._currentElement.props;
      var layer = this.node;
      this.applyLayerProps({}, props);
      this.applyCustomLayerProps({}, props);
      return layer;
    },

    receiveComponent: function (nextComponent, transaction, context) {
      var prevProps = this._currentElement.props;
      var props = nextComponent.props;
      this.applyLayerProps(prevProps, props);
      this.applyCustomLayerProps({}, props);
      this._currentElement = nextComponent;
      this.node.invalidateLayout();
    }
  });
}



module.exports = createCustomLayer;
