/** @jsx React.DOM */

'use strict';

var React = require('react');
var ReactCanvas = require('react-canvas');

var Surface = ReactCanvas.Surface;
var Group = ReactCanvas.Group;


var Circle = ReactCanvas.createCustomLayer(function Circle(ctx, props, x, y, width, height) {
  
    var centerX = x + width / 2;
    var centerY = y + height / 2;
   
    var fillColor = props.style.fillColor || '#FFF';
    var strokeColor = props.style.strokeColor || '#FFF';
    var strokeWidth = props.style.strokeWidth || 0;
  
    var radius = Math.min(width / 2, height / 2) - Math.ceil(strokeWidth / 2);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
});

var App = React.createClass({

  render: function () {
    return (
      <Surface top={10} left={10} width={200} height={200}>
          <Circle style={{
            top: 10, 
            left: 10, 
            width: 180,
            height: 180,
            fillColor: 'green', 
            strokeColor: '#000', 
            strokeWidth: 1
          }} />
      </Surface>
    );
  },

});

React.render(<App />, document.getElementById('main'));
