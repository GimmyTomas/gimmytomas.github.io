/*
 * Photo slideshow for the trip diary pages.
 *
 * Left-click a photo to open it full screen; arrow keys, on-screen arrows or a
 * swipe move through every photo on the page in document order.
 *
 * Photos deliberately stay bare <img> elements with no <a> wrapper, so that
 * right-click still gives the browser's own menu ("Open Image in New Tab",
 * "Save Image As") on the full-resolution original, exactly as before.
 */

(function () {
    var photos = [];
    var overlay = null;
    var lbImage, lbCaption, lbCounter, lbClose;
    var current = 0;
    var lastFocused = null;
    var savedOverflowY = '';
    var touchStartX = null;

    function buildOverlay() {
        overlay = document.createElement('div');
        overlay.className = 'lb-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Photo slideshow');

        /* Glyphs are written as \u escapes so this file stays pure ASCII:
         * the pages declare no charset, so a literal UTF-8 multiplication
         * sign or angle quote would be decoded as Windows-1252 and show up
         * as mojibake. */
        lbClose = makeButton('lb-close', '\u00D7', 'Close', close);          /* x */
        var prev = makeButton('lb-prev', '\u2039', 'Previous photo', function () { step(-1); });
        var next = makeButton('lb-next', '\u203A', 'Next photo', function () { step(1); });

        lbImage = document.createElement('img');
        lbImage.className = 'lb-img';

        lbCaption = document.createElement('figcaption');
        lbCaption.className = 'lb-caption';

        var figure = document.createElement('figure');
        figure.className = 'lb-figure';
        figure.appendChild(lbImage);
        figure.appendChild(lbCaption);

        lbCounter = document.createElement('div');
        lbCounter.className = 'lb-counter';

        overlay.appendChild(lbClose);
        overlay.appendChild(prev);
        overlay.appendChild(next);
        overlay.appendChild(figure);
        overlay.appendChild(lbCounter);

        /* Only a click on the backdrop itself closes. Checking the target
         * rather than stopping propagation on the children keeps the browser's
         * own handling of those children intact. */
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay || e.target === figure) close();
        });

        overlay.addEventListener('touchstart', function (e) {
            touchStartX = e.changedTouches[0].clientX;
        }, { passive: true });

        overlay.addEventListener('touchend', function (e) {
            if (touchStartX === null) return;
            var dx = e.changedTouches[0].clientX - touchStartX;
            touchStartX = null;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        }, { passive: true });

        document.body.appendChild(overlay);
    }

    function makeButton(className, glyph, label, handler) {
        /* <button>, not <a> -- the site sets <base target="_blank">, which
         * would make any anchor here open a new tab. */
        var b = document.createElement('button');
        b.type = 'button';
        b.className = className;
        b.textContent = glyph;
        b.setAttribute('aria-label', label);
        b.addEventListener('click', handler);
        return b;
    }

    function show(index) {
        var n = photos.length;
        current = ((index % n) + n) % n;   /* wrap at both ends */
        var photo = photos[current];

        lbImage.src = photo.src;
        lbImage.alt = photo.alt || '';

        var caption = photo.parentNode.querySelector('figcaption');
        /* innerHTML, not textContent: at least one caption contains an <em>. */
        lbCaption.innerHTML = caption ? caption.innerHTML : '';

        lbCounter.textContent = (current + 1) + ' / ' + n;

        preload(current + 1);
        preload(current - 1);
    }

    function preload(index) {
        var n = photos.length;
        if (n < 2) return;
        var img = new Image();
        img.src = photos[((index % n) + n) % n].src;
    }

    function step(delta) {
        show(current + delta);
    }

    function onKeydown(e) {
        if (!overlay || overlay.className.indexOf('open') === -1) return;
        switch (e.key) {
            case 'ArrowRight': step(1); break;
            case 'ArrowLeft':  step(-1); break;
            case 'Escape':     close(); break;
            case 'Home':       show(0); break;
            case 'End':        show(photos.length - 1); break;
            default: return;
        }
        e.preventDefault();
    }

    function open(index, trigger) {
        if (!overlay) buildOverlay();
        lastFocused = trigger || null;
        show(index);
        overlay.className = 'lb-overlay open';
        /* The stylesheet sets body { overflow-y: scroll }; remember it so the
         * scrollbar gutter comes back exactly as it was. */
        savedOverflowY = document.body.style.overflowY;
        document.body.style.overflow = 'hidden';
        lbClose.focus();
    }

    function close() {
        if (!overlay) return;
        overlay.className = 'lb-overlay';
        document.body.style.overflow = '';
        document.body.style.overflowY = savedOverflowY;
        /* Drop the src so a multi-megabyte original isn't held decoded. */
        lbImage.removeAttribute('src');
        if (lastFocused) lastFocused.focus();
        lastFocused = null;
    }

    function init() {
        photos = Array.prototype.slice.call(
            document.querySelectorAll('#content figure img')
        );
        if (!photos.length) return;

        photos.forEach(function (photo, index) {
            /* The zoom-in cursor is tied to this class rather than a bare
             * "figure img" rule, so pages that don't load this script don't
             * advertise a click that does nothing. */
            photo.className = photo.className
                ? photo.className + ' zoomable'
                : 'zoomable';
            photo.addEventListener('click', function () {
                open(index, photo);
            });
        });

        document.addEventListener('keydown', onKeydown);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
