
// To get  x, y, z from a point
function point2vec(p) {
  return [p.x, p.y, p.z];
}

// Caculate the normal vector
function normalOfTriangle(p1, p2, p3) {
  var v1;
  var v2;
  v1 = twgl.v3.subtract(point2vec(p2), point2vec(p1)); // p2-p1
  v2 = twgl.v3.subtract(point2vec(p3), point2vec(p1));
  return twgl.v3.normalize(twgl.v3.cross(v1, v2));// normalize to normal vector
}

// v3 is the eye position m4 is its 4x4 transformation matrix, get the transformed v3
function dotm4v3 (m4, v3) {
	return [twgl.v3.dot([m4[0], m4[1], m4[2]],v3), // 
	        twgl.v3.dot([m4[4], m4[5], m4[6]],v3), // 
			    twgl.v3.dot([m4[8], m4[9], m4[10]],v3)];
}


function getRestrictedColor(colorDivID) {
	var inputColor = parseInt($(colorDivID).val());
	
	if (inputColor < 0 || inputColor > 255) {
	    inputColor = 128;
		$(colorDivID).val(inputColor);
	}

	return inputColor;
}

function calculateGrayKleinBottlePoints (u,v,a,n,m) {
    var p;
    p = {};
    
    p.x = (a + Math.cos(n*u/2) * Math.sin(v) - Math.sin(n*u/2.0) * Math.sin(2*v)) * Math.cos(m*u/2); 
    p.y = (a + Math.cos(n*u/2) * Math.sin(v) - Math.sin(n*u/2.0) * Math.sin(2*v)) * Math.sin(m*u/2);
    p.z = Math.sin(n*u/2) * Math.sin(v) + Math.cos(n*u/2) * Math.sin(2*v);
    return p;
}

function generateGrayKleinBottlePoints (scaleFactor,meshCount,a,n,m) {
    var u, v;
    var point;
    
    var PI2 = 2 * Math.PI;
    var PI4 = 4 * Math.PI;
    var PIDelta = Math.PI / meshCount;

    var modelPoints = [];
    var subPoints;


    for (u  = 0; u < PI4; u += PIDelta) {
      subPoints = [];
      for (v  = 0; v < PI2; v += PIDelta) {
          point = calculateGrayKleinBottlePoints(u, v, a, n, m);
          point.x = scaleFactor * point.x;
          point.y = scaleFactor * point.y;
          point.z = scaleFactor * point.z;
          subPoints.push(point);
      }
      modelPoints.push(subPoints);
    }

    return modelPoints;
}


function generateGLModel(canvas) {
    "use strict";

    twgl.setDefaults({attribPrefix: "a_"});

    var m4 = twgl.m4;
    var v3 = twgl.v3;
    var gl = twgl.getWebGLContext(canvas);
    var programInfo = twgl.createProgramInfo(gl, ["vertex-shader", "fragment-shader"]);
    
    var modelPoints = generateGrayKleinBottlePoints(0.6, $("#meshDensity").val(),
	                                                parseFloat($("#grayParameterA").val()),
													parseFloat($("#grayParameterN").val()),
													parseFloat($("#grayParameterM").val()));
	
    
    var positions = [];
    var normals = [];
    var texcoords = [];
    var indices = [];
    
  
    var count_u = modelPoints.length;
    var count_v = modelPoints[0].length;
    var u,v;
    var position_count = 0;
    var indicesMap = [];
    var indicesSubMap;

    // populate positions and calculate indice map
    for(u = 0; u < count_u; u++ ) {
      indicesSubMap = [];
      for(v = 0; v < count_v ; v++){
        var temp_point = modelPoints[u][v];
        positions.push(temp_point.x, temp_point.y, temp_point.z);
        indicesSubMap.push(position_count);
        position_count++; 
      }
      indicesMap.push(indicesSubMap);
    }

    // generate triangles and calculate normals 
    for(u = 0; u < count_u; u++){
      for(v = 0; v < count_v ; v++){
          var nu1, nu2, nu3, nu4;
          var nv1, nv2, nv3, nv4;
          var normal;

          // wrap index
          nu1 = u % count_u;
          nv1 = v % count_v;
          nu2 = u % count_u;
          nv2 = (v + 1) % count_v;
          nu3 = (u + 1) % count_u;
          nv3 = v % count_v;
          nu4 = (u + 1) % count_u;
          nv4 = (v + 1) % count_v;


          // push the lower left triangle to the indices
          indices.push(indicesMap[nu1][nv1]);
          indices.push(indicesMap[nu2][nv2]);
          indices.push(indicesMap[nu3][nv3]);

          // calucate normal vector
          normal = normalOfTriangle(modelPoints[nu1][nv1], modelPoints[nu2][nv2], modelPoints[nu3][nv3]);
 
          // push normal vector 
          normals.push(normal[0]); normals.push(normal[1]); normals.push(normal[2]);

          texcoords.push(1); texcoords.push(0); texcoords.push(0); texcoords.push(0);

          // push the upper right triangle to the indices
          indices.push(indicesMap[nu2][nv2]);
          indices.push(indicesMap[nu4][nv4]);
          indices.push(indicesMap[nu3][nv3]);

          normal = normalOfTriangle(modelPoints[nu2][nv2], modelPoints[nu4][nv4], modelPoints[nu3][nv3]);

          normals.push(normal[0]); normals.push(normal[1]); normals.push(normal[2]);

          texcoords.push(0); texcoords.push(1); texcoords.push(1); texcoords.push(1);
      }
    }

    
    var arrays = {
      position: positions,
      normal: normals,
      indices: indices,
      texcoord: texcoords,
      
    };

    var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    var tex;
	var selectTextureType = document.getElementById("textureType");
	var textureType = selectTextureType.value;
    if (textureType == "checker") {
		tex	= twgl.createTexture(gl, {
		  min: gl.NEAREST,
		  mag: gl.NEAREST,
		  src: [
			    0,  0,  0, 255,
			255, 255, 255, 255,
			255, 255, 255, 255,
			    0,  0,  0, 255,
		  ],
		});
	} else if (textureType == "strip") {
		tex = twgl.createTexture(gl, {
			mag: gl.NEAREST,
			min: gl.LINEAR,
			format: gl.LUMINANCE,
			src: new Uint8Array([
			  255,
			  128,
			  255,
			  128,
			  255,
			  128,
			  255,
			  128,
			]),
			width: 1,
		});
    }
	
	var lightR = getRestrictedColor("#lightR");
	var lightG = getRestrictedColor("#lightG");
    var lightB = getRestrictedColor("#lightB");

	var objectR = getRestrictedColor("#objectR");
	var objectG = getRestrictedColor("#objectG");
    var objectB = getRestrictedColor("#objectB");
	
	var shaderType = parseInt($("#shaderType").val());
	
    var uniforms = {
      u_lightWorldPos : [0, 0, 20],
      u_lightColor : [lightR/255, lightG/255, lightB/255, 1],
	  u_objectColor : [objectR/255, objectG/255, objectB/255, 1],
      u_ambient : [0, 0, 0, 1],
      u_specular : [1, 1, 1, 1],
      u_shininess : 80,
      u_specularFactor : 1,
      u_diffuse : tex,
	  u_shaderType : shaderType,
    };

    return {
	  canvas : canvas,
      gl : gl,
      tex : tex,
      uniforms : uniforms,
      programInfo : programInfo,
      bufferInfo : bufferInfo
    };
}

function render() {
      var m4 = twgl.m4;
      var gl = GLModel.gl;
      var uniforms = GLModel.uniforms;
      var programInfo = GLModel.programInfo;
      var bufferInfo = GLModel.bufferInfo;

      if (userDrag) {
      } else if (userAmortization) {
        userDX *= AMORTIZATION;
        userDY *= AMORTIZATION;
        setUserTheta(userTheta + userDX, true);
        setUserPhi(userPhi + userDY);
      } else {
        setUserTheta(userTheta + 0.010, true);
      }

      twgl.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      var projection;
	  if ($("#projection").val() == "prespective") {
        projection = m4.perspective(30 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.5, 40);
	  } else {
		projection = m4.ortho(-5, 5, 5, -5, 0.5, 40);
	  }
      var eyeScale = getEyeScale();
      var eyeAngleX = getEyeAngle("sliderCX");
  	  var eyeAngleY = getEyeAngle("sliderCY");
  	  var eyeAngleZ = getEyeAngle("sliderCZ");

      // use identity matrix to create a scale matrix
      var eye = m4.scale(m4.identity(), [eyeScale, eyeScale, eyeScale]);

  	  eye = m4.multiply(m4.rotationX(eyeAngleX),eye);
  	  eye = m4.multiply(m4.rotationY(eyeAngleY),eye);
  	  eye = m4.multiply(m4.rotationZ(eyeAngleZ),eye);
  	  // create a transformed eye position
      eye = dotm4v3(eye, [0, 0, 1]);

      var target = [0, 0, 0];
      var up = [0, 1, 0];

      var camera = m4.lookAt(eye, target, up); 
      var view = m4.inverse(camera);
      var viewProjection = m4.multiply(view, projection);
      var world;
	  
      // rotate model
      world = m4.multiply(m4.rotationZ(userPsi), m4.multiply(m4.rotationY(userTheta), m4.rotationX(userPhi)));

      uniforms.u_viewInverse = camera;
      uniforms.u_world = world;
      uniforms.u_worldInverseTranspose = m4.transpose(m4.inverse(world));
      uniforms.u_worldViewProjection = m4.multiply(world, viewProjection);
	  uniforms.u_time = Date.now() / 1000;

      gl.useProgram(programInfo.program);
      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      twgl.setUniforms(programInfo, uniforms);
      gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);

  	  if (userSlider) {
  		  userSlider = false;
  	  }
  	  else {
            requestAnimationFrame(render);
  	  }
}

var userDX = 0.0;
var userDY = 0.0;
var userOldX;
var userOldY;
var userDrag = false;
var userAmortization = false;
var userTheta = 0.0;
var userPhi = 0.0;
var userPsi = 0.0;
var userTimeout = null;
var userSlider = false;
var AMORTIZATION = 0.95;
var AMORTIZATIONPERIOD = 3000;


function getEyeScale () {
  return $("#sliderCS").val();
}

function getEyeAngle (id) {
  var sliderA = document.getElementById(id);
  return sliderA.value * 0.01 * Math.PI;
}

function wrapToRange (v, rs, re) {
	var p;
	
	if ((v >= rs) && (v < re)) return v;
	
	p = re - rs;
	
	return v - Math.floor((v - rs)/p)*p
}

function setUserTheta (a, setSlider) {
  var sliderX;

  a = wrapToRange(a, -Math.PI, Math.PI);

  userTheta = a;
  
  // make sure when you drag the model, the slide value change accordingly
  if (setSlider) {
    sliderX = $("#sliderX").val();
    sliderX.value = (a * 100) / Math.PI;
  }
}

function setUserPhi (a, setSlider) {
  var sliderY;
  a = wrapToRange(a, -Math.PI, Math.PI);

  userPhi = a;
  if (setSlider) {
    sliderY = $("#sliderY").val();
    sliderY.value = (a * 100) / Math.PI;
  }
}

function setUserPsi (a, setSlider) {
  var sliderZ;
  
  a = wrapToRange(a, -Math.PI, Math.PI);

  userPsi = a;
  
  if (setSlider) {
    sliderZ = $("#sliderZ").val();
    sliderZ.value = (a * 100) / Math.PI;
  }
}

function amortizationBegin() {
   userAmortization = true;
   if (userTimeout != null) {
	 clearTimeout(userTimeout);
   }
   userTimeout = setTimeout(amortizationFinish,AMORTIZATIONPERIOD);
 }
 
function amortizationFinish() {
   userAmortization = false;
   if (userTimeout != null) {
	clearTimeout(userTimeout);
	userTimeout = null;
  }
 }

function mouseDown(e) {
  amortizationFinish();

  userDrag = true;
  userOldX = e.pageX, userOldY = e.pageY;
  e.preventDefault();
  return false;
}

function mouseUp(e) {
  userDrag = false;
  amortizationBegin();
}

function mouseOut(e) {
	if (!userDrag) return false;
	mouseUp();
}

function mouseMove(e) {
  if (!userDrag) return false;
  if (userAmortization) return false;
  userDX = (e.pageX - userOldX) * 2 * Math.PI/GLModel.canvas.width,
  userDY = (e.pageY - userOldY) * 2 * Math.PI/GLModel.canvas.height;
  setUserTheta(userTheta + userDX, true);
  setUserPhi(userPhi + userDY, true);

  userOldX = e.pageX, userOldY = e.pageY;
  e.preventDefault();
}

function setupCanvas () {
    var canvas = document.getElementById("myCanvas");

    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    canvas.addEventListener("mouseout", mouseOut, false);
    canvas.addEventListener("mousemove", mouseMove, false);

    return canvas;
}

function updateGLModel () {
	GLModel = generateGLModel(GLModel.canvas);
}

function setupUserInteraction() {
  var slides = ['sliderCS', 'sliderCX', 'sliderCY', 'sliderCZ', 'sliderX', 'sliderY', 'sliderZ'];
  var slider;
  var i;
  
  for (i = 0; i < slides.length; i++) {
	  slider = document.getElementById(slides[i]);
	  slider.addEventListener("input", function() { 
	    userSlider = true;
	    render(); 
	  });
  }
  
  // add input for model sliders
  slider = document.getElementById('sliderX');
  slider.addEventListener("input", function() {
    var a;
	
    userDX = 0; userDY = 0; amortizationBegin();
	
    a = document.getElementById('sliderX').value;
    setUserTheta(a * 0.01 * Math.PI, false);
  });
  
  slider = document.getElementById('sliderY');
  slider.addEventListener("input", function() { 
    var a;
	
    userDX = 0; userDY = 0; amortizationBegin();
	
    a = document.getElementById('sliderY').value;
    setUserPhi(a * 0.01 * Math.PI, false);
  });
  
  slider = document.getElementById('sliderZ');
  slider.addEventListener("input", function() { 
    var a;
	
    userDX = 0; userDY = 0; amortizationBegin();
	
    a = document.getElementById('sliderZ').value;
	
    setUserPsi(a * 0.01 * Math.PI, false);
  });
  

  $("#meshDensity").change(updateGLModel);
  
  $("#grayParameterA").blur(updateGLModel);
  $("#grayParameterN").blur(updateGLModel);
  $("#grayParameterM").blur(updateGLModel);
  
  $("#projection").change(updateGLModel);

  $("#textureTypeSection").hide();
  $("#shaderType").change(function () {
	  $("#objectColorSection").hide();
      $("#textureTypeSection").hide();
	  
	  if ($(this).val() == 1) {
		$("#textureTypeSection").show();
	  } else if ($(this).val() == 2) {
		$("#objectColorSection").show();
	  }
	  
	  updateGLModel();
  });
  
  $("#textureType").change(updateGLModel);
  
  $("#lightR").blur(updateGLModel);
  $("#lightG").blur(updateGLModel);
  $("#lightB").blur(updateGLModel);
  
  $("#randomLightColor").click(function(event) {
	  event.preventDefault();
	  
	  $("#lightR").val(Math.floor(Math.random()*255));
	  $("#lightG").val(Math.floor(Math.random()*255));
	  $("#lightB").val(Math.floor(Math.random()*255));
	  
	  updateGLModel();
  });
  
  $("#objectR").blur(updateGLModel);
  $("#objectG").blur(updateGLModel);
  $("#objectB").blur(updateGLModel);
  
    $("#randomObjectColor").click(function(event) {
	  event.preventDefault();
	  
	  $("#objectR").val(Math.floor(Math.random()*255));
	  $("#objectG").val(Math.floor(Math.random()*255));
	  $("#objectB").val(Math.floor(Math.random()*255));
	  
	  updateGLModel();
  });
}

var GLModel;

window.onload = function() {
    var canvas = setupCanvas();
    GLModel = generateGLModel(canvas);
    setupUserInteraction();
    requestAnimationFrame(render);
};


