/*
 * Calder & Rowe: five-card risk check with a barometer dial.
 * Without this script the markup is a plain, accessible form. With it, the
 * questions become a stack of cards you can flick (pointer), tap (buttons) or
 * answer with the arrow keys, while an aneroid-style dial swings from Fair
 * towards Stormy. The result recommends lines of cover and offers a call-back.
 */
( function () {
	'use strict';

	var d = document;
	var w = window;
	var CR = w.CalderRowe || {};
	var gsap = w.gsap;
	var reduced = !! CR.reduced;
	var anim = !! gsap && ! reduced;

	var WEIGHTS = { staff: 20, public: 18, property: 22, data: 18, vehicles: 16 };
	var BASE = 6;
	var LINES = {
		staff: { key: 'liability', label: 'Employers’ liability', tag: 'Legal requirement' },
		public: { key: 'liability', label: 'Public liability', tag: 'Most contracts ask' },
		property: { key: 'property', label: 'Property &amp; business interruption', tag: 'Biggest single loss' },
		data: { key: 'cyber', label: 'Cyber', tag: 'Starts with one email' },
		vehicles: { key: 'fleet', label: 'Fleet &amp; motor', tag: 'One policy, one renewal' }
	};
	var WORDS = [ [ 25, 'Fair' ], [ 50, 'Change' ], [ 75, 'Rain' ], [ 101, 'Stormy' ] ];
	var wordFor = function ( s ) {
		for ( var i = 0; i < WORDS.length; i++ ) {
			if ( s < WORDS[ i ][ 0 ] ) {
				return WORDS[ i ][ 1 ];
			}
		}
		return 'Stormy';
	};
	var angleFor = function ( s ) { return 120 - ( s / 100 ) * 240; };

	function polar( cx, cy, r, deg ) {
		var a = ( deg - 90 ) * Math.PI / 180;
		return [ cx + r * Math.cos( a ), cy + r * Math.sin( a ) ];
	}
	function arc( cx, cy, r, a0, a1 ) {
		var p0 = polar( cx, cy, r, a0 );
		var p1 = polar( cx, cy, r, a1 );
		var large = Math.abs( a1 - a0 ) > 180 ? 1 : 0;
		return 'M' + p0[ 0 ].toFixed( 2 ) + ' ' + p0[ 1 ].toFixed( 2 ) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1[ 0 ].toFixed( 2 ) + ' ' + p1[ 1 ].toFixed( 2 );
	}

	function buildDial( host ) {
		var cx = 200;
		var cy = 200;
		var s = '<svg viewBox="0 0 400 300" role="img" aria-label="Risk barometer">';
		s += '<defs><linearGradient id="crg" x1="0" x2="1"><stop offset="0" stop-color="#FFB224"/><stop offset=".55" stop-color="#7F95B3"/><stop offset="1" stop-color="#A9BAD0"/></linearGradient></defs>';
		s += '<circle cx="200" cy="200" r="182" fill="#0E1E34" stroke="rgba(244,240,230,.12)"/>';
		s += '<circle cx="200" cy="200" r="168" fill="none" stroke="rgba(244,240,230,.06)"/>';
		s += '<path d="' + arc( cx, cy, 150, -120, 120 ) + '" fill="none" stroke="url(#crg)" stroke-width="6" stroke-linecap="round" opacity=".9"/>';
		for ( var i = 0; i <= 60; i++ ) {
			var a = -120 + i * 4;
			var major = i % 5 === 0;
			var p0 = polar( cx, cy, major ? 128 : 134, a );
			var p1 = polar( cx, cy, 142, a );
			s += '<line x1="' + p0[ 0 ].toFixed( 1 ) + '" y1="' + p0[ 1 ].toFixed( 1 ) + '" x2="' + p1[ 0 ].toFixed( 1 ) + '" y2="' + p1[ 1 ].toFixed( 1 ) + '" stroke="rgba(244,240,230,' + ( major ? '.7' : '.28' ) + ')" stroke-width="' + ( major ? 1.6 : 1 ) + '"/>';
			if ( i % 10 === 0 ) {
				var lp = polar( cx, cy, 114, a );
				s += '<text x="' + lp[ 0 ].toFixed( 1 ) + '" y="' + ( lp[ 1 ] + 4 ).toFixed( 1 ) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="rgba(169,186,208,.85)">' + ( 960 + i * 80 / 60 ).toFixed( 0 ) + '</text>';
			}
		}
		[ [ -102, 'STORMY' ], [ -40, 'RAIN' ], [ 20, 'CHANGE' ], [ 80, 'FAIR' ] ].forEach( function ( l ) {
			var lp = polar( cx, cy, 168, l[ 0 ] );
			s += '<text x="' + lp[ 0 ].toFixed( 1 ) + '" y="' + ( lp[ 1 ] + 4 ).toFixed( 1 ) + '" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-style="italic" font-size="15" letter-spacing="1" fill="#F4F0E6" transform="rotate(' + l[ 0 ] + ' ' + lp[ 0 ].toFixed( 1 ) + ' ' + lp[ 1 ].toFixed( 1 ) + ')">' + l[ 1 ] + '</text>';
		} );
		s += '<g class="cr-dial__ref" transform="rotate(120 200 200)"><path d="M200 70 L203 200 L197 200Z" fill="#C9A15A" opacity=".55"/></g>';
		s += '<g class="cr-dial__hand" transform="rotate(120 200 200)"><path d="M200 58 L206.5 200 L200 214 L193.5 200Z" fill="#FFB224"/><path d="M200 58 L200 214 L193.5 200Z" fill="#D98E00"/><path d="M200 214 L204 246 L196 246Z" fill="#F4F0E6"/></g>';
		s += '<circle cx="200" cy="200" r="11" fill="#0A1628" stroke="#F4F0E6" stroke-width="1.5"/><circle cx="200" cy="200" r="3.5" fill="#FFB224"/>';
		s += '<text class="cr-dial__hpa" x="200" y="262" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="2" fill="#A9BAD0">1036 hPa</text>';
		s += '</svg>';
		host.innerHTML = s;
		return {
			hand: host.querySelector( '.cr-dial__hand' ),
			ref: host.querySelector( '.cr-dial__ref' ),
			hpa: host.querySelector( '.cr-dial__hpa' )
		};
	}

	// The result panel changes the page height: re-measure pinned sections below it.
	function refresh() {
		if ( w.ScrollTrigger ) {
			requestAnimationFrame( function () { w.ScrollTrigger.refresh(); } );
		}
	}

	function init( root ) {
		var form = root.querySelector( '.cr-rc__deck' );
		var cards = Array.prototype.slice.call( root.querySelectorAll( '.cr-rc__card' ) );
		var gauge = root.querySelector( '.cr-rc__gauge' );
		var dialHost = root.querySelector( '.cr-rc__dial' );
		var wordEl = root.querySelector( '.cr-rc__word' );
		var numEl = root.querySelector( '.cr-rc__num b' );
		var result = root.querySelector( '.cr-rc__result' );
		var live = root.querySelector( '.cr-rc__live' );
		if ( ! form || ! cards.length || ! gauge ) {
			return;
		}
		root.classList.add( 'is-live' );
		var dial = buildDial( dialHost );
		var progress = d.createElement( 'div' );
		progress.className = 'cr-rc__progress';
		progress.setAttribute( 'aria-hidden', 'true' );
		progress.innerHTML = cards.map( function () { return '<i></i>'; } ).join( '' );
		gauge.appendChild( progress );
		var keys = d.createElement( 'p' );
		keys.className = 'cr-rc__keys';
		keys.innerHTML = 'Flick the card, tap a button, or press <kbd>←</kbd> no / <kbd>→</kbd> yes';
		gauge.appendChild( keys );
		cards.forEach( function ( c ) {
			c.insertAdjacentHTML( 'afterbegin', '<span class="cr-rc__stamp cr-rc__stamp--yes" aria-hidden="true">Yes</span><span class="cr-rc__stamp cr-rc__stamp--no" aria-hidden="true">No</span>' );
		} );

		var idx = 0;
		var answers = {};
		var score = BASE;
		var shown = { v: BASE };
		var handState = { a: angleFor( 0 ), r: angleFor( 0 ) };

		function setHand() {
			dial.hand.setAttribute( 'transform', 'rotate(' + handState.a.toFixed( 2 ) + ' 200 200)' );
			dial.ref.setAttribute( 'transform', 'rotate(' + handState.r.toFixed( 2 ) + ' 200 200)' );
		}
		function readout( v ) {
			var s = Math.round( v );
			numEl.textContent = s;
			dial.hpa.textContent = Math.round( 1036 - s * 0.76 ) + ' hPa';
		}
		function updateDial() {
			var target = angleFor( score );
			wordEl.textContent = wordFor( score );
			if ( anim ) {
				gsap.to( handState, { a: target, duration: 1.8, ease: 'elastic.out(1, 0.38)', onUpdate: setHand, overwrite: 'auto' } );
				gsap.to( handState, { r: angleFor( Math.max( 0, score - 12 ) ), duration: 2.6, ease: 'power2.inOut', delay: 0.3, onUpdate: setHand } );
				gsap.to( shown, { v: score, duration: 1.1, ease: 'power2.out', onUpdate: function () { readout( shown.v ); } } );
				gsap.fromTo( wordEl, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out' } );
			} else {
				handState.a = target;
				setHand();
				readout( score );
			}
		}

		function layout( instant ) {
			cards.forEach( function ( c, i ) {
				var k = i - idx;
				var props;
				if ( k < 0 ) {
					c.style.visibility = 'hidden';
					c.setAttribute( 'aria-hidden', 'true' );
					c.inert = true;
					return;
				}
				c.style.visibility = k > 2 ? 'hidden' : 'visible';
				c.style.zIndex = String( 10 - k );
				c.inert = k !== 0;
				if ( k === 0 ) {
					c.removeAttribute( 'aria-hidden' );
				} else {
					c.setAttribute( 'aria-hidden', 'true' );
				}
				props = { x: 0, y: k * 16, scale: 1 - k * 0.05, rotate: k === 0 ? 0 : ( k % 2 ? 2.2 : -1.6 ), opacity: k > 2 ? 0 : 1 - k * 0.22 };
				if ( anim && ! instant ) {
					gsap.to( c, Object.assign( { duration: 0.75, ease: 'expo.out', overwrite: 'auto' }, props ) );
				} else if ( gsap ) {
					gsap.set( c, props );
				} else {
					c.style.transform = 'translateY(' + props.y + 'px) scale(' + props.scale + ')';
					c.style.opacity = props.opacity;
				}
			} );
			Array.prototype.forEach.call( progress.children, function ( b, i ) { b.classList.toggle( 'is-done', i < idx ); } );
		}

		function answer( value, fromDrag ) {
			var card = cards[ idx ];
			if ( ! card || card._crGone ) {
				return;
			}
			card._crGone = true;
			var input = card.querySelector( 'input[value="' + value + '"]' );
			if ( input ) {
				input.checked = true;
			}
			var name = input ? input.name : '';
			answers[ name ] = value;
			score = BASE + Object.keys( answers ).reduce( function ( sum, k ) { return sum + ( answers[ k ] === 'yes' ? WEIGHTS[ k ] || 0 : 2 ); }, 0 );
			score = Math.min( 100, score );
			var dir = value === 'yes' ? 1 : -1;
			if ( anim ) {
				var stamp = card.querySelector( value === 'yes' ? '.cr-rc__stamp--yes' : '.cr-rc__stamp--no' );
				gsap.to( stamp, { opacity: 1, scale: 1.08, duration: 0.2 } );
				gsap.to( card, { x: dir * ( card.offsetWidth + 260 ), y: fromDrag ? '+=40' : -30, rotate: dir * 24, opacity: 0, duration: 0.75, ease: 'power3.in', delay: fromDrag ? 0 : 0.12 } );
			}
			if ( live ) {
				live.textContent = 'Answered ' + value + '. Forecast ' + wordFor( score ) + ', exposure ' + score + ' out of 100.';
			}
			idx++;
			updateDial();
			setTimeout( function () {
				layout();
				if ( idx >= cards.length ) {
					showResult();
				} else {
					var next = cards[ idx ].querySelector( 'input' );
					if ( next && root.contains( d.activeElement ) ) {
						next.focus( { preventScroll: true } );
					}
				}
			}, anim ? 260 : 0 );
		}

		/* Buttons and native radios */
		form.addEventListener( 'change', function ( e ) {
			var t = e.target;
			if ( t.type === 'radio' && cards[ idx ] && cards[ idx ].contains( t ) ) {
				answer( t.value );
			}
		} );
		form.addEventListener( 'submit', function ( e ) { e.preventDefault(); } );
		root.addEventListener( 'keydown', function ( e ) {
			if ( idx >= cards.length || ! cards[ idx ].contains( e.target ) ) {
				return;
			}
			if ( e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ) {
				e.preventDefault();
				answer( e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 'yes' : 'no' );
			}
		} );

		/* Flick gestures */
		cards.forEach( function ( card ) {
			var sx = 0;
			var sy = 0;
			var dx = 0;
			var dragging = false;
			var moved = false;
			var yesS = card.querySelector( '.cr-rc__stamp--yes' );
			var noS = card.querySelector( '.cr-rc__stamp--no' );
			card.addEventListener( 'pointerdown', function ( e ) {
				if ( cards[ idx ] !== card || e.button > 0 ) {
					return;
				}
				dragging = true;
				moved = false;
				sx = e.clientX;
				sy = e.clientY;
				dx = 0;
			} );
			w.addEventListener( 'pointermove', function ( e ) {
				if ( ! dragging ) {
					return;
				}
				dx = e.clientX - sx;
				var dy = e.clientY - sy;
				if ( ! moved && Math.abs( dx ) > 8 && Math.abs( dx ) > Math.abs( dy ) ) {
					moved = true;
					card.classList.add( 'is-dragging' );
					try {
						card.setPointerCapture( e.pointerId );
					} catch ( err ) {}
				}
				if ( ! moved ) {
					return;
				}
				var r = Math.max( -1, Math.min( 1, dx / 160 ) );
				if ( gsap ) {
					gsap.set( card, { x: dx, y: dy * 0.15, rotate: dx * 0.06 } );
				}
				yesS.style.opacity = Math.max( 0, r ).toFixed( 2 );
				noS.style.opacity = Math.max( 0, -r ).toFixed( 2 );
			} );
			var end = function () {
				if ( ! dragging ) {
					return;
				}
				dragging = false;
				card.classList.remove( 'is-dragging' );
				if ( ! moved ) {
					return;
				}
				card._crSuppressClick = true;
				setTimeout( function () { card._crSuppressClick = false; }, 60 );
				if ( Math.abs( dx ) > 110 ) {
					answer( dx > 0 ? 'yes' : 'no', true );
				} else {
					yesS.style.opacity = 0;
					noS.style.opacity = 0;
					if ( gsap ) {
						gsap.to( card, { x: 0, y: 0, rotate: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' } );
					}
				}
			};
			w.addEventListener( 'pointerup', end );
			w.addEventListener( 'pointercancel', end );
			card.addEventListener( 'click', function ( e ) {
				if ( card._crSuppressClick ) {
					e.preventDefault();
					e.stopPropagation();
				}
			}, true );
		} );

		function url( key ) {
			return root.getAttribute( 'data-' + key ) || root.getAttribute( 'data-contact' ) || '#';
		}

		function showResult() {
			var yesKeys = Object.keys( answers ).filter( function ( k ) { return answers[ k ] === 'yes'; } );
			var recs = [];
			var seen = {};
			if ( answers.staff === 'yes' && answers.public === 'yes' ) {
				recs.push( { key: 'liability', label: 'Employers’ &amp; public liability', tag: 'Legal requirement' } );
				seen.liability = true;
			}
			yesKeys.forEach( function ( k ) {
				var l = LINES[ k ];
				if ( l && ! seen[ l.key ] ) {
					seen[ l.key ] = true;
					recs.push( l );
				}
			} );
			var word = wordFor( score );
			var lines = {
				Fair: 'You look lightly exposed, but a 15-minute review can confirm nothing is missing.',
				Change: 'A few exposures worth getting right before they cost you.',
				Rain: 'Several real exposures, and at least one cover the law expects you to hold.',
				Stormy: 'A business like yours needs joined-up cover, and a broker who answers at 2am.'
			};
			var list = recs.length ? recs.map( function ( r ) {
				return '<li><a href="' + url( r.key ) + '">' + r.label + ' <small>' + r.tag + '</small></a></li>';
			} ).join( '' ) : '<li><a href="' + url( 'contact' ) + '">A quick cover review <small>15 minutes</small></a></li>';
			var covers = recs.map( function ( r ) { return r.key; } ).join( ',' ) || 'review';
			result.innerHTML = '<div class="cr-rc__result-in">' +
				'<p class="cr-kicker">Your forecast · exposure ' + score + ' / 100</p>' +
				'<h3>Outlook: <em>' + word + '.</em></h3>' +
				'<p>' + lines[ word ] + '</p>' +
				'<ul class="cr-rc__recs">' + list + '</ul>' +
				'<form class="cr-form cr-form--callback" action="' + url( 'contact' ) + '" method="post" data-cr-form novalidate>' +
				'<div class="cr-field"><label for="rc-name">Your name</label><input id="rc-name" name="name" type="text" autocomplete="name" required aria-describedby="rc-name-err"><p class="cr-field__error" id="rc-name-err"></p></div>' +
				'<div class="cr-field"><label for="rc-phone">Phone number</label><input id="rc-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required pattern="[0-9 +]{10,}" aria-describedby="rc-phone-err"><p class="cr-field__error" id="rc-phone-err"></p></div>' +
				'<input type="hidden" name="covers" value="' + covers + '">' +
				'<button type="submit" class="cr-form__submit"><span class="cr-form__label">Call me about these</span></button>' +
				'<p class="cr-form__status" role="status" aria-live="polite"></p>' +
				'</form>' +
				'<button type="button" class="cr-rc__again">Start again</button></div>';
			result.hidden = false;
			root.classList.add( 'is-done' );
			refresh();
			if ( CR.enhanceForm ) {
				CR.enhanceForm( result.querySelector( 'form' ) );
			}
			result.querySelector( '.cr-rc__again' ).addEventListener( 'click', reset );
			if ( anim ) {
				gsap.from( result.querySelector( '.cr-rc__result-in' ), { opacity: 0, y: 40, rotate: -1.5, duration: 1, ease: 'expo.out' } );
				gsap.from( result.querySelectorAll( '.cr-rc__recs li' ), { opacity: 0, x: 30, stagger: 0.09, duration: 0.7, ease: 'power3.out', delay: 0.25 } );
			}
			if ( root.contains( d.activeElement ) || d.activeElement === d.body ) {
				result.focus( { preventScroll: true } );
			}
		}

		function reset() {
			idx = 0;
			answers = {};
			score = BASE;
			result.hidden = true;
			result.innerHTML = '';
			root.classList.remove( 'is-done' );
			refresh();
			form.reset();
			cards.forEach( function ( c ) {
				c._crGone = false;
				c.querySelectorAll( '.cr-rc__stamp' ).forEach( function ( s ) { s.style.opacity = 0; } );
				if ( gsap ) {
					gsap.set( c, { x: 0, y: 0, rotate: 0, opacity: 1 } );
				}
			} );
			layout( true );
			updateDial();
			var first = cards[ 0 ].querySelector( 'input' );
			if ( first ) {
				first.focus( { preventScroll: true } );
			}
		}

		layout( true );
		setHand();
		readout( BASE );
		wordEl.textContent = wordFor( BASE );
		CR.riskCheck = { answer: answer, reset: reset };
	}

	Array.prototype.forEach.call( d.querySelectorAll( '[data-cr-riskcheck]' ), init );
} )();
