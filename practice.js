
const shaders = {
	dots: {
		vertex: `

uniform float time;

varying vec4 color;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}


void main() {
	vec3 p = position.xyz;
	float offset = rand(p.xy) * 9999.;
	
	vec3 center = vec3(49., 49., 0.);
	float distanceToCenter = distance(p, center);
	float opacity = 1.;
	float size = 1.;
	float length = 1.5;
	bool insideSquare = false;
	bool insideBounds = true;
	vec3 hue = vec3(1., 1., 1.);
	
	if(position.z == 2.){
		offset -= .25;
		p.z = -.0001;
	}
	else if(position.z == 3.){
		offset += .2;
		p.z = .0001;
	}
	else if(position.z == 1.){
		offset += 0.;
		p.z = 0.;
	}
	
	float timeOffset = cos(time + offset);
	float lifeCycleTime = timeOffset;
	
	vec3 direction = p - center;
	
	if(distanceToCenter > 45.){
		insideBounds = false;
	}
	
	if(timeOffset < cos(time - .001 + offset)){
		if(lifeCycleTime < 0.){
			lifeCycleTime *= -1.;
		}
		
		lifeCycleTime += -1.;
		
		if(lifeCycleTime < 0.){
			lifeCycleTime *= -1.;
		}
		
		size = lifeCycleTime * 8.;
		opacity = lifeCycleTime;
	}
	else {
		lifeCycleTime = 0.;
		size = 0.;
		opacity = 0.0;
	}
	
	float sd = 17.;
	if(p.x > sd && p.y > sd && p.x < 98. - sd && p.y < 99. - sd){
		insideSquare = true;
		length *= 2.;
		direction *= -1.;
	}
	
	vec3 dir = normalize(direction) * length;
	
	hue = vec3(1., 1., 1.);
	if(position.z == 2.){
		hue = vec3(0., 0., 1.);
	}
	else if(position.z == 3.){
		hue = vec3(1., 0., 0.);
	}
	
	p.x += timeOffset * dir.x;
	p.y += timeOffset * dir.y;
	
	if(insideBounds == true){
		gl_PointSize = size;
		color = vec4(hue, 1.) * opacity;
	}
	else {
		gl_PointSize = 0.;
		color = vec4(0., 0., 0., 0.);
	}
	gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); 
}

`,
		fragment: `
uniform sampler2D pointTexture;

varying vec4 color;

void main() {
	vec4 color1 = color * texture2D( pointTexture, gl_PointCoord );
	
	gl_FragColor = color1;
}
`
	}
}



const scene = new THREE.Scene(),
	 width = window.innerWidth,
	 height = window.innerHeight,
	 camera = new THREE.PerspectiveCamera( 45, width / height, 0.1, 1000 ),
	 renderer = new THREE.WebGLRenderer(),
	 startTime = new Date().getTime(),
	 timeOffset = 15

var composer, outlinePass;

let currentTime = 0

renderer.setSize( window.innerWidth, window.innerHeight )
document.body.appendChild( renderer.domElement )

let CameraHolder = new THREE.Object3D()
CameraHolder.add(camera)
scene.add(CameraHolder)


let controls = new window.THREE.OrbitControls( camera, renderer.domElement )

composer = new THREE.EffectComposer( renderer )

var renderPass = new THREE.RenderPass( scene, camera );
composer.addPass( renderPass );

outlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight ), scene, camera);
composer.addPass( outlinePass );

let hblur = new THREE.ShaderPass( THREE.HorizontalBlurShader );
let h = .1
hblur.uniforms.h = h
console.log(hblur)
//composer.addPass( hblur );

let vblur = new THREE.ShaderPass( THREE.VerticalBlurShader );
hblur.uniforms.h = h
// set this shader pass to render to screen so we can see the effects
//composer.addPass(vblur);

const GooeyShaderPass = new THREE.ShaderPass(GooeyShader, 'u_image')
composer.addPass( GooeyShaderPass );


let bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( width, height ), 1.5, .4, .85 );
renderer.toneMappingExposure = 1;
bloomPass.threshold = 0;
bloomPass.strength = 1.25;
bloomPass.radius = 1.25;
composer.addPass(bloomPass);

/*
let filmPass = new THREE.FilmPass(0.34, 0.025, 256, false);
composer.addPass(filmPass);

outlinePass.edgeStrength = 3
outlinePass.edgeThickness = 1
outlinePass.edgeGlow  = 0
outlinePass.visibleEdgeColor.set('#ffffff')
outlinePass.hiddenEdgeColor.set('#ffffff')
outlinePass.BlurDirectionX = new THREE.Vector2(0.0, 0.0)
outlinePass.BlurDirectionY = new THREE.Vector2(0.0, 0.0)
*/


camera.position.z = 150


const texture = new THREE.TextureLoader().load( 'https://assets.codepen.io/223954/disc.png' );
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;

let uniforms = {
	camera: { value: camera.position },
	time: { value: 0 },
	pointTexture: { value: texture }
}

const material = new THREE.ShaderMaterial( {
	uniforms: uniforms,
	fragmentShader: shaders.dots.fragment,
	vertexShader: shaders.dots.vertex,
	transparent: true,
    	depthWrite: false,
})


let imageScale = 0.01,
    pointDist = .8,
    imageHeight = 99,
    imageWidth = 99,
    geometry = new THREE.BufferGeometry(),
    positions = [],
    sizes = []


function mod(x,y){
	return x % y;
}

for ( var x = 0; x + pointDist < imageWidth; x += pointDist) {
	for ( var y = 0; y + pointDist < imageHeight; y += pointDist) {
		positions.push(x);
		positions.push(y);
		positions.push(1);
		sizes.push( 1 );
		
		positions.push(x);
		positions.push(y);
		positions.push(2);
		sizes.push( 1 );
		
		positions.push(x);
		positions.push(y);
		positions.push(3);
		sizes.push( 1 );
	}
}

geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
geometry.addAttribute( 'size', new THREE.Float32BufferAttribute( sizes, 1 ).setDynamic( true ) );

let mesh = new THREE.Points(geometry, material)
mesh.rotation.y = Math.PI
mesh.rotation.x = Math.PI
mesh.position.y = imageHeight * .5
mesh.position.x = imageHeight * .5
scene.add(mesh)


function animate() {
	var now = new Date().getTime();
	currentTime = (now - startTime) / 1000;
	let t = currentTime + timeOffset;
	
	CameraHolder.updateMatrixWorld();
	camera.updateMatrixWorld();
	var vector = camera.position.clone();
	vector.applyMatrix4( camera.matrixWorld );
	
	uniforms.time.value = t;
	uniforms.camera.value = vector;
	
	//CameraHolder.rotation.y = t * 0.1
	//CameraHolder.rotation.x = -.1 + Math.cos(t * 0.15) * (Math.PI * .01)
	
	requestAnimationFrame(animate)
	//renderer.render(scene, camera)
	composer.render()
}
animate()