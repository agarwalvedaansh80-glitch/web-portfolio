/*
 * Calder & Rowe: "what happens after you call us", storm to calm.
 * Pins the claims story and scrubs it with the scroll: a procedural storm
 * (rain, lightning, tight isobars, a flooded workshop) clears to a calm dawn
 * while five steps hand over and a timeline draws itself. Visitors who prefer
 * reduced motion keep the plain, readable list.
 */
( function () {
	'use strict';

	var d = document;
	var w = window;
	var CR = w.CalderRowe || {};
	var gsap = w.gsap;
	var ST = w.ScrollTrigger;
	if ( ! gsap || ! ST || CR.reduced ) {
		return;
	}

	var clamp = function ( v, a, b ) { return Math.max( a, Math.min( b, v ) ); };
	var lerp = function ( a, b, t ) { return a + ( b - a ) * t; };
	var smooth = function ( e0, e1, x ) { var t = clamp( ( x - e0 ) / ( e1 - e0 ), 0, 1 ); return t * t * ( 3 - 2 * t ); };
	var mix = function ( c1, c2, t ) {
		return 'rgb(' + Math.round( lerp( c1[ 0 ], c2[ 0 ], t ) ) + ',' + Math.round( lerp( c1[ 1 ], c2[ 1 ], t ) ) + ',' + Math.round( lerp( c1[ 2 ], c2[ 2 ], t ) ) + ')';
	};
	var rand = function ( n ) { var x = Math.sin( n * 127.1 + 311.7 ) * 43758.5453; return x - Math.floor( x ); };

	function Scene( canvas ) {
		var ctx = canvas.getContext( '2d' );
		var dpr = CR.capture ? 1 : Math.min( w.devicePixelRatio || 1, 1.5 );
		var W = 0;
		var H = 0;
		var drops = [];
		for ( var i = 0; i < 320; i++ ) {
			drops.push( { x: rand( i ), y: rand( i + 999 ), l: 0.6 + rand( i + 77 ) * 0.8, s: 0.7 + rand( i + 33 ) * 0.6 } );
		}
		var clouds = [];
		for ( var c = 0; c < 9; c++ ) {
			clouds.push( { x: rand( c + 5 ) * 1.3 - 0.15, y: 0.06 + rand( c + 50 ) * 0.3, s: 0.7 + rand( c + 9 ) * 0.9, v: 0.4 + rand( c + 3 ) } );
		}
		this.resize = function () {
			var r = canvas.getBoundingClientRect();
			W = Math.max( 1, Math.round( r.width * dpr ) );
			H = Math.max( 1, Math.round( r.height * dpr ) );
			canvas.width = W;
			canvas.height = H;
		};
		this.draw = function ( p, t ) {
			if ( ! W ) {
				return;
			}
			var calm = smooth( 0.05, 0.92, p );
			var storm = 1 - calm;
			var narrow = W / dpr < 782;
			var hz = H * ( narrow ? 0.6 : 0.7 );
			var u = Math.min( W, H * 1.6 ) / 1000;

			/* Sky */
			var g = ctx.createLinearGradient( 0, 0, 0, hz );
			g.addColorStop( 0, mix( [ 6, 12, 24 ], [ 14, 34, 64 ], calm ) );
			g.addColorStop( 0.6, mix( [ 16, 28, 46 ], [ 52, 78, 112 ], calm ) );
			g.addColorStop( 1, mix( [ 30, 44, 64 ], [ 236, 176, 92 ], calm * 0.9 ) );
			ctx.fillStyle = g;
			ctx.fillRect( 0, 0, W, hz + 2 );

			/* Lightning flash */
			var cyc = 2.7;
			var ph = ( t % cyc ) / cyc;
			var bolt = Math.floor( t / cyc );
			var flash = storm > 0.55 && rand( bolt ) > 0.25 ? Math.max( 0, 1 - ph / 0.05 ) * ( storm - 0.55 ) / 0.45 : 0;
			if ( flash > 0.01 ) {
				ctx.fillStyle = 'rgba(190,210,255,' + ( 0.35 * flash ).toFixed( 3 ) + ')';
				ctx.fillRect( 0, 0, W, hz );
			}

			/* Sun rising at calm */
			var sunT = smooth( 0.55, 1, p );
			if ( sunT > 0 ) {
				var sx = W * ( narrow ? 0.72 : 0.7 );
				var sy = hz + 70 * u - sunT * 190 * u;
				var sg = ctx.createRadialGradient( sx, sy, 0, sx, sy, 260 * u );
				sg.addColorStop( 0, 'rgba(255,198,92,' + ( 0.55 * sunT ).toFixed( 3 ) + ')' );
				sg.addColorStop( 1, 'rgba(255,178,36,0)' );
				ctx.fillStyle = sg;
				ctx.fillRect( 0, 0, W, hz );
				ctx.save();
				ctx.beginPath();
				ctx.rect( 0, 0, W, hz );
				ctx.clip();
				ctx.fillStyle = 'rgba(255,190,72,' + ( 0.95 * sunT ).toFixed( 3 ) + ')';
				ctx.beginPath();
				ctx.arc( sx, sy, 52 * u, 0, Math.PI * 2 );
				ctx.fill();
				ctx.restore();
			}

			/* Isobars around the low: tight in the storm, relaxed in the calm */
			var lx = W * ( narrow ? 0.62 : 0.66 );
			var ly = H * 0.3;
			var spacing = lerp( 20, 64, calm ) * u;
			var wob = lerp( 16, 3, calm ) * u;
			var spin = t * lerp( 0.5, 0.06, calm );
			ctx.lineWidth = 1.2 * dpr;
			for ( var k = 1; k <= 14; k++ ) {
				var r = k * spacing;
				var amber = k === 4;
				ctx.strokeStyle = amber ? 'rgba(255,178,36,' + lerp( 0.75, 0.4, calm ).toFixed( 3 ) + ')' : 'rgba(169,186,208,' + lerp( 0.26, 0.14, calm ).toFixed( 3 ) + ')';
				ctx.lineWidth = ( amber ? 1.8 : 1.1 ) * dpr;
				ctx.beginPath();
				for ( var a = 0; a <= 64; a++ ) {
					var th = a / 64 * Math.PI * 2;
					var rr = r + wob * Math.sin( th * 3 + spin + k * 0.7 ) + wob * 0.6 * Math.sin( th * 5 - spin * 1.3 + k );
					var px = lx + Math.cos( th ) * rr * 1.35;
					var py = ly + Math.sin( th ) * rr * 0.8;
					if ( a === 0 ) {
						ctx.moveTo( px, py );
					} else {
						ctx.lineTo( px, py );
					}
				}
				ctx.closePath();
				ctx.stroke();
			}
			if ( storm > 0.2 ) {
				ctx.fillStyle = 'rgba(255,178,36,' + ( 0.9 * storm ).toFixed( 3 ) + ')';
				ctx.font = ( 600 ) + ' ' + Math.round( 22 * u ) + 'px "IBM Plex Mono", monospace';
				ctx.fillText( 'L', lx - 7 * u, ly + 8 * u );
				ctx.font = Math.round( 11 * u ) + 'px "IBM Plex Mono", monospace';
				ctx.fillText( Math.round( lerp( 958, 1022, calm ) ) + ' hPa', lx + 16 * u, ly + 6 * u );
			}

			/* Clouds */
			var cloudA = lerp( 0.95, 0, smooth( 0.1, 0.85, p ) );
			if ( cloudA > 0.01 ) {
				clouds.forEach( function ( cl, ci ) {
					var cx = ( ( cl.x + t * 0.018 * cl.v * ( 0.3 + storm ) ) % 1.4 - 0.2 ) * W;
					var cy = ( cl.y - calm * 0.25 ) * H;
					var s = cl.s * 120 * u;
					ctx.fillStyle = 'rgba(' + ( ci % 2 ? '18,30,50' : '24,38,60' ) + ',' + ( cloudA * ( 0.75 + 0.25 * ( ci % 3 ) / 2 ) ).toFixed( 3 ) + ')';
					ctx.beginPath();
					ctx.ellipse( cx, cy, s * 1.6, s * 0.42, 0, 0, Math.PI * 2 );
					ctx.ellipse( cx - s * 0.6, cy - s * 0.18, s * 0.62, s * 0.46, 0, 0, Math.PI * 2 );
					ctx.ellipse( cx + s * 0.35, cy - s * 0.3, s * 0.72, s * 0.58, 0, 0, Math.PI * 2 );
					ctx.fill();
					if ( flash > 0.01 ) {
						ctx.fillStyle = 'rgba(200,215,255,' + ( 0.25 * flash ).toFixed( 3 ) + ')';
						ctx.fill();
					}
				} );
			}

			/* Lightning bolt */
			if ( flash > 0.05 ) {
				var bx = W * ( 0.45 + rand( bolt + 3 ) * 0.45 );
				var by = H * 0.12;
				ctx.strokeStyle = 'rgba(235,240,255,' + flash.toFixed( 3 ) + ')';
				ctx.lineWidth = 2.2 * dpr;
				ctx.beginPath();
				ctx.moveTo( bx, by );
				for ( var j = 1; j <= 7; j++ ) {
					bx += ( rand( bolt * 10 + j ) - 0.5 ) * 60 * u;
					by += ( hz - H * 0.12 ) / 7;
					ctx.lineTo( bx, by );
				}
				ctx.stroke();
			}

			/* Ground line */
			ctx.fillStyle = '#081221';
			ctx.fillRect( 0, hz, W, H - hz );

			/* Tree bending in the wind */
			var tx = W * ( narrow ? 0.18 : 0.56 );
			var bend = storm * ( 0.32 + 0.12 * Math.sin( t * 3.1 ) ) + calm * 0.02 * Math.sin( t );
			ctx.save();
			ctx.translate( tx, hz );
			ctx.rotate( bend * 0.4 );
			ctx.fillStyle = '#081221';
			ctx.fillRect( -4 * u, -110 * u, 8 * u, 110 * u );
			ctx.translate( 0, -110 * u );
			ctx.rotate( bend * 0.6 );
			ctx.beginPath();
			ctx.arc( 0, -30 * u, 46 * u, 0, Math.PI * 2 );
			ctx.arc( -34 * u, -6 * u, 32 * u, 0, Math.PI * 2 );
			ctx.arc( 32 * u, -4 * u, 34 * u, 0, Math.PI * 2 );
			ctx.fill();
			ctx.restore();

			/* The client's workshop: lights come back on as the claim is worked */
			var bw = 360 * u;
			var bh = 150 * u;
			var bx0 = W * ( narrow ? 0.36 : 0.64 );
			ctx.fillStyle = '#081221';
			ctx.beginPath();
			ctx.moveTo( bx0, hz );
			ctx.lineTo( bx0, hz - bh );
			var teeth = 4;
			for ( var tth = 0; tth < teeth; tth++ ) {
				var x0 = bx0 + tth * bw / teeth;
				ctx.lineTo( x0 + bw / teeth * 0.75, hz - bh - 46 * u );
				ctx.lineTo( x0 + bw / teeth * 0.75, hz - bh );
				ctx.lineTo( x0 + bw / teeth, hz - bh );
			}
			ctx.lineTo( bx0 + bw, hz );
			ctx.closePath();
			ctx.fill();
			for ( var wi = 0; wi < 6; wi++ ) {
				for ( var wj = 0; wj < 2; wj++ ) {
					var on = smooth( 0.35 + wi * 0.07 + wj * 0.03, 0.55 + wi * 0.07 + wj * 0.03, p );
					var flick = wi === 2 && wj === 0 && storm > 0.5 ? ( Math.sin( t * 23 ) > 0.3 ? 0.8 : 0.1 ) : 0;
					var a2 = Math.max( on, flick );
					ctx.fillStyle = a2 > 0.02 ? 'rgba(255,190,80,' + ( 0.12 + a2 * 0.8 ).toFixed( 3 ) + ')' : 'rgba(40,58,84,.8)';
					ctx.fillRect( bx0 + 22 * u + wi * 54 * u, hz - bh + 34 * u + wj * 52 * u, 30 * u, 26 * u );
				}
			}
			ctx.fillStyle = 'rgba(255,178,36,' + ( 0.85 * calm ).toFixed( 3 ) + ')';
			ctx.fillRect( bx0 + bw * 0.5 - 30 * u, hz - 54 * u, 60 * u, 54 * u );

			/* Flood water recedes, waves flatten, reflections appear */
			var level = hz + lerp( -40 * u, 26 * u, calm );
			var amp = lerp( 11, 1.2, calm ) * u;
			ctx.beginPath();
			ctx.moveTo( 0, H );
			for ( var x = 0; x <= W; x += 8 * dpr ) {
				var yy = level + Math.sin( x * 0.012 / u + t * 2.2 ) * amp + Math.sin( x * 0.031 / u - t * 3.1 ) * amp * 0.5;
				ctx.lineTo( x, yy );
			}
			ctx.lineTo( W, H );
			ctx.closePath();
			var wg = ctx.createLinearGradient( 0, level, 0, H );
			wg.addColorStop( 0, mix( [ 20, 36, 58 ], [ 26, 48, 80 ], calm ) );
			wg.addColorStop( 1, '#060D19' );
			ctx.fillStyle = wg;
			ctx.fill();
			ctx.strokeStyle = 'rgba(169,186,208,' + lerp( 0.45, 0.25, calm ).toFixed( 3 ) + ')';
			ctx.lineWidth = 1.2 * dpr;
			ctx.stroke();
			if ( calm > 0.3 ) {
				for ( var rf = 0; rf < 26; rf++ ) {
					var rx = W * ( narrow ? 0.72 : 0.7 ) + ( rand( rf ) - 0.5 ) * 120 * u;
					var ry = level + 10 * u + rf * 7 * u;
					var rl = ( 40 - rf ) * u * ( 0.5 + rand( rf + 4 ) );
					ctx.fillStyle = 'rgba(255,190,80,' + ( ( calm - 0.3 ) * 0.5 * ( 1 - rf / 26 ) ).toFixed( 3 ) + ')';
					ctx.fillRect( rx - rl / 2 + Math.sin( t * 1.5 + rf ) * 4 * u, ry, rl, 2 * u );
				}
			}

			/* Rain */
			var n = Math.floor( Math.pow( storm, 1.25 ) * drops.length );
			if ( n > 0 ) {
				var wind = storm * 0.45;
				ctx.strokeStyle = 'rgba(200,214,234,' + ( 0.18 + storm * 0.3 ).toFixed( 3 ) + ')';
				ctx.lineWidth = 1 * dpr;
				ctx.beginPath();
				for ( var q = 0; q < n; q++ ) {
					var dr = drops[ q ];
					var len = ( 16 + 14 * dr.l ) * u;
					var dyy = ( ( dr.y + t * 1.25 * dr.s ) % 1 ) * ( H + 60 ) - 30;
					var dxx = ( ( dr.x + dyy / H * wind * 0.4 ) % 1 ) * W;
					ctx.moveTo( dxx, dyy );
					ctx.lineTo( dxx - wind * len, dyy + len );
				}
				ctx.stroke();
			}
		};
	}

	function init( sec ) {
		var steps = Array.prototype.slice.call( sec.querySelectorAll( '.cr-step' ) );
		if ( steps.length < 2 ) {
			return;
		}
		sec.classList.add( 'cr-story-live' );
		var pin = d.createElement( 'div' );
		pin.className = 'cr-story__pin';
		while ( sec.firstChild ) {
			pin.appendChild( sec.firstChild );
		}
		sec.appendChild( pin );
		var stepsWrap = sec.querySelector( '.cr-story__steps' );
		var note = sec.querySelector( '.cr-story__note' );
		if ( note ) {
			pin.appendChild( note );
		}
		var canvas = d.createElement( 'canvas' );
		canvas.className = 'cr-story__canvas';
		canvas.setAttribute( 'aria-hidden', 'true' );
		pin.insertBefore( canvas, pin.firstChild );
		var shade = d.createElement( 'div' );
		shade.className = 'cr-story__shade';
		pin.insertBefore( shade, canvas.nextSibling );

		var labels = steps.map( function ( s ) {
			var tm = s.querySelector( '.cr-step__time strong' );
			return tm ? tm.textContent : '';
		} );
		var tl = d.createElement( 'div' );
		tl.className = 'cr-timeline';
		tl.setAttribute( 'aria-hidden', 'true' );
		tl.innerHTML = '<svg viewBox="0 0 1000 14" preserveAspectRatio="none"><path class="cr-timeline__base" d="M0 7H1000" vector-effect="non-scaling-stroke"/><path class="cr-timeline__draw" d="M0 7H1000" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>' +
			'<div class="cr-timeline__labels">' + labels.map( function ( l ) { return '<span>' + l + '</span>'; } ).join( '' ) + '</div>';
		pin.appendChild( tl );
		// Nodes as HTML dots so they stay round whatever the width.
		var dots = d.createElement( 'div' );
		dots.style.cssText = 'position:absolute;left:0;right:0;top:0;height:14px;';
		steps.forEach( function ( s, i ) {
			var dot = d.createElement( 'i' );
			dot.className = 'cr-timeline__dot';
			dot.style.cssText = 'position:absolute;top:1px;width:12px;height:12px;margin-left:-6px;border-radius:50%;left:' + ( i / ( steps.length - 1 ) * 100 ) + '%;background:#0A1628;border:1.5px solid rgba(244,240,230,.4);transition:background-color .4s,border-color .4s,transform .5s cubic-bezier(.34,1.56,.64,1)';
			dots.appendChild( dot );
		} );
		tl.appendChild( dots );
		var dotEls = Array.prototype.slice.call( dots.children );
		var labelEls = Array.prototype.slice.call( tl.querySelectorAll( '.cr-timeline__labels span' ) );
		var drawPath = tl.querySelector( '.cr-timeline__draw' );

		var counter = d.createElement( 'div' );
		counter.className = 'cr-story__counter';
		counter.setAttribute( 'aria-hidden', 'true' );
		counter.innerHTML = '<b>01</b>of 0' + steps.length;
		pin.appendChild( counter );
		var counterNum = counter.querySelector( 'b' );

		var scene = new Scene( canvas );
		scene.resize();
		var target = 0;
		var prog = 0;
		var visible = false;
		var t0 = performance.now();
		var current = -1;

		gsap.set( steps, { opacity: 0, y: 50 } );
		gsap.set( steps[ 0 ], { opacity: 1, y: 0 } );
		var titleWords = steps.map( function ( s ) {
			var h = s.querySelector( '.cr-step__title' );
			return h && CR.splitWords ? CR.splitWords( h ) : [];
		} );

		var master = gsap.timeline( { defaults: { ease: 'none' } } );
		var seg = 1 / steps.length;
		steps.forEach( function ( s, i ) {
			if ( i === 0 ) {
				return;
			}
			var at = i * seg - seg * 0.28;
			master.to( steps[ i - 1 ], { opacity: 0, y: -50, duration: seg * 0.3 }, at );
			master.fromTo( s, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: seg * 0.32 }, at + seg * 0.18 );
			if ( titleWords[ i ].length ) {
				master.fromTo( titleWords[ i ], { yPercent: 110 }, { yPercent: 0, stagger: seg * 0.02, duration: seg * 0.26 }, at + seg * 0.2 );
			}
		} );
		master.to( {}, { duration: 0.0001 }, 1 );
		master.fromTo( drawPath, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: ( steps.length - 1 ) / steps.length }, 0 );

		ST.create( {
			trigger: sec,
			pin: pin,
			start: 'top top',
			end: function () { return '+=' + Math.round( w.innerHeight * ( steps.length * 0.85 ) ); },
			scrub: 0.6,
			animation: master,
			invalidateOnRefresh: true,
			onUpdate: function ( self ) {
				target = self.progress;
				var idx = Math.min( steps.length - 1, Math.floor( self.progress * steps.length + 0.1 ) );
				if ( idx !== current ) {
					current = idx;
					counterNum.textContent = ( idx < 9 ? '0' : '' ) + ( idx + 1 );
					steps.forEach( function ( s, i ) { s.setAttribute( 'aria-current', i === idx ? 'step' : 'false' ); } );
				}
				var reach = Math.min( 1, self.progress * steps.length / ( steps.length - 1 ) ) * ( steps.length - 1 ) + 0.02;
				dotEls.forEach( function ( dot, i ) {
					var on = i <= reach;
					dot.style.background = on ? '#FFB224' : '#0A1628';
					dot.style.borderColor = on ? '#FFB224' : 'rgba(244,240,230,.4)';
					dot.style.transform = i === idx ? 'scale(1.5)' : 'scale(1)';
					labelEls[ i ].classList.toggle( 'is-on', on );
				} );
			}
		} );
		ST.create( {
			trigger: sec,
			start: 'top bottom',
			end: 'bottom top',
			onToggle: function ( self ) { visible = self.isActive; }
		} );

		var lastDraw = -1;
		gsap.ticker.add( function () {
			if ( ! visible ) {
				return;
			}
			var tn = performance.now();
			if ( CR.capture && tn - lastDraw < 30 ) {
				return;
			}
			lastDraw = tn;
			prog += ( target - prog ) * 0.12;
			scene.draw( prog, ( performance.now() - t0 ) / 1000 );
		} );
		scene.draw( 0, 0 );
		var rt;
		w.addEventListener( 'resize', function () {
			clearTimeout( rt );
			rt = setTimeout( function () { scene.resize(); scene.draw( prog, ( performance.now() - t0 ) / 1000 ); }, 100 );
		} );
	}

	Array.prototype.forEach.call( d.querySelectorAll( '.cr-claims-story' ), init );
} )();
