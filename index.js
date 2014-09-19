/**
 * @license -------------------------------------------------------------------
 *    module: Lanczos Resampling
 *       src: http://blog.yoz.sk/2010/11/lanczos-resampling-with-actionscript/
 *   authors: Jozef Chutka
 * copyright: (c) 2009-2010 Jozef Chutka
 *   license: MIT
 * -------------------------------------------------------------------
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

var ResampleLanczos = (function() {
	var CACHE;
	var CACHE_PRECISION = 1000;
	var FILTER_SIZE = 1;

	var kernels = {
		lanczos: function (size, x) {
			if (x >= size || x <= -size) return 0;
			if (x === 0) return 1;
			var xpi = x * Math.PI;
			return size * Math.sin(xpi) * Math.sin(xpi / size) / (xpi * xpi);
		},
		linear: function(size, x) { //-
			x = Math.abs(x);
			if (x <= 1) return (1 - x) * size;
			return 0;
		}
	};

	function createCache(kernel, cachePrecision, filterSize) {
		var cache = {};
		var max = filterSize * filterSize * cachePrecision;
		var iPrecision = 1.0 / cachePrecision;
		var value;
		for (var cacheKey = 0; cacheKey < max; cacheKey++) {
			value = kernel(filterSize, Math.sqrt(cacheKey * iPrecision));
			cache[cacheKey] = value < 0 ? 0 : value;
		}
		return cache;
	};
	
	var createCanvas = function(width, height) {
		var canvas;
		if (typeof(document) === "undefined") {
			canvas = new Canvas;
		} else {
			canvas = document.createElement("canvas");
		}
		canvas.ctx = canvas.getContext("2d");
		canvas.width = width;
		canvas.height = height;
		return canvas;
	};

	return function(img, width, height, filterSize, kernel) {
		var cwidth = img.width;
		var cheight = img.height;
		var canvas = createCanvas(cwidth, cheight);
		var ctx = canvas.ctx;
		ctx.drawImage(img, 0, 0);
		///
		var src = ctx.getImageData(0, 0, img.width, img.height);
		var dst = ctx.createImageData(width, height);
		///
		var swidth = src.width;
		var sheight = src.height;
		var sdata = src.data;
		var dwidth = dst.width;
		var dheight = dst.height;
		var ddata = dst.data;
		///
		var total, distanceY, value;
		var a, r, g, b;
		var i, color, cacheKey;
		///
		var x, x1, x1b, x1e;
		var y, y1, y1b, y1e, y2, y3;
		var y1et, x1et;
		///
		var values = [];
		var sx = width / img.width;
		var sy = height / img.height;
		var sw1 = img.width - 1;
		var sh1 = img.height - 1;
		var isx = 1.0 / sx;
		var isy = 1.0 / sy;
		var cw = 1.0 / width;
		var ch = 1.0 / height;
		var csx = Math.min(1, sx) * Math.min(1, sx);
		var csy = Math.min(1, sy) * Math.min(1, sy);
		var cx, cy;
		var sourcePixelX, sourcePixelY;
		var cache = CACHE = undefined;
		var cachePrecision = CACHE_PRECISION;
		var filterSize = filterSize || FILTER_SIZE;
		var kernel = kernels[kernel] || kernels.lanczos;
		if (!cache) CACHE = cache = createCache(kernel, cachePrecision, filterSize);
		y = height;

		while (y--) {
			sourcePixelY = (y + 0.5) * isy;
			y1b = sourcePixelY - filterSize;
			if (y1b < 0) y1b = 0;
			y1e = y1et = sourcePixelY + filterSize;
			if (y1e != y1et) y1e = y1et + 1;
			if (y1e > sh1) y1e = sh1;
			cy = y * ch - sourcePixelY;
			y3 = y * width;
			x = width;
			while (x--) {
				sourcePixelX = (x + 0.5) * isx;
				x1b = sourcePixelX - filterSize;
				if (x1b < 0) x1b = 0;
				x1e = x1et = sourcePixelX + filterSize;
				if (x1e != x1et) x1e = x1et + 1;
				if (x1e > sw1) x1e = sw1;
				cx = x * cw - sourcePixelX;
				///
				i = total = 0;
				for (y1 = y1b >> 0; y1 <= y1e; y1++) {
					distanceY = (y1 + cy) * (y1 + cy) * csy;
					for (x1 = x1b >> 0; x1 <= x1e; x1++) {
						total += values[i++] = cache[((x1 + cx) * (x1 + cx) * csx + distanceY) * cachePrecision >> 0] || 0;
					}
				}
				total = 1.0 / total;
				///
				i = a = r = g = b = 0;
				for (y1 = y1b >> 0; y1 <= y1e; y1++) {
					y2 = y1 * img.width;
					for (x1 = x1b >> 0; x1 <= x1e; x1++) {
						value = values[i++] * total;
						idx = ((y2 + x1) >> 0) * 4;
						r += sdata[idx] * value;
						g += sdata[idx + 1] * value;
						b += sdata[idx + 2] * value;
						a += sdata[idx + 3] * value;
					}
				}
				idx = ((x + y3) >> 0) * 4;
				ddata[idx] = r;
				ddata[idx + 1] = g;
				ddata[idx + 2] = b;
				ddata[idx + 3] = a;
			}
		}
		///
		var canvas = createCanvas(dst.width, dst.height);
		var ctx = canvas.ctx;
		ctx.putImageData(dst, 0, 0)
		return canvas;
	}
})();

/// NodeJS
if (typeof (module) !== "undefined" && module.exports) {
	var Canvas = require("canvas");
	module.exports = ResampleLanczos;
}
