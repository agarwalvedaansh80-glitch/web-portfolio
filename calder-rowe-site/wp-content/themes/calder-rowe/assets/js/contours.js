/*
 * Calder & Rowe: living contour field (WebGL).
 * A domain-warped pressure map drawn as anti-aliased isolines. The cursor is a
 * low-pressure lens that bunches the lines, and movement throws ripples that
 * travel outwards like a front on a weather chart. Falls back to the static
 * SVG contour texture when WebGL is unavailable, and renders a single still
 * frame for visitors who prefer reduced motion.
 */
( function () {
	'use strict';

	var d = document;
	var w = window;
	var CR = w.CalderRowe || {};
	var reduced = !! CR.reduced;
	var capture = !! CR.capture;

	var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
	var FRAG = [
		'#extension GL_OES_standard_derivatives : enable',
		'precision highp float;',
		'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uDpr;uniform float uCalm;uniform float uEnergy;uniform float uHover;',
		'uniform vec4 uRip[8];',
		'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
		'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
		'return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
		'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}',
		'void main(){',
		' vec2 uv=gl_FragCoord.xy/uRes.y;',
		' float asp=uRes.x/uRes.y;',
		' float t=uTime*.03;',
		' vec2 p=uv*1.15+vec2(3.1,1.7);',
		' vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t*.8));',
		' float h=fbm(p*.9+.95*q+vec2(t*.4,-t*.25));',
		' vec2 low=vec2(asp*.74,.52)+.04*vec2(sin(uTime*.07),cos(uTime*.05));',
		' h+=.34*exp(-dot(uv-low,uv-low)*4.5)*(1.-uCalm*.5);',
		' vec2 m=uMouse/uRes.y;',
		' float md=length(uv-m);',
		' h-=(.06+.12*uEnergy)*exp(-md*md*26.)*uHover;',
		' for(int i=0;i<8;i++){',
		'  vec4 r=uRip[i];float age=uTime-r.z;',
		'  if(r.w>0.&&age>0.&&age<4.5){',
		'   float dd=length(uv-r.xy/uRes.y);float front=age*.3;',
		'   float ring=exp(-pow((dd-front)*11.,2.));',
		'   h+=r.w*.045*sin((dd-front)*58.)*ring*exp(-age*.9);',
		'  }',
		' }',
		' float lv=mix(17.,12.,uCalm);',
		' float v=h*lv;',
		' float fw=max(fwidth(v),1e-4);',
		' float dist=abs(fract(v-.5)-.5)/fw;',
		' float idx=floor(v+.5);',
		' float major=step(mod(idx,5.),.5);',
		' float wid=mix(.75,1.35,major)*max(uDpr,.85);',
		' float line=1.-smoothstep(wid-.55,wid+.55,dist);',
		' vec3 ink=vec3(.039,.086,.157);',
		' vec3 tide=vec3(.106,.2,.322);',
		' vec3 base=mix(ink,tide,clamp((h-.35)*.9,0.,1.)*.55);',
		' vec3 paper=vec3(.957,.941,.902);',
		' vec3 amber=vec3(1.,.698,.141);',
		' float near=exp(-md*md*7.)*uHover;',
		' float idxLine=step(abs(idx-9.),.5)*(1.-uCalm*.6);',
		' vec3 lc=mix(paper,amber,clamp(near*1.3+idxLine,0.,1.));',
		' float a=mix(.15,.4,major)*mix(1.,.75,uCalm)+near*.38+idxLine*.35;',
		' gl_FragColor=vec4(mix(base,lc,line*a),1.);',
		'}'
	].join( '\n' );

	function compile( gl, type, src ) {
		var s = gl.createShader( type );
		gl.shaderSource( s, src );
		gl.compileShader( s );
		if ( ! gl.getShaderParameter( s, gl.COMPILE_STATUS ) ) {
			throw new Error( gl.getShaderInfoLog( s ) );
		}
		return s;
	}

	function field( host ) {
		var calm = host.classList.contains( 'cr-hero' ) ? 0 : 1;
		var fb = d.createElement( 'div' );
		fb.className = 'cr-field-fallback';
		fb.setAttribute( 'aria-hidden', 'true' );
		host.insertBefore( fb, host.firstChild );
		var canvas = d.createElement( 'canvas' );
		canvas.className = 'cr-field-canvas';
		canvas.setAttribute( 'aria-hidden', 'true' );
		host.insertBefore( canvas, host.firstChild );

		var gl = canvas.getContext( 'webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' } );
		if ( ! gl || ! gl.getExtension( 'OES_standard_derivatives' ) ) {
			d.documentElement.classList.add( 'cr-nogl' );
			canvas.remove();
			return;
		}
		var prog;
		try {
			prog = gl.createProgram();
			gl.attachShader( prog, compile( gl, gl.VERTEX_SHADER, VERT ) );
			gl.attachShader( prog, compile( gl, gl.FRAGMENT_SHADER, FRAG ) );
			gl.linkProgram( prog );
			if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS ) ) {
				throw new Error( gl.getProgramInfoLog( prog ) );
			}
		} catch ( err ) {
			d.documentElement.classList.add( 'cr-nogl' );
			canvas.remove();
			return;
		}
		gl.useProgram( prog );
		var buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ -1, -1, 3, -1, -1, 3 ] ), gl.STATIC_DRAW );
		var loc = gl.getAttribLocation( prog, 'p' );
		gl.enableVertexAttribArray( loc );
		gl.vertexAttribPointer( loc, 2, gl.FLOAT, false, 0, 0 );
		var U = {};
		[ 'uRes', 'uTime', 'uMouse', 'uDpr', 'uCalm', 'uEnergy', 'uHover', 'uRip' ].forEach( function ( n ) { U[ n ] = gl.getUniformLocation( prog, n ); } );

		var dpr = capture ? 0.8 : Math.min( w.devicePixelRatio || 1, 1.5 );
		var W = 1;
		var H = 1;
		var rect = host.getBoundingClientRect();
		function resize() {
			rect = host.getBoundingClientRect();
			W = Math.max( 1, Math.round( rect.width * dpr ) );
			H = Math.max( 1, Math.round( rect.height * dpr ) );
			canvas.width = W;
			canvas.height = H;
			gl.viewport( 0, 0, W, H );
		}
		resize();

		var rips = new Float32Array( 32 );
		var ripIdx = 0;
		var t0 = performance.now();
		var now = function () { return ( performance.now() - t0 ) / 1000; };
		function ripple( x, y, s ) {
			var o = ripIdx * 4;
			rips[ o ] = x;
			rips[ o + 1 ] = y;
			rips[ o + 2 ] = now();
			rips[ o + 3 ] = s;
			ripIdx = ( ripIdx + 1 ) % 8;
		}

		var mx = W * 0.68;
		var my = H * 0.5;
		var tx = mx;
		var ty = my;
		var energy = 0;
		var hover = 0;
		var inside = false;
		var lastRip = { x: -999, y: -999, t: 0 };
		var visible = true;
		var readout = host.querySelector( '.cr-hero__readout' );
		var frame = 0;

		function toLocal( cx, cy ) {
			return { x: ( cx - rect.left ) * dpr, y: ( rect.bottom - cy ) * dpr };
		}
		host.addEventListener( 'pointermove', function ( e ) {
			rect = host.getBoundingClientRect();
			var p = toLocal( e.clientX, e.clientY );
			tx = p.x;
			ty = p.y;
			inside = true;
			if ( reduced ) {
				return;
			}
			var dx = p.x - lastRip.x;
			var dy = p.y - lastRip.y;
			var dist = Math.sqrt( dx * dx + dy * dy );
			var tnow = now();
			if ( dist > 70 * dpr && tnow - lastRip.t > 0.12 ) {
				ripple( p.x, p.y, Math.min( 1.6, 0.5 + dist / ( 220 * dpr ) ) );
				lastRip = { x: p.x, y: p.y, t: tnow };
			}
		}, { passive: true } );
		host.addEventListener( 'pointerleave', function () { inside = false; } );
		host.addEventListener( 'pointerdown', function ( e ) {
			if ( reduced || e.target.closest( 'input, select, textarea, button, a, label' ) ) {
				return;
			}
			var p = toLocal( e.clientX, e.clientY );
			ripple( p.x, p.y, 2.4 );
		} );

		var autoNext = 1.5;
		function draw() {
			var t = now();
			mx += ( tx - mx ) * 0.08;
			my += ( ty - my ) * 0.08;
			var sp = Math.sqrt( ( tx - mx ) * ( tx - mx ) + ( ty - my ) * ( ty - my ) ) / ( 140 * dpr );
			energy += ( Math.min( 1, sp ) - energy ) * 0.06;
			hover += ( ( inside || reduced ? 1 : 0.55 ) - hover ) * 0.04;
			if ( ! inside && ! reduced && t > autoNext ) {
				// Idle weather: a front rolls in from somewhere on the chart.
				ripple( W * ( 0.45 + 0.5 * Math.abs( Math.sin( t * 1.7 ) ) ), H * ( 0.2 + 0.6 * Math.abs( Math.cos( t * 1.3 ) ) ), 1.1 );
				autoNext = t + 2.4;
			}
			gl.uniform2f( U.uRes, W, H );
			gl.uniform1f( U.uTime, t );
			gl.uniform2f( U.uMouse, mx, my );
			gl.uniform1f( U.uDpr, dpr );
			gl.uniform1f( U.uCalm, calm );
			gl.uniform1f( U.uEnergy, energy );
			gl.uniform1f( U.uHover, hover );
			gl.uniform4fv( U.uRip, rips );
			gl.drawArrays( gl.TRIANGLES, 0, 3 );
			if ( readout && frame++ % 5 === 0 ) {
				var lat = 53.812 - ( 1 - my / H ) * 0.034;
				var lon = 1.572 - ( mx / W ) * 0.052;
				var hpa = Math.round( 1013 - energy * 46 - ( inside ? 4 : 0 ) );
				readout.textContent = lat.toFixed( 3 ) + '° N · ' + lon.toFixed( 3 ) + '° W · ' + hpa + ' hPa';
			}
		}

		if ( reduced ) {
			hover = 1;
			draw();
			w.addEventListener( 'resize', function () { resize(); draw(); } );
			return;
		}
		if ( 'IntersectionObserver' in w ) {
			new IntersectionObserver( function ( entries ) { visible = entries[ 0 ].isIntersecting; } ).observe( host );
		}
		var lastDraw = -1;
		var tick = function () {
			if ( ! visible ) {
				return;
			}
			// Frame-stepped recordings advance two rAF ticks per video frame; draw once.
			var tn = performance.now();
			if ( capture && tn - lastDraw < 30 ) {
				return;
			}
			lastDraw = tn;
			draw();
		};
		if ( w.gsap ) {
			w.gsap.ticker.add( tick );
		} else {
			( function raf() { tick(); requestAnimationFrame( raf ); } )();
		}
		var rt;
		w.addEventListener( 'resize', function () {
			clearTimeout( rt );
			rt = setTimeout( resize, 120 );
		} );
		if ( w.ResizeObserver ) {
			new ResizeObserver( function () { resize(); } ).observe( host );
		}
	}

	Array.prototype.forEach.call( d.querySelectorAll( '.cr-hero, .cr-svc-hero, .cr-livefield' ), field );
} )();
