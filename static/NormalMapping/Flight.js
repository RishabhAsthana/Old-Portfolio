
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store sphere geometry
var sphereVertexPositionBuffer;

//Array to store sphere vertices
var sphereSoup=[];
//Array to store calculated UV coordinates
var textureCoordinates = [];
//Array to store tangents computed
var tangents = [];
//Array to store sphere normals
var sphereNormals=[];
//Array to store edges
var edgeSoup=[];

//Create a place to store normals for shading
var sphereVertexNormalBuffer;
//Create a place for UV coordinates
var texCoordBuffer;
//Create a place for UV coordinates
var tangentBuffer;
// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

//Create a place to store the traingle edges
var sIndexEdgeBuffer;

// View parameters
var eyePt = vec3.fromValues(0.1,0.0,0.5);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];



function setupSphereBuffers() {
    
    var numT=sphereFromSubdivision(6,sphereSoup,sphereNormals);
    console.log("Generated ", numT, " triangles"); 
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT*3;
    console.log(sphereSoup.length/9);
    
    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                  gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT*3;
    
    // Setup edges for wireframe view mode
    generateLinesFromIndexedTriangles(sphereSoup,edgeSoup);  
    sIndexEdgeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndexEdgeBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereSoup),
                  gl.STATIC_DRAW);
    sIndexEdgeBuffer.itemSize = 1;
    sIndexEdgeBuffer.numItems = edgeSoup.length;
    
    computeUV();
    computeTangents();
    orthogonalize();
    texCoordBuffer = gl.createBuffer(); //---------------------------
    //console.log("Population : ", textureCoordinates.length);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    texCoordBuffer.itemSize = 2;
    texCoordBuffer.numItems = numT*3;  
    
    //Buffer tangent data
    tangentBuffer = gl.createBuffer(); //---------------------------
    //console.log("Population : ", textureCoordinates.length);
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
    texCoordBuffer.itemSize = 3;
    texCoordBuffer.numItems = numT*3 ;  
    
    
    console.log("Normals ", sphereNormals.length/3);     
}

//-------------------------------------------------------------------------
/**
 * Computes a UV map for sphere based on Mercator Projection
 */
function computeUV(){
    //Extract vertex from soup
    for(i = 0; i < sphereSoup.length ; i+=3){
        var dx = sphereSoup[i+0];
        var dy = sphereSoup[i+1];
        var dz = sphereSoup[i+2];
        var u = 0.5 + ((Math.atan2(dz, dx))/(2*Math.PI));
        var v = 0.5 + (Math.asin(dy)/Math.PI);
        
        textureCoordinates.push(u); //u
        textureCoordinates.push(v); //v
    }    

    textureCoordinates.push(1.0);
    textureCoordinates.push(1.0);

    console.log(sphereSoup.length);
    console.log(textureCoordinates.length);
    console.log(textureCoordinates);

}

//-------------------------------------------------------------------------
/**
 * Generates tangent vectors in direction of texture co-ordinates
 */
function computeTangents(){
    var j = 0;
    for(i = 0; i < sphereSoup.length; i+=9){
        
    //Extract three points from the soup
    var p1X = sphereSoup[i+0];
    var p1Y = sphereSoup[i+1];
    var p1Z = sphereSoup[i+2];
    
    var p2X = sphereSoup[i+3];
    var p2Y = sphereSoup[i+4];
    var p2Z = sphereSoup[i+5];

    var p3X = sphereSoup[i+6];
    var p3Y = sphereSoup[i+7];
    var p3Z = sphereSoup[i+8];
    
    var u1 = textureCoordinates[j+0];
    var v1 = textureCoordinates[j+1];
    
    var u2 = textureCoordinates[j+2];
    var v2 = textureCoordinates[j+3];
    
    var u3 = textureCoordinates[j+4];
    var v3 = textureCoordinates[j+5];
        
    j += 6;
    var denominator = ((u2 - u1) * (v3 - v1)) - ((v2 - v1) * (u3 - u1));
    var tangentX = (((v3 - v1) * (p2X - p1X)) - ((v2 - v1) * (p3X - p1X)))/denominator;
    var tangentY = (((v3 - v1) * (p2Y - p1Y)) - ((v2 - v1) * (p3Y - p1Y)))/denominator;
    var tangentZ = (((v3 - v1) * (p2Z - p1Z)) - ((v2 - v1) * (p3Z - p1Z)))/denominator;
    
    for(k = 0; k < 3; k++){
        tangents.push(tangentX);
        tangents.push(tangentY);
        tangents.push(tangentZ);
    }
        
    }
    console.log("Number of Tangents : ", tangents.length);

}

//-------------------------------------------------------------------------
/**
 * Performs Gram-Schimdt orthogonalization process to ensure tangents and normals are orthogonal
 */
function orthogonalize(){
    
    for(i = 0; i < tangents.length; i+=3){
        
    var nx = sphereNormals[i+0];
    var ny = sphereNormals[i+1];
    var nz = sphereNormals[i+2];
    var mag = (nx * nx) + (ny * ny) + (nz * nz);
    
    var tx = tangents[i+0];
    var ty = tangents[i+1];
    var tz = tangents[i+2];
    var projection = (nx * tx) + (ny * ty) + (nz * tz);
    
    var multiplier = projection/mag;
    
    tangents[i+0] -= nx * multiplier;
    tangents[i+1] -= ny * multiplier;
    tangents[i+2] -= nz * multiplier;
    }

}

//-------------------------------------------------------------------------
function drawSphere(){
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
    
 //Bind UV coordinates buffer.
 gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
 gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    
 //Bind tangents buffer.
 gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexTangentAttribute, 3, gl.FLOAT, false, 0, 0);
    
    
 gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);
 //gl.drawArrays(gl.TRIANGLES, 0, 1);    
}

//-------------------------------------------------------------------------
/**
 * Draws edge of sphere from the edge buffer
 */
function drawSphereEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Bind UV coordinates buffer.
 gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
 gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    
 //Bind tangents buffer.
 gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexTangentAttribute, 3, gl.FLOAT, false, 0, 0);
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndexEdgeBuffer);
 gl.drawElements(gl.LINES, sIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);   

 console.log("Arr len : " + sIndexEdgeBuffer.numItems);
}


//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
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



//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  console.log("PLocation : " , shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  console.log("NLocation : " , shaderProgram.vertexNormalAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.textureCoordAttribute  = gl.getAttribLocation(shaderProgram, "aTextureCoord");
  console.log("UVLocation : " , shaderProgram.textureCoordAttribute );
  gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute );
    
  shaderProgram.vertexTangentAttribute  = gl.getAttribLocation(shaderProgram, "aTangent");
  console.log("TangentLocation : " , shaderProgram.vertexTangentAttribute );
  gl.enableVertexAttribArray(shaderProgram.vertexTangentAttribute );
    
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}

//-------------------------------------------------------------------------
/**
 * Binds the image to be used as texture to the sampler uniform
 */
function setupTexture(image){
    

  gl.activeTexture(gl.TEXTURE0);
  var texture = gl.createTexture();
  //glTexEnvf(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // Set the parameters so we can render power of 2 image, our input texture has power of 2 dimensions.
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
 
}


//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    setupSphereBuffers();
}

var x = 0.0;
//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    var transformVec = vec3.create();
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
 
    mvPushMatrix();
    vec3.set(transformVec,0.1,0.0,-1.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(25));     
    setMatrixUniforms();
 
    var transformSphere = vec3.create();

    x += 0.5;
    vec3.set(transformSphere,0.5,0.5,0.5);
    mat4.scale(mvMatrix, mvMatrix,transformSphere);  
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(x));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(x));

    setMatrixUniforms();
    uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[1.0,1.0,1.0],[1.0,1.0,1.0]);
    drawSphere();

    mvPopMatrix();
  
}

var maps = []
var clickCount = 0;
function onMouseDown(event){
  
    var image = new Image();
    image.src = maps[clickCount];
    image.onload = function() {
       setupTexture(image);  
    }   
    clickCount++;
    clickCount = clickCount%4;
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup(source) {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  canvas.addEventListener( 'mousedown', onMouseDown, false );

  maps.push("/static/NormalMapping/oval.jpg");
  maps.push("/static/NormalMapping/bump.jpg");
  maps.push("/static/NormalMapping/plain.jpg");
  maps.push("/static/NormalMapping/normal.jpg");
 
  var image = new Image();
  image.src = source; 
  image.onload = function() {
    syncStart(image);
  }
}

function syncStart(image){
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
    setupShaders();
    setupTexture(image);
    setupBuffers();
    
    tick();

}

//----------------------------------------------------------------------------------
/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    //animate();
}
