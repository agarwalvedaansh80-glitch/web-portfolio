/*
 * Calder & Rowe: core progressive enhancement.
 * Smooth scroll, kinetic headings, compass cursor, magnetic buttons, field
 * micro-interactions, marquee, line previews, animated comparison tables,
 * scroll-lit quotes, count-ups and the service-page parallax.
 * Every feature checks for what it needs and leaves the page usable without it.
 */
( function () {
	'use strict';

	var d = document;
	var html = d.documentElement;
	var w = window;
	var mm = function ( q ) { return !! ( w.matchMedia && w.matchMedia( q ).matches ); };
	var reduced = mm( '(prefers-reduced-motion: reduce)' );
	var capture = html.classList.contains( 'cr-capture' );
	var fine = mm( '(hover: hover) and (pointer: fine)' );
	var gsap = w.gsap;
	var ST = w.ScrollTrigger;
	var motion = !! ( gsap && ST ) && ! reduced;
	var $$ = function ( sel, root ) { return Array.prototype.slice.call( ( root || d ).querySelectorAll( sel ) ); };

	if ( reduced ) {
		html.classList.add( 'cr-reduced' );
	}
	if ( gsap && ST ) {
		gsap.registerPlugin( ST );
	}

	var CR = w.CalderRowe = w.CalderRowe || {};
	CR.reduced = reduced;
	CR.capture = capture;
	CR.motion = motion;
	CR.fine = fine;
	CR.mouse = { x: w.innerWidth * 0.62, y: w.innerHeight * 0.45, vx: 0, vy: 0, moved: false };

	d.addEventListener( 'pointermove', function ( e ) {
		CR.mouse.vx = e.clientX - CR.mouse.x;
		CR.mouse.vy = e.clientY - CR.mouse.y;
		CR.mouse.x = e.clientX;
		CR.mouse.y = e.clientY;
		CR.mouse.moved = true;
	}, { passive: true } );

	/* ---------- Smooth scroll ---------- */
	var headerH = function () {
		var hd = d.querySelector( '.cr-header' );
		return hd ? hd.offsetHeight : 0;
	};
	if ( motion && w.Lenis && ! capture ) {
		var lenis = new w.Lenis( { duration: 1.1, easing: function ( t ) { return Math.min( 1, 1.001 - Math.pow( 2, -10 * t ) ); }, smoothWheel: true } );
		lenis.on( 'scroll', ST.update );
		gsap.ticker.add( function ( t ) { lenis.raf( t * 1000 ); } );
		gsap.ticker.lagSmoothing( 0 );
		CR.lenis = lenis;
	}
	d.addEventListener( 'click', function ( e ) {
		var a = e.target.closest && e.target.closest( 'a[href*="#"]' );
		var norm = function ( x ) { return x.replace( /index\.html$/, '' ); };
		if ( ! a || a.origin !== location.origin || norm( a.pathname ) !== norm( location.pathname ) ) {
			return;
		}
		var id = decodeURIComponent( a.hash.slice( 1 ) );
		var target = id && d.getElementById( id );
		if ( ! target ) {
			return;
		}
		e.preventDefault();
		var done = function () {
			if ( ! target.hasAttribute( 'tabindex' ) && ! /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test( target.tagName ) ) {
				target.setAttribute( 'tabindex', '-1' );
			}
			var focusable = target.querySelector( 'input, select, textarea' );
			var to = ( id === 'callback' || id === 'svc-callback' ) && focusable ? focusable : target;
			to.focus( { preventScroll: true } );
		};
		if ( CR.lenis ) {
			CR.lenis.scrollTo( target, { offset: -headerH() - 16, duration: 1.4, onComplete: done } );
		} else {
			target.scrollIntoView( { behavior: reduced ? 'auto' : 'smooth', block: 'start' } );
			setTimeout( done, reduced ? 0 : 600 );
		}
		history.replaceState( null, '', a.hash );
	} );

	/* ---------- Header state ---------- */
	var header = d.querySelector( '.cr-header' );
	if ( header ) {
		var wrap = header.parentElement;
		if ( wrap && wrap !== d.body && ! wrap.classList.contains( 'wp-site-blocks' ) && getComputedStyle( wrap ).position !== 'sticky' ) {
			wrap.classList.add( 'cr-sticky-header' );
		}
		var onScroll = function () { header.classList.toggle( 'is-scrolled', w.scrollY > 12 ); };
		w.addEventListener( 'scroll', onScroll, { passive: true } );
		onScroll();
	}

	/* ---------- Word splitting ---------- */
	function splitWords( el, cls ) {
		if ( el._crWords ) {
			return el._crWords;
		}
		var words = [];
		var outer = cls || 'cr-w';
		( function walk( node ) {
			Array.prototype.slice.call( node.childNodes ).forEach( function ( n ) {
				if ( n.nodeType === 3 ) {
					var parts = n.textContent.split( /(\s+)/ );
					var frag = d.createDocumentFragment();
					parts.forEach( function ( p ) {
						if ( ! p ) {
							return;
						}
						if ( /^\s+$/.test( p ) ) {
							frag.appendChild( d.createTextNode( p ) );
							return;
						}
						var o = d.createElement( 'span' );
						o.className = outer;
						if ( outer === 'cr-w' ) {
							var i = d.createElement( 'span' );
							i.className = 'cr-w__i';
							i.textContent = p;
							o.appendChild( i );
							words.push( i );
						} else {
							o.textContent = p;
							words.push( o );
						}
						frag.appendChild( o );
					} );
					node.replaceChild( frag, n );
				} else if ( n.nodeType === 1 && ! /^(BR|SVG|IMG)$/i.test( n.tagName ) ) {
					walk( n );
				}
			} );
		} )( el );
		el._crWords = words;
		return words;
	}
	CR.splitWords = splitWords;

	/* ---------- Kinetic headings: words slide up, then the weight settles ---------- */
	function kineticPlay( el, delay ) {
		var words = el._crWords || splitWords( el );
		if ( ! motion ) {
			return;
		}
		el.classList.add( 'is-in' );
		var targets = words.map( function ( wd ) {
			var cs = getComputedStyle( wd );
			return { w: parseFloat( cs.fontWeight ) || 400, s: parseFloat( cs.getPropertyValue( '--soft' ) ) || 30 };
		} );
		words.forEach( function ( wd, i ) {
			var t = targets[ i ];
			gsap.fromTo( wd,
				{ yPercent: 112, rotate: 4, fontWeight: Math.max( 120, t.w - 220 ), '--soft': 100 },
				{ yPercent: 0, rotate: 0, duration: 1.3, ease: 'expo.out', delay: ( delay || 0 ) + i * 0.065 }
			);
			gsap.to( wd, { fontWeight: t.w, '--soft': t.s, duration: 1.9, ease: 'power3.out', delay: ( delay || 0 ) + 0.25 + i * 0.065 } );
		} );
	}
	CR.kineticPlay = kineticPlay;

	var kinetics = $$( '.is-style-kinetic, .cr-kinetic' ).filter( function ( el ) {
		return ! el.closest( '.cr-svc-hero__ghost' );
	} );
	kinetics.forEach( function ( el ) {
		splitWords( el );
		if ( ! motion ) {
			return;
		}
		el.classList.add( 'cr-kin-ready' );
		if ( el.classList.contains( 'cr-hero__title' ) ) {
			return; // Played by the hero intro.
		}
		ST.create( { trigger: el, start: 'top 90%', once: true, onEnter: function () { kineticPlay( el, 0 ); } } );
	} );

	/* ---------- Hero intro ---------- */
	var hero = d.querySelector( '.cr-hero' );
	if ( hero ) {
		var title = hero.querySelector( '.cr-hero__title' );
		var intro = function () {
			if ( ! html.classList.contains( 'cr-intro' ) && ! motion ) {
				return;
			}
			html.classList.remove( 'cr-intro' );
			if ( ! motion ) {
				return;
			}
			if ( title ) {
				kineticPlay( title, 0.15 );
			}
			var bits = $$( '.cr-hero__copy > :not(.cr-hero__title)', hero );
			gsap.from( bits, { opacity: 0, y: 26, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.55 } );
			gsap.from( hero.querySelector( '.cr-hero__form' ), { opacity: 0, y: 50, rotate: 1.5, duration: 1.4, ease: 'expo.out', delay: 0.7 } );
			gsap.from( hero.querySelector( '.cr-hero__foot' ), { opacity: 0, duration: 1.2, delay: 1.1 } );
		};
		var started = false;
		var go = function () {
			if ( ! started ) {
				started = true;
				intro();
			}
		};
		if ( d.fonts && d.fonts.ready ) {
			d.fonts.ready.then( go );
		}
		setTimeout( go, 900 );
	}

	/* ---------- Compass cursor ---------- */
	if ( ( fine && ! reduced ) || capture ) {
		var cur = d.createElement( 'div' );
		cur.className = 'cr-cursor';
		cur.setAttribute( 'aria-hidden', 'true' );
		cur.innerHTML = '<div class="cr-cursor__ring"></div><div class="cr-cursor__needle"><svg viewBox="0 0 44 44">' +
			'<path d="M22 5 25.4 22H22Z" fill="#FFB224"/><path d="M22 5 18.6 22H22Z" fill="#D98E00"/>' +
			'<path d="M22 39 25.4 22H22Z" fill="#F4F0E6"/><path d="M22 39 18.6 22H22Z" fill="#B9B2A0"/>' +
			'<circle cx="22" cy="22" r="2.2" fill="#0A1628" stroke="#F4F0E6" stroke-width="1"/></svg></div>';
		d.body.appendChild( cur );
		html.classList.add( 'cr-has-cursor' );
		var needle = cur.querySelector( '.cr-cursor__needle svg' );
		var cx = CR.mouse.x;
		var cy = CR.mouse.y;
		var ang = 0;
		var svx = 0;
		var svy = 0;
		var still = 0;
		var lastX = cx;
		var lastY = cy;
		var loop = function () {
			var m = CR.mouse;
			cx += ( m.x - cx ) * 0.45;
			cy += ( m.y - cy ) * 0.45;
			var dx = cx - lastX;
			var dy = cy - lastY;
			lastX = cx;
			lastY = cy;
			svx += ( dx - svx ) * 0.25;
			svy += ( dy - svy ) * 0.25;
			var sp = Math.sqrt( svx * svx + svy * svy );
			var targetAng;
			if ( sp > 0.6 ) {
				targetAng = Math.atan2( svy, svx ) * 180 / Math.PI + 90;
				still = 0;
			} else {
				still++;
				targetAng = still > 24 ? 0 : ang; // At rest the needle settles back to north.
			}
			var diff = ( ( targetAng - ang ) % 360 + 540 ) % 360 - 180;
			ang += diff * ( still > 24 ? 0.06 : 0.22 );
			cur.style.transform = 'translate3d(' + cx.toFixed( 1 ) + 'px,' + cy.toFixed( 1 ) + 'px,0)';
			needle.style.transform = 'rotate(' + ang.toFixed( 2 ) + 'deg)';
			if ( m.moved ) {
				cur.classList.add( 'is-on' );
			}
		};
		if ( gsap ) {
			gsap.ticker.add( loop );
		} else {
			( function raf() { loop(); requestAnimationFrame( raf ); } )();
		}
		d.addEventListener( 'pointerover', function ( e ) {
			var t = e.target;
			cur.classList.toggle( 'is-text', !! t.closest( 'input:not([type=radio]):not([type=checkbox]), textarea, select' ) );
			cur.classList.toggle( 'is-hover', !! t.closest( 'a, button, label, summary, .cr-rc__card, .cr-line' ) );
		} );
		d.addEventListener( 'pointerdown', function () { cur.classList.add( 'is-down' ); } );
		d.addEventListener( 'pointerup', function () { cur.classList.remove( 'is-down' ); } );
		d.addEventListener( 'pointerleave', function () { cur.classList.remove( 'is-on' ); } );
		CR.cursor = cur;
	}

	/* ---------- Magnetic buttons ---------- */
	if ( motion && ( fine || capture ) ) {
		var mags = $$( '.wp-block-button:not(.is-style-arrow):not(.cr-act) > .wp-block-button__link, .cr-form__submit' );
		mags.forEach( function ( el ) {
			if ( el.closest( '.cr-actionbar' ) ) {
				return;
			}
			var inner = d.createElement( 'span' );
			inner.className = 'cr-mag-inner';
			while ( el.firstChild ) {
				inner.appendChild( el.firstChild );
			}
			el.appendChild( inner );
			el._crInner = inner;
		} );
		var magTick = function () {
			var m = CR.mouse;
			if ( ! m.moved ) {
				return;
			}
			mags.forEach( function ( el ) {
				var r = el.getBoundingClientRect();
				if ( r.bottom < 0 || r.top > w.innerHeight ) {
					return;
				}
				var mx = r.left + r.width / 2;
				var my = r.top + r.height / 2;
				var dx = m.x - mx;
				var dy = m.y - my;
				var reach = Math.max( r.width, r.height ) * 0.6 + 40;
				var inside = Math.abs( dx ) < r.width / 2 + 40 && Math.abs( dy ) < r.height / 2 + 30 && Math.sqrt( dx * dx + dy * dy ) < reach;
				var on = !! el._crMag;
				if ( inside ) {
					el._crMag = true;
					gsap.to( el, { x: dx * 0.3, y: dy * 0.35, duration: 0.5, ease: 'power3.out', overwrite: 'auto' } );
					if ( el._crInner ) {
						gsap.to( el._crInner, { x: dx * 0.12, y: dy * 0.12, duration: 0.5, ease: 'power3.out', overwrite: 'auto' } );
					}
				} else if ( on ) {
					el._crMag = false;
					gsap.to( el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' } );
					if ( el._crInner ) {
						gsap.to( el._crInner, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' } );
					}
				}
			} );
		};
		gsap.ticker.add( magTick );
	}

	/* ---------- Forms: micro-interactions and demo submission ---------- */
	var tickSvg = '<svg class="cr-field__tick" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5 7.2 13 14.5 5.2"/></svg>';
	function labelText( field ) {
		var l = field.querySelector( 'label' );
		return l ? l.childNodes[ 0 ].textContent.trim().toLowerCase() : 'this field';
	}
	function message( input, field ) {
		var v = input.validity;
		if ( v.valueMissing ) {
			return input.tagName === 'SELECT' ? 'Please choose one.' : 'Please add ' + ( /your name/.test( labelText( field ) ) ? 'your name' : 'your ' + labelText( field ).replace( /^your /, '' ) ) + '.';
		}
		if ( v.typeMismatch ) {
			return 'That email looks incomplete.';
		}
		if ( v.patternMismatch ) {
			return 'Please use at least 10 digits.';
		}
		return 'Please check this field.';
	}
	function check( input, quiet ) {
		var field = input.closest( '.cr-field' );
		if ( ! field ) {
			return input.checkValidity();
		}
		var ok = input.checkValidity();
		var filled = input.value.trim() !== '';
		var err = field.querySelector( '.cr-field__error' );
		field.classList.toggle( 'is-valid', ok && filled );
		if ( ! quiet ) {
			field.classList.toggle( 'is-invalid', ! ok );
			if ( err ) {
				err.textContent = ok ? '' : message( input, field );
			}
			input.setAttribute( 'aria-invalid', ok ? 'false' : 'true' );
		} else if ( ok && field.classList.contains( 'is-invalid' ) ) {
			field.classList.remove( 'is-invalid' );
			if ( err ) {
				err.textContent = '';
			}
			input.setAttribute( 'aria-invalid', 'false' );
		}
		return ok;
	}
	function formatPhone( v ) {
		var digits = v.replace( /[^\d+]/g, '' );
		if ( /^0\d{10}$/.test( digits ) ) {
			return /^0[12]/.test( digits ) ? digits.replace( /^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3' ) : digits.replace( /^(\d{5})(\d{6})$/, '$1 $2' );
		}
		return v;
	}
	function enhanceForm( form ) {
		if ( form._crForm ) {
			return;
		}
		form._crForm = true;
		$$( '.cr-field', form ).forEach( function ( field ) {
			var input = field.querySelector( 'input, select, textarea' );
			if ( ! input || input.type === 'date' ) {
				return;
			}
			if ( input.tagName !== 'TEXTAREA' ) {
				field.insertAdjacentHTML( 'beforeend', tickSvg );
			}
			if ( input.tagName === 'SELECT' ) {
				field.querySelector( '.cr-field__tick' ).style.right = '2.4rem';
			}
			if ( input.maxLength > 0 ) {
				var c = d.createElement( 'span' );
				c.className = 'cr-field__count';
				c.setAttribute( 'aria-hidden', 'true' );
				field.appendChild( c );
				var upd = function () { c.textContent = input.value.length + ' / ' + input.maxLength; };
				input.addEventListener( 'input', upd );
				upd();
			}
			if ( input.type === 'tel' ) {
				input.addEventListener( 'input', function () {
					var clean = input.value.replace( /[^\d +]/g, '' );
					if ( clean !== input.value ) {
						input.value = clean;
					}
				} );
				input.addEventListener( 'blur', function () { input.value = formatPhone( input.value ); } );
			}
			input.addEventListener( 'blur', function () {
				if ( input.value.trim() !== '' || field.classList.contains( 'is-invalid' ) ) {
					check( input );
				}
			} );
			input.addEventListener( 'input', function () { check( input, true ); } );
			input.addEventListener( 'change', function () { check( input, true ); } );
		} );
		form.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			var status = form.querySelector( '.cr-form__status' );
			var btn = form.querySelector( '.cr-form__submit' );
			var bad = null;
			$$( 'input, select, textarea', form ).forEach( function ( input ) {
				if ( input.type === 'hidden' ) {
					return;
				}
				var ok = input.closest( '.cr-field' ) ? check( input ) : input.checkValidity();
				if ( ! ok && ! bad ) {
					bad = input;
				}
			} );
			if ( bad ) {
				var f = bad.closest( '.cr-field' ) || bad.closest( 'label' );
				bad.focus();
				if ( f ) {
					f.classList.remove( 'is-shake' );
					void f.offsetWidth;
					f.classList.add( 'is-shake' );
				}
				if ( status ) {
					status.textContent = bad.type === 'checkbox' ? 'Please tick the consent box so we can contact you.' : 'Nearly there: ' + ( ( f && f.querySelector( '.cr-field__error' ) ) ? f.querySelector( '.cr-field__error' ).textContent : 'please check the highlighted field.' );
				}
				return;
			}
			var name = ( form.querySelector( '[name=name]' ) || { value: '' } ).value.trim().split( ' ' )[ 0 ];
			var label = btn && btn.querySelector( '.cr-form__label' );
			if ( btn ) {
				btn.classList.add( 'is-sending' );
				btn.disabled = true;
				if ( label ) {
					label.firstChild.textContent = 'Connecting';
				}
			}
			setTimeout( function () {
				if ( btn ) {
					btn.classList.remove( 'is-sending' );
					btn.classList.add( 'is-sent' );
					if ( label ) {
						label.firstChild.textContent = form.classList.contains( 'cr-form--quote' ) ? 'Request received' : 'Call booked';
					}
				}
				if ( status ) {
					status.textContent = 'Thanks' + ( name ? ', ' + name : '' ) + '. A broker will call you back within four office hours.';
				}
			}, 1300 );
		} );
	}
	CR.enhanceForm = enhanceForm;
	$$( 'form[data-cr-form]' ).forEach( enhanceForm );

	/* ---------- Kinetic marquee ---------- */
	$$( '.cr-marquee' ).forEach( function ( m ) {
		var track = m.querySelector( '.cr-marquee__track' );
		if ( ! track ) {
			return;
		}
		var n = 0;
		Array.prototype.slice.call( track.childNodes ).forEach( function ( node ) {
			if ( node.nodeType === 3 && node.textContent.trim() ) {
				if ( n++ % 2 === 1 ) {
					var s = d.createElement( 'span' );
					s.className = 'cr-o';
					s.textContent = node.textContent;
					track.replaceChild( s, node );
				}
			}
		} );
		$$( 'span:not(.cr-o)', track ).forEach( function ( s ) { s.setAttribute( 'aria-hidden', 'true' ); } );
		if ( reduced || ! gsap ) {
			return;
		}
		var row = d.createElement( 'div' );
		row.className = 'cr-marquee__row';
		track.parentNode.insertBefore( row, track );
		row.appendChild( track );
		for ( var k = 0; k < 2; k++ ) {
			var cl = track.cloneNode( true );
			cl.setAttribute( 'aria-hidden', 'true' );
			row.appendChild( cl );
		}
		var x = 0;
		var dir = 1;
		var lastY = w.scrollY;
		var boost = 0;
		var skew = 0;
		gsap.ticker.add( function ( time, dt ) {
			var y = w.scrollY;
			var dy = y - lastY;
			lastY = y;
			if ( dy !== 0 ) {
				dir = dy > 0 ? 1 : -1;
			}
			boost += ( Math.min( Math.abs( dy ), 60 ) * 0.35 - boost ) * 0.12;
			skew += ( Math.max( -10, Math.min( 10, -dy * 0.25 ) ) - skew ) * 0.1;
			var width = track.offsetWidth;
			x -= ( 1.1 + boost ) * dir * ( dt / 16.67 );
			if ( width ) {
				x = ( ( x % width ) + width ) % width - width;
			}
			row.style.transform = 'translate3d(' + x.toFixed( 2 ) + 'px,0,0) skewX(' + skew.toFixed( 2 ) + 'deg)';
		} );
	} );

	/* ---------- Line previews that follow the cursor ---------- */
	var list = d.querySelector( '.cr-lines__list' );
	if ( list && fine && motion ) {
		var prev = d.createElement( 'div' );
		prev.className = 'cr-preview';
		prev.setAttribute( 'aria-hidden', 'true' );
		prev.innerHTML = '<div class="cr-preview__map"></div><span class="cr-preview__n"></span>';
		d.body.appendChild( prev );
		var map = prev.querySelector( '.cr-preview__map' );
		var num = prev.querySelector( '.cr-preview__n' );
		var px = CR.mouse.x;
		var py = CR.mouse.y;
		var shown = false;
		gsap.ticker.add( function () {
			if ( ! shown ) {
				return;
			}
			var m = CR.mouse;
			var nx = px + ( m.x + 170 - px ) * 0.14;
			var ny = py + ( m.y - py ) * 0.14;
			var rot = Math.max( -12, Math.min( 12, ( nx - px ) * 0.6 ) );
			px = nx;
			py = ny;
			prev.style.left = px + 'px';
			prev.style.top = py + 'px';
			prev.style.rotate = rot.toFixed( 2 ) + 'deg';
		} );
		$$( '.cr-line', list ).forEach( function ( row, i ) {
			row.addEventListener( 'pointerenter', function () {
				num.textContent = ( row.querySelector( '.cr-line__num' ) || {} ).textContent || '';
				map.style.transform = 'translate(' + ( -i * 9 ) + '%,' + ( i * 6 - 8 ) + '%) rotate(' + ( i * 24 ) + 'deg) scale(' + ( 1 + i * 0.12 ) + ')';
				if ( ! shown ) {
					px = CR.mouse.x + 170;
					py = CR.mouse.y;
				}
				shown = true;
				gsap.to( prev, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)', overwrite: 'auto' } );
			} );
		} );
		list.addEventListener( 'pointerleave', function () {
			gsap.to( prev, { opacity: 0, scale: 0.6, duration: 0.35, ease: 'power2.in', overwrite: 'auto', onComplete: function () { shown = false; } } );
		} );
	}

	/* ---------- Comparison tables ---------- */
	var yes = '<svg class="cr-ic cr-ic--yes" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="11"/><path d="M6.5 11.4 9.6 14.4 15.6 8"/></svg><span class="screen-reader-text">Included</span>';
	var no = '<svg class="cr-ic cr-ic--no" viewBox="0 0 22 22" aria-hidden="true"><path d="M7 11h8"/></svg><span class="screen-reader-text">Not included</span>';
	$$( '.wp-block-table.is-style-compare' ).forEach( function ( fig ) {
		$$( 'td', fig ).forEach( function ( td ) {
			var t = td.textContent.trim();
			if ( t === '✓' || t === '✔' ) {
				td.innerHTML = yes;
			} else if ( t === '—' || t === '-' || t === '–' ) {
				td.innerHTML = no;
			}
		} );
		if ( ! motion ) {
			return;
		}
		fig.classList.add( 'cr-cmp-ready' );
		var circles = $$( '.cr-ic--yes circle', fig );
		gsap.set( circles, { scale: 0, transformOrigin: '50% 50%' } );
		var prices = $$( 'tbody tr:last-child td:not(:first-child)', fig );
		ST.create( {
			trigger: fig,
			start: 'top 82%',
			once: true,
			onEnter: function () {
				var tl = gsap.timeline();
				tl.to( $$( 'thead th', fig ), { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: 'power3.out' } )
					.to( $$( 'tbody tr', fig ), { opacity: 1, y: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' }, '-=0.35' )
					.to( circles, { scale: 1, stagger: 0.03, duration: 0.55, ease: 'back.out(2.2)' }, '-=0.7' )
					.to( $$( '.cr-ic--yes path', fig ), { strokeDashoffset: 0, stagger: 0.03, duration: 0.5, ease: 'power2.out' }, '-=0.75' );
				prices.forEach( function ( td ) {
					var m = td.textContent.match( /^(\D*)(\d+)(.*)$/ );
					if ( ! m ) {
						return;
					}
					var o = { v: 0 };
					tl.to( o, { v: +m[ 2 ], duration: 1.1, ease: 'power2.out', onUpdate: function () { td.textContent = m[ 1 ] + Math.round( o.v ) + m[ 3 ]; } }, 0.5 );
				} );
			}
		} );
	} );

	/* ---------- Scroll-lit pull quotes ---------- */
	$$( '.wp-block-pullquote.is-style-scrub' ).forEach( function ( pq ) {
		var p = pq.querySelector( 'p' );
		if ( ! p || ! motion ) {
			return;
		}
		var ws = splitWords( p, 'cr-sw' );
		ST.create( {
			trigger: pq,
			start: 'top 78%',
			end: 'bottom 45%',
			scrub: true,
			onUpdate: function ( self ) {
				var lit = Math.round( self.progress * ws.length );
				ws.forEach( function ( wd, i ) { wd.classList.toggle( 'is-lit', i < lit ); } );
			}
		} );
	} );

	/* ---------- Count-ups ---------- */
	$$( '.cr-target__num' ).forEach( function ( el ) {
		var m = el.textContent.trim().match( /^(\d+)(.*)$/ );
		if ( ! m || ! motion ) {
			return;
		}
		var o = { v: 0 };
		el.textContent = '0' + m[ 2 ];
		ST.create( { trigger: el, start: 'top 90%', once: true, onEnter: function () {
			gsap.to( o, { v: +m[ 1 ], duration: 1.6, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round( o.v ) + m[ 2 ]; } } );
		} } );
	} );

	/* ---------- Service hero parallax ---------- */
	var svc = d.querySelector( '.cr-svc-hero' );
	if ( svc ) {
		var ghost = svc.querySelector( '.cr-svc-hero__ghost' );
		if ( ghost ) {
			ghost.setAttribute( 'aria-hidden', 'true' );
		}
		if ( motion ) {
			gsap.fromTo( svc, { '--p1': '0px', '--p2': '0px', '--p3': '0px' }, {
				'--p1': '180px', '--p2': '300px', '--p3': '-90px', ease: 'none',
				scrollTrigger: { trigger: svc, start: 'top top', end: 'bottom top', scrub: true }
			} );
			if ( ghost ) {
				gsap.fromTo( svc, { '--gx': '22vw' }, { '--gx': '0vw', duration: 2.2, ease: 'expo.out', delay: 0.1 } );
			}
			var inner = svc.querySelector( '.cr-svc-hero__inner' );
			if ( inner ) {
				gsap.to( inner, { opacity: 0.15, ease: 'none', scrollTrigger: { trigger: svc, start: '30% top', end: 'bottom top', scrub: true } } );
			}
		}
	}
	$$( '.wp-block-group.is-style-contour' ).forEach( function ( g ) {
		if ( ! motion || g.classList.contains( 'cr-svc-hero' ) ) {
			return;
		}
		gsap.fromTo( g, { '--py': '-50px' }, { '--py': '50px', ease: 'none', scrollTrigger: { trigger: g, start: 'top bottom', end: 'bottom top', scrub: true } } );
	} );

	/* ---------- Animated details folds ---------- */
	$$( 'details.wp-block-details' ).forEach( function ( det ) {
		var sum = det.querySelector( 'summary' );
		if ( ! sum || reduced || ! det.animate ) {
			return;
		}
		var busy = false;
		sum.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			if ( busy ) {
				return;
			}
			busy = true;
			var start = det.offsetHeight;
			det.style.overflow = 'hidden';
			if ( det.open ) {
				var end = sum.offsetHeight;
				det.animate( { height: [ start + 'px', end + 'px' ] }, { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' } ).onfinish = function () {
					det.open = false;
					det.style.overflow = '';
					busy = false;
				};
			} else {
				det.open = true;
				var end2 = det.offsetHeight;
				det.animate( { height: [ start + 'px', end2 + 'px' ] }, { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)' } ).onfinish = function () {
					det.style.overflow = '';
					busy = false;
				};
			}
		} );
	} );

	/* ---------- Sector cards: wipe from the pointer ---------- */
	$$( '.cr-sector' ).forEach( function ( card ) {
		card.addEventListener( 'pointerenter', function ( e ) {
			var r = card.getBoundingClientRect();
			card.style.setProperty( '--mx', ( e.clientX - r.left ) + 'px' );
			card.style.setProperty( '--my', ( e.clientY - r.top ) + 'px' );
		} );
	} );

	/* ---------- Current line in the service sidebar ---------- */
	$$( '.cr-aside__list a' ).forEach( function ( a ) {
		if ( a.pathname.replace( /\/$/, '' ) === location.pathname.replace( /\/$/, '' ) || ( a.getAttribute( 'href' ) || '' ).replace( /\/$/, '' ).split( '/' ).pop() === location.pathname.replace( /\/$/, '' ).split( '/' ).pop().replace( /\.html$/, '' ) ) {
			a.classList.add( 'is-current' );
			a.setAttribute( 'aria-current', 'page' );
		}
	} );

	/* ---------- Quiet reveals for cards below the fold ---------- */
	if ( motion ) {
		var rev = $$( '.cr-card, .cr-sector, .cr-principle, .cr-line, .cr-target, .cr-panel, .cr-example, .cr-quote__side > *, .cr-ready' ).filter( function ( el ) {
			return el.getBoundingClientRect().top > w.innerHeight;
		} );
		gsap.set( rev, { opacity: 0, y: 36 } );
		ST.batch( rev, { start: 'top 90%', once: true, onEnter: function ( b ) {
			gsap.to( b, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08, overwrite: true } );
		} } );
	}

	w.addEventListener( 'load', function () {
		if ( ST ) {
			ST.refresh();
		}
	} );
} )();
