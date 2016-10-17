var myCanvas = null;
var context = null;
var kinectron = null;

function setup() {
	myCanvas = createCanvas(1000,1000);
	context = myCanvas.drawingContext;

	//console.log(myCanvas.drawingContext);
	background(255);

	// Enter peer credentials provided by Kinectron 
	kinectron = new Kinectron();
	kinectron.makeConnection();

	kinectron.setRGBCallback(rgbCallback);
	kinectron.setDepthCallback(depthCallback);
	// kinectron.setBodyCallback(bodyCallback);
	// kinectron.setRawDepthCallback(rawDepthCallback);
}

function draw() {

}

function keyPressed() {
	if (keyCode === ENTER) {
	 	kinectron.startMultiFrame(["color", "body"]);
	} 
 }

function rgbCallback(img) {
	background(255, 100);
	loadImage(img.src, function(loadedImage) {
    image(loadedImage, 0, 0);
  });

}

function depthCallback(img) {
	background(255, 100);
	loadImage(img.src, function(loadedImage) {
    image(loadedImage, 0, 0);
  });
}

// function rawDepthCallback(data) {
// 	//console.log('raw', data);
// }

// function bodyCallback(body) {

// 	//find tracked bodies
// 	for (var i = 0; i < body.length; i++) {
// 		if (body[i].tracked === true) {
// 			bodyTracked(body[i]);
// 		}
// 	}
// }

// function bodyTracked(body) {

// 	//draw joints in tracked bodies 
//   context.fillStyle = '#000000';
//   context.fillRect(0, 300, 700, 700);

//   // kinectron.getJoints(drawJoint); 
//   // kinectron.getHands(drawHands);

//   for(var jointType in body.joints) {
// 	  var joint = body.joints[jointType];
// 	  context.fillStyle = '#ff0000';
// 	  context.fillRect(joint.depthX * canvas.width, joint.depthY * canvas.height, 10, 10);
	  
// 	}
// }


