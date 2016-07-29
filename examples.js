var Kinect2 = require('kinect2');
var kinect = new Kinect2();

var mypeerid = null;
var peer = null;
var peer_ids = [];
var peer_connections = [];

var canvas = null;
var context = null;

var outputCanvas = null;
var outputContext = null;

var imageData = null;
var imageDataSize = null;
var imageDataArray = null;

var busy = false;

// Key Tracking needs cleanup
var trackedBodyIndex = -1;
var emptyPixels = new Uint8Array(1920 * 1080 * 4);

// Skeleton variables
var colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
var HANDSIZE = 20;
var HANDCLOSEDCOLOR = 'red';
var HANDOPENCOLOR = 'green';
var HANDLASSOCOLOR = 'blue';

window.addEventListener('load', initpeer);
window.addEventListener('load', init);

function init() {
  document.getElementById('loadfile').addEventListener('change', loadFile);
  canvas = document.getElementById('inputCanvas');
  context = canvas.getContext('2d');

  outputCanvas = document.getElementById('outputCanvas');
  outputContext = outputCanvas.getContext('2d');

  setImageData();
}

function initpeer() {
    peer = new Peer('l',{host: 'liveweb.itp.io', port: 9000, path: '/', secure: true});

    peer.on('error',function(err) {
      console.log(err);
    });

    peer.on('open', function(id) {
      console.log('My peer ID is: ' + id);
      mypeerid = id;
  });

  peer.on('connection', function(conn) {
    connection = conn;
    console.log("Got a new data connection from peer: " + connection.peer);
    peer_connections.push(connection);

    connection.on('open', function() {
      console.log("Connection opened.");
    });
    connection.on('data', function(data) {
      console.log("Data Received: " + data);
    });
  });
}

function sendToPeer(evt, data) {
  var dataToSend = {"event": evt, "data": data};
  peer_connections.forEach(function(connection) {
    connection.send(dataToSend);
  });
}

function startKey() {
  console.log('starting key');

  resetCanvas(context, 'color');
  resetCanvas(outputContext, 'color');
  setImageData();

  if(kinect.open()) {
      kinect.on('multiSourceFrame', function(frame) {

        if(busy) {
          return;
        }
        busy = true;

        var closestBodyIndex = getClosestBodyIndex(frame.body.bodies);
        if(closestBodyIndex !== trackedBodyIndex) {
          if(closestBodyIndex > -1) {
            kinect.trackPixelsForBodyIndices([closestBodyIndex]);
          } else {
            kinect.trackPixelsForBodyIndices(false);
          }
        }
        else {
          if (closestBodyIndex > -1) {
            if (frame.bodyIndexColor.bodies[closestBodyIndex].buffer) {

              newPixelData = frame.bodyIndexColor.bodies[closestBodyIndex].buffer

              for (var i = 0; i < imageDataSize; i++) {
                imageDataArray[i] = newPixelData[i];
              }

              drawAndSendImage('key');
            }
          }
        }
        trackedBodyIndex = closestBodyIndex;
        busy = false;

      }); // kinect.on
    } // open
      kinect.openMultiSourceReader({
        frameTypes: Kinect2.FrameType.bodyIndexColor | Kinect2.FrameType.body
      });
}

function stopKey() {
  kinect.closeMultiSourceReader();
  busy = false;
}

function startTracking() {
      if (kinect.open()) {
         console.log("Kinect Opened");

         //listen for body frames
          kinect.on('bodyFrame', function(bodyFrame){
            sendToPeer('bodyFrame',bodyFrame);
              // for (var i = 0;  i < bodyFrame.bodies.length; i++) {
              //      if (bodyFrame.bodies[i].tracked) {
              //        console.log("Tracked");
              //        sendToPeer('bodyFrame',bodyFrame);
              //        console.log(bodyFrame);
              //      }
              // }
          });

          //request body frames
          kinect.openBodyReader();
      }
}

function stopTracking() {
  kinect.close();
  busy = false;
}

function startRGB() {

  resetCanvas(context, 'color');
  resetCanvas(outputContext, 'color');
  setImageData();

  if(kinect.open()) {
    kinect.on('colorFrame', function(newPixelData){
      //console.log(newPixelData.length);
      if(busy) {
        return;
      }
      busy = true;
      //sendToPeer('colorFrame',newPixelData);

      for (var i = 0; i < imageDataSize; i++) {
        imageDataArray[i] = newPixelData[i];
      }

      drawAndSendImage('color');
      busy = false;

    });
  }
  kinect.openColorReader();

}

function stopRGB() {
  kinect.closeColorReader();
  busy = false;
}

function startDepth() {
  console.log("startDepth Camera");

  resetCanvas(context, 'depth');
  resetCanvas(outputContext, 'depth');
  setImageData();

  if(kinect.open()) {
    kinect.on('depthFrame', function(newPixelData){
      console.log("depthFrame");
            if(busy) {
              return;
            }
            busy = true;

            newPixelDataIndex = 0;
            for (var i = 0; i < imageDataSize; i+=4) {
              imageDataArray[i] = newPixelData[newPixelDataIndex];
              imageDataArray[i+1] = newPixelData[newPixelDataIndex];
              imageDataArray[i+2] = newPixelData[newPixelDataIndex];
              imageDataArray[i+3] = newPixelData[newPixelDataIndex];
              newPixelDataIndex++;
            }

            drawAndSendImage('depth');
            busy = false;
          });
        }
  kinect.openDepthReader();
}

function stopDepth() {
  kinect.closeDepthReader();
  busy = false;
}

function startInfrared() {
  console.log('starting Infrared Camera');

  resetCanvas(context, 'depth');
  resetCanvas(outputContext, 'depth');
  setImageData();
     
  if(kinect.open()) {
    kinect.on('infraredFrame', function(imageBuffer){
      
      if(busy) {
        return;
      }
      busy = true;

      var pixelArray = imageData.data;
      var newPixelData = new Uint8Array(imageBuffer);
      var depthPixelIndex = 0;

      for (var i = 0; i < imageDataSize; i+=4) {
        pixelArray[i] = newPixelData[depthPixelIndex];
        pixelArray[i+1] = newPixelData[depthPixelIndex];
        pixelArray[i+2] = newPixelData[depthPixelIndex];
        pixelArray[i+3] = 0xff;
        depthPixelIndex++;
      }

      drawAndSendImage('infrared');
      busy = false;
    });
  }

  kinect.openInfraredReader();

}

function stopInfrared() {
  console.log('stopping Infrared Camera');
  kinect.closeInfraredReader();
  busy = false;
}

function startLEInfrared() {
  console.log('starting LE Infrared');

  resetCanvas(context, 'depth');
  resetCanvas(outputContext, 'depth');
  setImageData();


  if(kinect.open()) {
    kinect.on('longExposureInfraredFrame', function(imageBuffer){
      if(busy) {
        return;
      }
      busy = true;
      
      var pixelArray = imageData.data;
      var newPixelData = new Uint8Array(imageBuffer);
      var depthPixelIndex = 0;
      for (var i = 0; i < imageDataSize; i+=4) {
        pixelArray[i] = newPixelData[depthPixelIndex];
        pixelArray[i+1] = newPixelData[depthPixelIndex];
        pixelArray[i+2] = newPixelData[depthPixelIndex];
        pixelArray[i+3] = 0xff;
        depthPixelIndex++;
      }
      
      drawAndSendImage('LEinfrared');

      busy = false;
    });

  }

  kinect.openLongExposureInfraredReader();
}

function stopLEInfrared() {
  console.log('stopping LE Infrared');
  kinect.closeLongExposureInfraredReader();
  busy = false;
}

function startFHJoint() {

  resetCanvas(context, 'color');
  resetCanvas(outputContext, 'color');
  setImageData();
  
  trackedBodyIndex = -1;

  if(kinect.open()) {
    kinect.on('multiSourceFrame', function(frame){
      console.log('fh');
      console.log(trackedBodyIndex);
      if(busy) {
        return;
      }
      busy = true;
    
      // draw color image to canvas          
      var newPixelData = frame.color.buffer;
      for (var i = 0; i < imageDataSize; i++) {
        imageDataArray[i] = newPixelData[i];
      }

      drawAndSendImage('fhcolor');
  
      // get closest body
      var closestBodyIndex = getClosestBodyIndex(frame.body.bodies);
      if(closestBodyIndex !== trackedBodyIndex) {
        if(closestBodyIndex > -1) {
          kinect.trackPixelsForBodyIndices([closestBodyIndex]);
        } else {
          kinect.trackPixelsForBodyIndices(false);
        }
      }
      else {
        if(closestBodyIndex > -1) {
          //measure distance from floor
          if(frame.body.floorClipPlane)
          {
            //get position of left hand
            var joint = frame.body.bodies[closestBodyIndex].joints[Kinect2.JointType.handLeft];

            //https://social.msdn.microsoft.com/Forums/en-US/594cf9ed-3fa6-4700-872c-68054cac5bf0/angle-of-kinect-device-and-effect-on-xyz-positional-data?forum=kinectv2sdk
            var cameraAngleRadians= Math.atan(frame.body.floorClipPlane.z / frame.body.floorClipPlane.y);
            var cosCameraAngle = Math.cos(cameraAngleRadians);
            var sinCameraAngle = Math.sin(cameraAngleRadians);
            var yprime = joint.cameraY * cosCameraAngle + joint.cameraZ * sinCameraAngle;
            var jointDistanceFromFloor = frame.body.floorClipPlane.w + yprime;

            //show height in canvas
            showHeight(context, joint, jointDistanceFromFloor);
            showHeight(outputContext, joint, jointDistanceFromFloor);

            //send height data to remote
            var jointDataToSend = {joint: joint, distance: jointDistanceFromFloor};

            sendToPeer('floorHeightTracker', jointDataToSend);
          }
        }
      }

      trackedBodyIndex = closestBodyIndex;
      busy = false;
    });

    kinect.openMultiSourceReader({
      frameTypes: Kinect2.FrameType.body | Kinect2.FrameType.color
    });
  }
}

function stopFHJoint() {
  console.log('stopping FHJoint');
  kinect.closeMultiSourceReader();
  busy = false;
}

function startScaleUser() {
  console.log('start scale user');

  resetCanvas(context, 'color');
  resetCanvas(outputContext, 'color');
  setImageData();

  trackedBodyIndex = -1;

  if(kinect.open()) {
  kinect.on('multiSourceFrame', function(frame){
    console.log('scale');
    console.log(trackedBodyIndex);
    var closestBodyIndex = getClosestBodyIndex(frame.body.bodies);
    if(closestBodyIndex !== trackedBodyIndex) {
      if(closestBodyIndex > -1) {
        kinect.trackPixelsForBodyIndices([closestBodyIndex]);
      } else {
        kinect.trackPixelsForBodyIndices(false);
      }
    }
    else {
      if(closestBodyIndex > -1) {
        //get body ground position - when use jumps this point stays on the ground
        if(frame.body.bodies[closestBodyIndex].joints[Kinect2.JointType.spineMid].floorColorY)
        {
          //calculate the source rectangle
          var leftJoint = frame.body.bodies[closestBodyIndex].joints[0],
              topJoint = frame.body.bodies[closestBodyIndex].joints[0],
              rightJoint = frame.body.bodies[closestBodyIndex].joints[0];
          for(var i = 1; i < frame.body.bodies[closestBodyIndex].joints.length; i++) {
            var joint = frame.body.bodies[closestBodyIndex].joints[i];
            if(joint.colorX < leftJoint.colorX) {
              leftJoint = joint;
            }
            if(joint.colorX > rightJoint.colorX) {
              rightJoint = joint;
            }
            if(joint.colorY < topJoint.colorY) {
              topJoint = joint;
            }
          }

          var pixelWidth = calculatePixelWidth(frame.bodyIndexColor.horizontalFieldOfView, frame.body.bodies[closestBodyIndex].joints[Kinect2.JointType.spineMid].cameraZ * 1000);
          scale = 0.3 * pixelWidth;

          //head joint is in middle of head, add area (y-distance from neck to head joint) above
          topJoint = {
            colorX: topJoint.colorX,
            colorY: Math.min(topJoint.colorY, frame.body.bodies[closestBodyIndex].joints[Kinect2.JointType.head].colorY - (frame.body.bodies[closestBodyIndex].joints[Kinect2.JointType.neck].colorY - frame.body.bodies[closestBodyIndex].joints[Kinect2.JointType.head].colorY))
          };
          var srcRect = {
            x: leftJoint.colorX * canvas.width,
            y: topJoint.colorY * canvas.height,
            width: (rightJoint.colorX - leftJoint.colorX) * canvas.width,
            height: (frame.body.bodies[closestBodyIndex].joints[Kinect2.JointType.spineMid].floorColorY - topJoint.colorY) * canvas.height
          };
          var dstRect = {
            x: outputCanvas.width * 0.5,
            y: outputCanvas.height - (srcRect.height * scale),
            width: srcRect.width * scale,
            height: srcRect.height * scale
          };
          //center the user horizontally - is not minus half width of image as user might reach to one side or the other
          //do minus the space on the left size of the spine
          var spaceLeft = frame.body.bodies[closestBodyIndex].joints[Kinect2.JointType.spineMid].colorX - leftJoint.colorX;
          dstRect.x -= (spaceLeft * canvas.width * scale);
          
          newPixelData = frame.bodyIndexColor.bodies[closestBodyIndex].buffer;

          for (var i = 0; i < imageDataSize; i++) {
            imageDataArray[i] = newPixelData[i];
          }
          
          context.putImageData(imageData, 0, 0);
          outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
          outputContext.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);
          console.log(outputCanvas);  
          sendToPeer('colorFrame',outputCanvas.toDataURL("image/jpeg", 0.5));
        }
      }
    }

    trackedBodyIndex = closestBodyIndex;
  });

  //include the projected floor positions - we want to keep the floor on the bottom, not crop out the user in the middle of a jump
  kinect.openMultiSourceReader({
    frameTypes: Kinect2.FrameType.body | Kinect2.FrameType.bodyIndexColor,
    includeJointFloorData: true
  });
}
}

function stopScaleUser() {
  console.log('stop scale user');
  kinect.closeMultiSourceReader();
  busy = false;
}      

function startSkeletonTracking() {
  console.log('starting skeleton');
  
  resetCanvas(context, 'depth');
  resetCanvas(outputContext, 'depth');

  if(kinect.open()) {
    //console.log('kinect opened');
    kinect.on('bodyFrame', function(bodyFrame){

      context.clearRect(0, 0, canvas.width, canvas.height);
      outputContext.clearRect(0, 0, canvas.width, canvas.height);
      var index = 0;
      bodyFrame.bodies.forEach(function(body){
        if(body.tracked) {
          sendToPeer('bodyFrame', body);
          for(var jointType in body.joints) {
            var joint = body.joints[jointType];
            context.fillStyle = colors[index];
            context.fillRect(joint.depthX * canvas.width, joint.depthY * canvas.height, 10, 10);
            outputContext.fillStyle = colors[index];
            outputContext.fillRect(joint.depthX * outputCanvas.width, joint.depthY * outputCanvas.height, 10, 10);
          }
          //draw hand states
          updateHandState(context, body.leftHandState, body.joints[Kinect2.JointType.handLeft]);
          updateHandState(outputContext, body.leftHandState, body.joints[Kinect2.JointType.handLeft]);
          updateHandState(context, body.rightHandState, body.joints[Kinect2.JointType.handRight]);
          updateHandState(outputContext, body.rightHandState, body.joints[Kinect2.JointType.handRight]);

          index++;

        }
      });
    });
    kinect.openBodyReader();
      }

}

function stopSkeletonTracking() {
  console.log('stopping skeleton');
  kinect.closeBodyReader();

}

function loadFile(e) {
  //console.log(e);
  window.location.href = e.target.files[0].path;
}

function setImageData() {
  imageData = context.createImageData(canvas.width, canvas.height);
  imageDataSize = imageData.data.length;
  imageDataArray = imageData.data;
}

function resetCanvas(context, size) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  sendToPeer('clearCanvas', {});
  
  if (size == 'depth') {
    context.canvas.width = 512;
    context.canvas.height = 424;
    sendToPeer('framesize', {'size': 'depth'});
  } else if (size == 'color') {
    context.canvas.width = 1920;
    context.canvas.height = 1080; 
    sendToPeer('framesize', {'size': 'color'});
  }
}
    
function drawAndSendImage(frameType) {
  var outputCanvasData;
  var dataToSend;

  context.putImageData(imageData, 0, 0);
  outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputContext.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);
  outputCanvasData = outputCanvas.toDataURL("image/jpeg", 0.5);
  dataToSend = {'name': frameType, 'imagedata': outputCanvasData};

  sendToPeer('frame', dataToSend);
}

function getClosestBodyIndex(bodies) {
  var closestZ = Number.MAX_VALUE;
  var closestBodyIndex = -1;
  for(var i = 0; i < bodies.length; i++) {
    if(bodies[i].tracked && bodies[i].joints[Kinect2.JointType.spineMid].cameraZ < closestZ) {
      closestZ = bodies[i].joints[Kinect2.JointType.spineMid].cameraZ;
      closestBodyIndex = i;
    }
  }
  return closestBodyIndex;
}

function calculateLength(joints) {
  var length = 0;
  var numJoints = joints.length;
  for(var i = 1; i < numJoints; i++) {
    length += Math.sqrt(Math.pow(joints[i].colorX - joints[i-1].colorX, 2) + Math.pow(joints[i].colorY - joints[i-1].colorY, 2));
  }
  return length;
}

function calculatePixelWidth(horizontalFieldOfView, depth)
{
  // measure the size of the pixel
  var hFov = horizontalFieldOfView / 2;
  var numPixels = canvas.width / 2;
  var T = Math.tan((Math.PI * 180) / hFov);
  var pixelWidth = T * depth;
  return pixelWidth / numPixels;
}

function showHeight(context, joint, jointDistance) {
  context.beginPath();
  context.fillStyle = 'red';
  context.arc(joint.colorX * context.canvas.width, joint.colorY * context.canvas.height, 10, 0, Math.PI * 2, true);
  context.fill();
  context.closePath();
  context.font = '48px sans';
  context.fillText(jointDistance.toFixed(2) + 'm', 20 + joint.colorX * context.canvas.width, joint.colorY * context.canvas.height);
}

function updateHandState(context, handState, jointPoint) {
  switch (handState) {
    case Kinect2.HandState.closed:
      drawHand(context, jointPoint, HANDCLOSEDCOLOR);
    break;

    case Kinect2.HandState.open:
      drawHand(context, jointPoint, HANDOPENCOLOR);
    break;

    case Kinect2.HandState.lasso:
      drawHand(context, jointPoint, HANDLASSOCOLOR);
    break;
  }
}

function drawHand(context, jointPoint, handColor) {
  // draw semi transparent hand cicles
  var handData = {depthX: jointPoint.depthX, depthY: jointPoint.depthY, handColor: handColor, handSize: HANDSIZE};
  //sendToPeer('drawHand', handData);
  context.globalAlpha = 0.75;
  context.beginPath();
  context.fillStyle = handColor;
  context.arc(jointPoint.depthX * 512, jointPoint.depthY * 424, HANDSIZE, 0, Math.PI * 2, true);
  context.fill();
  context.closePath();
  context.globalAlpha = 1;
}