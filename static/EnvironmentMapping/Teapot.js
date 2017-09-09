var shaderProgram1; //Shader program for Skybox
var shaderProgram2; //Shader program for Teapot


// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;
// Create a place to store terrain geometry
var cubeVertexBuffer;
// Create a place to store the triangles
var cubeTriIndexBuffer;

//Pot arrays
var potVertices = [];
var potFaces = [];
var potNormals = [];

// Create ModelView matrices
var mvMatrix1 = mat4.create();
var mvMatrix2 = mat4.create();
var nMatrix = mat3.create();

//Create Projection matrices
var pMatrix1 = mat4.create();
var pMatrix2 = mat4.create();

//We need the stack only for rendering the cube
var mvMatrixStack = [];

// Create a place to store the texture

//For textures
var cubeImage;
var cubeTexture;

//For animation 
var then =0;
var worldRotate = 0;
var modelYRotationRadians = degToRad(0);
var rotAngle = 0;
var deg = 0;

/**
 * Sends Modelview matrix to shader, 1 corresponds to Skybox, 2 corresponds to Teapot
 */
function uploadModelViewMatrixToShader1() {
  gl.uniformMatrix4fv(shaderProgram1.mvMatrixUniform, false, mvMatrix1);
}
function uploadModelViewMatrixToShader2() {
  gl.uniformMatrix4fv(shaderProgram2.mvMatrixUniform, false, mvMatrix2);
}

/**
 * Sends projection matrix to shader, 1 corresponds to Skybox, 2 corresponds to Teapot
 */
function uploadProjectionMatrixToShader1() {
  gl.uniformMatrix4fv(shaderProgram1.pMatrixUniform, 
                      false, pMatrix1);
}
function uploadProjectionMatrixToShader2() {
  gl.uniformMatrix4fv(shaderProgram2.pMatrixUniform, 
                      false, pMatrix2);
}

//send nMatrix to shader, only teapot requires Shading for now
//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  //create your nMatrix here
  //this line sets the nMatrix to the mvMatrix
  mat3.fromMat4(nMatrix,mvMatrix2);
    
  //the normal matrix is the inverse transpose of the mvMatrix.
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
    
  //this line send the nMatrix to the shader
  gl.uniformMatrix3fv(shaderProgram2.nMatrixUniform, false, nMatrix);
}


/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix1);
    mvMatrixStack.push(copy);
}


/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix1 = mvMatrixStack.pop();
}

/**
 * Sends projection/modelview matrices to shader, 1 corresponds to Skybox, 2 corresponds to Teapot
 */
function setMatrixUniforms1() {
    uploadModelViewMatrixToShader1();
    uploadProjectionMatrixToShader1();
}
function setMatrixUniforms2() {
    uploadModelViewMatrixToShader2();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader2();
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {

  //Setting up shader program for Skybox---------------------------------------------------
  vertexShader1 = loadShaderFromDOM("shader-vs-cube");
  fragmentShader1 = loadShaderFromDOM("shader-fs-cube");
 
  shaderProgram1 = gl.createProgram();
  gl.attachShader(shaderProgram1, vertexShader1);
  gl.attachShader(shaderProgram1, fragmentShader1);
  gl.linkProgram(shaderProgram1);

  if (!gl.getProgramParameter(shaderProgram1, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }
    
  shaderProgram1.texCoordAttribute = gl.getAttribLocation(shaderProgram1, "aTexCoord");
  console.log("Tex coord attrib: ", shaderProgram1.texCoordAttribute);
  gl.enableVertexAttribArray(shaderProgram1.texCoordAttribute);
    
  shaderProgram1.vertexPositionAttribute = gl.getAttribLocation(shaderProgram1, "aVertexPosition1");
  console.log("Vertex attrib: ", shaderProgram1.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram1.vertexPositionAttribute);
    
  shaderProgram1.mvMatrixUniform = gl.getUniformLocation(shaderProgram1, "uMVMatrix1");
  shaderProgram1.pMatrixUniform = gl.getUniformLocation(shaderProgram1, "uPMatrix1");
  
  //POT SHADER STUFF
  vertexShader2 = loadShaderFromDOM("shader-vs-pot");
  fragmentShader2 = loadShaderFromDOM("shader-fs-pot");
  
  shaderProgram2 = gl.createProgram();
  gl.attachShader(shaderProgram2, vertexShader2);
  gl.attachShader(shaderProgram2, fragmentShader2);
  gl.linkProgram(shaderProgram2);

  if (!gl.getProgramParameter(shaderProgram2, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  //Setting up shader program for teapot------------------------------------------------

  shaderProgram2.vertexPositionAttribute = gl.getAttribLocation(shaderProgram2, "aVertexPosition2");
  gl.enableVertexAttribArray(shaderProgram2.vertexPositionAttribute);
    
  shaderProgram2.vertexNormalAttribute = gl.getAttribLocation(shaderProgram2, "aVertexNormal2");
  gl.enableVertexAttribArray(shaderProgram2.vertexNormalAttribute);

  shaderProgram2.mvMatrixUniform = gl.getUniformLocation(shaderProgram2, "uMVMatrix2");
  shaderProgram2.pMatrixUniform = gl.getUniformLocation(shaderProgram2, "uPMatrix2");
  shaderProgram2.nMatrixUniform = gl.getUniformLocation(shaderProgram2, "uNMatrix");
  shaderProgram2.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram2, "uLightPosition");   
    
  shaderProgram2.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram2, "uAmbientLightColor");  
  shaderProgram2.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram2, "uDiffuseLightColor");
  shaderProgram2.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram2, "uSpecularLightColor");
    
  shaderProgram2.uniformRotLoc = gl.getUniformLocation(shaderProgram2, "rotation"); 
    
  shaderProgram2.uniformWorldRotLoc = gl.getUniformLocation(shaderProgram2, "worldRotation"); 
    
  shaderProgram2.uniformEnableReflection = gl.getUniformLocation(shaderProgram2, "enableReflection"); 
}

//For teapot, for Phing-blong shading
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram2.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram2.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram2.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram2.uniformSpecularLightColorLoc, s);
}

/**
 * Draw a cube based on buffers.
 */
function drawCube(){

  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.vertexAttribPointer(shaderProgram1.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // Set the texture coordinates attribute for the vertices.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
  gl.vertexAttribPointer(shaderProgram1.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

  // Specify the texture to map for each face, and render it separately.
  setMatrixUniforms1();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture1);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler1"), 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer1);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture2);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler2"), 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer2);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture3);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler3"), 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer3);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture4);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler4"), 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer4);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture5);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler5"), 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer5);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture6);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler6"), 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer6);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

  
}

/**
 * Draw call that applies matrix transformations to cube
 */
function draw() { 
    gl.useProgram(shaderProgram1);
    var transformVec1 = vec3.create();
    var scaleVec1 = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix1,degToRad(80),gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
 
    //Draw the skybox
    mvPushMatrix();
    vec3.set(transformVec1,0.0,0.0,0.0);
    vec3.set(scaleVec1,1.0,1.0,1.0);
    mat4.scale(mvMatrix1, mvMatrix1,scaleVec1);
    mat4.translate(mvMatrix1, mvMatrix1,transformVec1);
    //mat4.rotateX(mvMatrix,mvMatrix,modelXRotationRadians);
    mat4.rotateY(mvMatrix1,mvMatrix1,modelYRotationRadians);
    mat4.rotateY(mvMatrix1,mvMatrix1,degToRad(-worldRotate));
    setMatrixUniforms1();    
    drawCube();
    mvPopMatrix();
    
  //Draw the teapot
  gl.useProgram(shaderProgram2);
  var transformVec = vec3.create();
  var lightFix = vec3.create();
  vec3.set(lightFix,0.5,-0.5,-0.5);
  lightFix[0] = lightFix[0] * Math.cos((worldRotate)/32);
  lightFix[2] = lightFix[2] * Math.sin((worldRotate)/32);
  mat4.identity(mvMatrix2);
    
  uploadLightsToShader(lightFix,[0.1,0.1,0.1],[1.0,0.0,0.0],[0.8,0.8,0.8]);
  
  //Make affine transfmations
  mat4.translate(mvMatrix2, mvMatrix2, [0.0,-0.3,0.0]);
  mat4.scale(mvMatrix2, mvMatrix2, [0.3,0.3,0.3]);
  //mat4.rotateY(mvMatrix2,mvMatrix2,degToRad(worldRotate));
  mat4.rotateY(mvMatrix2, mvMatrix2, degToRad(rotAngle));
  mat4.rotateZ(mvMatrix2, mvMatrix2, degToRad(30));
 
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram2, "uCubeSampler"), 1);

  gl.enableVertexAttribArray(shaderProgram2.aVertexTextureCoords);
    
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram2.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  // Bind normal buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
  gl.vertexAttribPointer(shaderProgram2.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   

  setMatrixUniforms2();
 
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceIndexBuffer);
  setMatrixUniforms2();
  gl.drawElements(gl.TRIANGLES, faceIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

  gl.uniform1f(shaderProgram2.uniformEnableReflection, 1.0);

}

/**
 * Creates texture for application to cube.
 */
function setupTextures() {
  cubeTexture1 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture1);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));

  cubeImage1 = new Image();
  cubeImage1.onload = function() { handleTextureLoaded(cubeImage1, cubeTexture1); }
  cubeImage1.src = "/static/EnvironmentMapping/pos-x.png";
    
  cubeTexture2 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture2);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));

  cubeImage2 = new Image();
  cubeImage2.onload = function() { handleTextureLoaded(cubeImage2, cubeTexture2); }
  cubeImage2.src = "/static/EnvironmentMapping/neg-x.png";
    
  cubeTexture3 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture3);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));

  cubeImage3 = new Image();
  cubeImage3.onload = function() { handleTextureLoaded(cubeImage3, cubeTexture3); }
  cubeImage3.src = "/static/EnvironmentMapping/pos-y.png";
    
  cubeTexture4 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture4);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));

  cubeImage4 = new Image();
  cubeImage4.onload = function() { handleTextureLoaded(cubeImage4, cubeTexture4); }
  cubeImage4.src = "/static/EnvironmentMapping/neg-y.png";
    
  cubeTexture5 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture5);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));

  cubeImage5 = new Image();
  cubeImage5.onload = function() { handleTextureLoaded(cubeImage5, cubeTexture5); }
  cubeImage5.src = "/static/EnvironmentMapping/pos-z.png";
    
  cubeTexture6 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture6);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));

  cubeImage6 = new Image();
  cubeImage6.onload = function() { handleTextureLoaded(cubeImage6, cubeTexture6); }
  cubeImage6.src = "/static/EnvironmentMapping/neg-z.png";
  }

/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
function handleTextureLoaded(image, texture) {
  //console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     //console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     //console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}


function setupCubeMap() {
	cubeTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
	gl.texImage2D(gl.TEXTURE_CUBE_MAP, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, cubeTexture, "/static/EnvironmentMapping/neg-xT.png");  
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, cubeTexture, "/static/EnvironmentMapping/pos-xT.png"); 
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, cubeTexture, "/static/EnvironmentMapping/pos-yT.png");  
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, cubeTexture, "/static/EnvironmentMapping/neg-yT.png");  
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, cubeTexture, "/static/EnvironmentMapping/neg-zT.png");  
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, cubeTexture, "/static/EnvironmentMapping/pos-zT.png");

}

function loadCubeMapFace(gl, target, texture, url){
	var image = new Image();
	image.onload = function()
	{
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
		gl.texImage2D(target,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	}
	image.src = url;

}

/**
 * Sets up buffers for cube.
 */
/**
 * Populate buffers with data
 */
function setupBuffers() {

  // Create a buffer for the cube's vertices.

  cubeVertexBuffer = gl.createBuffer();

  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

  // Now create an array of vertices for the cube.

  var vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Map the texture onto the cube's faces.

  cubeTCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);

  var textureCoordinates = [
    // Front
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Back
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Top
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Bottom
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Right
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Left
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.
//1//
  cubeTriIndexBuffer1 = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer1);
  var cubeVertexIndices1 = [0,1,2,0,2,3];
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices1), gl.STATIC_DRAW);
//2//
  cubeTriIndexBuffer2 = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer2);
  var cubeVertexIndices2 = [4,5,6,4,6,7];
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices2), gl.STATIC_DRAW);
//3//
  cubeTriIndexBuffer3 = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer3);
  var cubeVertexIndices3 = [8,9,10,8,10,11];
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices3), gl.STATIC_DRAW);
//4//
  cubeTriIndexBuffer4 = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer4);
  var cubeVertexIndices4 = [12,13,14,12,14,15];
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices4), gl.STATIC_DRAW);
//5//
  cubeTriIndexBuffer5 = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer5);
  var cubeVertexIndices5 = [16,17,18,16,18,19];
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices5), gl.STATIC_DRAW);
//6//
  cubeTriIndexBuffer6 = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer6);
  var cubeVertexIndices6 = [20,21,22,20,22,23];
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices6), gl.STATIC_DRAW);



}

/**
 * Sets up buffers for teapot.
 */
/**
 * Populate buffers with data
 */
function setupPotBuffers() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(potVertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  console.log("Number of potVertices : " + potVertices.length);
  vertexPositionBuffer.numberOfItems = 1202;

  faceIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceIndexBuffer);
 
    var faceIndices = [
    0,  1,  2
  ]

  // Now send the element array to GL
  // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(potNormals),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = 1202;
    
    
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(potFaces), gl.STATIC_DRAW);
    faceIndexBuffer.itemSize = 1;
    faceIndexBuffer.numItems = 6768;
}


/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  //canvas.addEventListener('mousemove', onMouseMove, false );
  //canvas.addEventListener('touchmove', onTouchMove, false );
  readTextFile("/static/EnvironmentMapping/teapot_0.obj", parse);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

    
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    rotAngle += 1;
}

/**
 * Callback function to parse the OBJ file, populate buffers, and initiate rendering
 */
function parse(objFile){
    var textByLine = objFile.split("\n")
    for(var i = 0; i < textByLine.length; i++){
      var entry = textByLine[i].toString();
      var parsedLine = entry.split(" ");
        
      if(parsedLine[0] == "v"){
         potVertices.push(parseFloat(parsedLine[1]));
         potVertices.push(parseFloat(parsedLine[2]));
         potVertices.push(parseFloat(parsedLine[3]));
         potNormals.push(0);
         potNormals.push(0);
         potNormals.push(0);
      }
        
      if(parsedLine[0] == "f"){
         potFaces.push(parseInt(parsedLine[2])-1);
         potFaces.push(parseInt(parsedLine[3])-1);
         potFaces.push(parseInt(parsedLine[4])-1);
         
      }
                       
    }
   
    potNormals = setNorms(potFaces, potVertices, potNormals);
    setupPotBuffers();
    setupShaders();
    setupCubeMap();
    setupBuffers();
    setupTextures();
    gl.uniform1f(shaderProgram2.uniformEnableReflection, 1);
    draw();
    tick();
}

/**
 * Function to calculate normals for shading 
 */
function setNorms(faceArray, vertexArray, normalArray)
{

    for(var i=0; i<faceArray.length;i+=3)
    {
        //find the face normal
        var vertex1 = vec3.fromValues(vertexArray[faceArray[i]*3],vertexArray[faceArray[i]*3+1],vertexArray[faceArray[i]*3+2]);
        
        var vertex2 = vec3.fromValues(vertexArray[faceArray[i+1]*3],vertexArray[faceArray[i+1]*3+1],vertexArray[faceArray[i+1]*3+2]);
        
        var vertex3 = vec3.fromValues(vertexArray[faceArray[i+2]*3],vertexArray[faceArray[i+2]*3+1],vertexArray[faceArray[i+2]*3+2]);
        
        var vect31=vec3.create(), vect21=vec3.create();
        vec3.sub(vect21,vertex2,vertex1);
        vec3.sub(vect31,vertex3,vertex1)
        var v=vec3.create();
        vec3.cross(v,vect21,vect31);
        
        //add the face normal to all the faces vertices
        normalArray[faceArray[i]*3  ]+=v[0];
        normalArray[faceArray[i]*3+1]+=v[1];
        normalArray[faceArray[i]*3+2]+=v[2];

        normalArray[faceArray[i+1]*3]+=v[0];
        normalArray[faceArray[i+1]*3+1]+=v[1];
        normalArray[faceArray[i+1]*3+2]+=v[2];

        normalArray[faceArray[i+2]*3]+=v[0];
        normalArray[faceArray[i+2]*3+1]+=v[1];
        normalArray[faceArray[i+2]*3+2]+=v[2];

    }
    
    //normalize each vertex normal
    for(var i=0; i<normalArray.length;i+=3)
    {
        var v = vec3.fromValues(normalArray[i],normalArray[i+1],normalArray[i+2]); 
        vec3.normalize(v,v);
        
        normalArray[i  ]=v[0];
        normalArray[i+1]=v[1];
        normalArray[i+2]=v[2];
    }
    
    //return the vertex normal
    return normalArray;
}


/**
 * Fucntion to handle user key events
 */

var lastX = 0;
var lastY = 0;
function onMouseMove(event)
{
    event.preventDefault();
    if(event.clientX < lastX){
        worldRotate = (worldRotate - 3) ;
        gl.uniform1f(shaderProgram2.uniformWorldRotLoc, worldRotate);
    }
    else{
        worldRotate = (worldRotate + 2) ;
        gl.uniform1f(shaderProgram2.uniformWorldRotLoc, worldRotate);

    }
    lastX = event.clientX;
    lastY = event.clientY;
}

function onTouchMove(event)
{
    var touchObj = event.changedTouches[0];
    console.log(touchObj);
    event.preventDefault();
    if(touchObj.clientX < lastX){
        worldRotate = (worldRotate - 2) ;
        gl.uniform1f(shaderProgram2.uniformWorldRotLoc, worldRotate);
    }
    else{
        worldRotate = (worldRotate + 2) ;
        gl.uniform1f(shaderProgram2.uniformWorldRotLoc, worldRotate);

    }
    lastX = touchObj.clientX;
    lastY = touchObj.clientY;
}

function orbit(value){
   worldRotate = value;
   gl.uniform1f(shaderProgram2.uniformWorldRotLoc, worldRotate);
}

