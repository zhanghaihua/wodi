(function(){
    Library.domUtils = sumeru.Library.create(function(exports){

    	/**
		 * NodeJS wrapper for JavaScript Encoder library http://www.strictly-software.com/htmlencode
		 * Pavel Minchenkov
		 * source: https://github.com/minchenkov/node-html-encoder
		 * Licence: GPL
		 */
		exports.Encoder = function(type) {
		    return {

		        // When encoding do we convert characters into html or numerical entities
		        EncodeType : type || "entity",  // entity OR numerical

		        isEmpty : function(val) {
		            if (val) {
		                return ((val === null) || val.length == 0 || /^\s+$/.test(val));
		            } else {
		                return true;
		            }
		        },
		        arr1: new Array('&nbsp;', '&iexcl;', '&cent;', '&pound;', '&curren;', '&yen;', '&brvbar;', '&sect;', '&uml;', '&copy;', '&ordf;', '&laquo;', '&not;', '&shy;', '&reg;', '&macr;', '&deg;', '&plusmn;', '&sup2;', '&sup3;', '&acute;', '&micro;', '&para;', '&middot;', '&cedil;', '&sup1;', '&ordm;', '&raquo;', '&frac14;', '&frac12;', '&frac34;', '&iquest;', '&Agrave;', '&Aacute;', '&Acirc;', '&Atilde;', '&Auml;', '&Aring;', '&Aelig;', '&Ccedil;', '&Egrave;', '&Eacute;', '&Ecirc;', '&Euml;', '&Igrave;', '&Iacute;', '&Icirc;', '&Iuml;', '&ETH;', '&Ntilde;', '&Ograve;', '&Oacute;', '&Ocirc;', '&Otilde;', '&Ouml;', '&times;', '&Oslash;', '&Ugrave;', '&Uacute;', '&Ucirc;', '&Uuml;', '&Yacute;', '&THORN;', '&szlig;', '&agrave;', '&aacute;', '&acirc;', '&atilde;', '&auml;', '&aring;', '&aelig;', '&ccedil;', '&egrave;', '&eacute;', '&ecirc;', '&euml;', '&igrave;', '&iacute;', '&icirc;', '&iuml;', '&eth;', '&ntilde;', '&ograve;', '&oacute;', '&ocirc;', '&otilde;', '&ouml;', '&divide;', '&Oslash;', '&ugrave;', '&uacute;', '&ucirc;', '&uuml;', '&yacute;', '&thorn;', '&yuml;', '&quot;', '&amp;', '&lt;', '&gt;', '&oelig;', '&oelig;', '&scaron;', '&scaron;', '&yuml;', '&circ;', '&tilde;', '&ensp;', '&emsp;', '&thinsp;', '&zwnj;', '&zwj;', '&lrm;', '&rlm;', '&ndash;', '&mdash;', '&lsquo;', '&rsquo;', '&sbquo;', '&ldquo;', '&rdquo;', '&bdquo;', '&dagger;', '&dagger;', '&permil;', '&lsaquo;', '&rsaquo;', '&euro;', '&fnof;', '&alpha;', '&beta;', '&gamma;', '&delta;', '&epsilon;', '&zeta;', '&eta;', '&theta;', '&iota;', '&kappa;', '&lambda;', '&mu;', '&nu;', '&xi;', '&omicron;', '&pi;', '&rho;', '&sigma;', '&tau;', '&upsilon;', '&phi;', '&chi;', '&psi;', '&omega;', '&alpha;', '&beta;', '&gamma;', '&delta;', '&epsilon;', '&zeta;', '&eta;', '&theta;', '&iota;', '&kappa;', '&lambda;', '&mu;', '&nu;', '&xi;', '&omicron;', '&pi;', '&rho;', '&sigmaf;', '&sigma;', '&tau;', '&upsilon;', '&phi;', '&chi;', '&psi;', '&omega;', '&thetasym;', '&upsih;', '&piv;', '&bull;', '&hellip;', '&prime;', '&prime;', '&oline;', '&frasl;', '&weierp;', '&image;', '&real;', '&trade;', '&alefsym;', '&larr;', '&uarr;', '&rarr;', '&darr;', '&harr;', '&crarr;', '&larr;', '&uarr;', '&rarr;', '&darr;', '&harr;', '&forall;', '&part;', '&exist;', '&empty;', '&nabla;', '&isin;', '&notin;', '&ni;', '&prod;', '&sum;', '&minus;', '&lowast;', '&radic;', '&prop;', '&infin;', '&ang;', '&and;', '&or;', '&cap;', '&cup;', '&int;', '&there4;', '&sim;', '&cong;', '&asymp;', '&ne;', '&equiv;', '&le;', '&ge;', '&sub;', '&sup;', '&nsub;', '&sube;', '&supe;', '&oplus;', '&otimes;', '&perp;', '&sdot;', '&lceil;', '&rceil;', '&lfloor;', '&rfloor;', '&lang;', '&rang;', '&loz;', '&spades;', '&clubs;', '&hearts;', '&diams;'),
		        arr2: new Array('&#160;', '&#161;', '&#162;', '&#163;', '&#164;', '&#165;', '&#166;', '&#167;', '&#168;', '&#169;', '&#170;', '&#171;', '&#172;', '&#173;', '&#174;', '&#175;', '&#176;', '&#177;', '&#178;', '&#179;', '&#180;', '&#181;', '&#182;', '&#183;', '&#184;', '&#185;', '&#186;', '&#187;', '&#188;', '&#189;', '&#190;', '&#191;', '&#192;', '&#193;', '&#194;', '&#195;', '&#196;', '&#197;', '&#198;', '&#199;', '&#200;', '&#201;', '&#202;', '&#203;', '&#204;', '&#205;', '&#206;', '&#207;', '&#208;', '&#209;', '&#210;', '&#211;', '&#212;', '&#213;', '&#214;', '&#215;', '&#216;', '&#217;', '&#218;', '&#219;', '&#220;', '&#221;', '&#222;', '&#223;', '&#224;', '&#225;', '&#226;', '&#227;', '&#228;', '&#229;', '&#230;', '&#231;', '&#232;', '&#233;', '&#234;', '&#235;', '&#236;', '&#237;', '&#238;', '&#239;', '&#240;', '&#241;', '&#242;', '&#243;', '&#244;', '&#245;', '&#246;', '&#247;', '&#248;', '&#249;', '&#250;', '&#251;', '&#252;', '&#253;', '&#254;', '&#255;', '&#34;', '&#38;', '&#60;', '&#62;', '&#338;', '&#339;', '&#352;', '&#353;', '&#376;', '&#710;', '&#732;', '&#8194;', '&#8195;', '&#8201;', '&#8204;', '&#8205;', '&#8206;', '&#8207;', '&#8211;', '&#8212;', '&#8216;', '&#8217;', '&#8218;', '&#8220;', '&#8221;', '&#8222;', '&#8224;', '&#8225;', '&#8240;', '&#8249;', '&#8250;', '&#8364;', '&#402;', '&#913;', '&#914;', '&#915;', '&#916;', '&#917;', '&#918;', '&#919;', '&#920;', '&#921;', '&#922;', '&#923;', '&#924;', '&#925;', '&#926;', '&#927;', '&#928;', '&#929;', '&#931;', '&#932;', '&#933;', '&#934;', '&#935;', '&#936;', '&#937;', '&#945;', '&#946;', '&#947;', '&#948;', '&#949;', '&#950;', '&#951;', '&#952;', '&#953;', '&#954;', '&#955;', '&#956;', '&#957;', '&#958;', '&#959;', '&#960;', '&#961;', '&#962;', '&#963;', '&#964;', '&#965;', '&#966;', '&#967;', '&#968;', '&#969;', '&#977;', '&#978;', '&#982;', '&#8226;', '&#8230;', '&#8242;', '&#8243;', '&#8254;', '&#8260;', '&#8472;', '&#8465;', '&#8476;', '&#8482;', '&#8501;', '&#8592;', '&#8593;', '&#8594;', '&#8595;', '&#8596;', '&#8629;', '&#8656;', '&#8657;', '&#8658;', '&#8659;', '&#8660;', '&#8704;', '&#8706;', '&#8707;', '&#8709;', '&#8711;', '&#8712;', '&#8713;', '&#8715;', '&#8719;', '&#8721;', '&#8722;', '&#8727;', '&#8730;', '&#8733;', '&#8734;', '&#8736;', '&#8743;', '&#8744;', '&#8745;', '&#8746;', '&#8747;', '&#8756;', '&#8764;', '&#8773;', '&#8776;', '&#8800;', '&#8801;', '&#8804;', '&#8805;', '&#8834;', '&#8835;', '&#8836;', '&#8838;', '&#8839;', '&#8853;', '&#8855;', '&#8869;', '&#8901;', '&#8968;', '&#8969;', '&#8970;', '&#8971;', '&#9001;', '&#9002;', '&#9674;', '&#9824;', '&#9827;', '&#9829;', '&#9830;'),

		        // Convert HTML entities into numerical entities
		        HTML2Numerical : function(s) {
		            return this.swapArrayVals(s, this.arr1, this.arr2);
		        },

		        // Convert Numerical entities into HTML entities
		        NumericalToHTML : function(s) {
		            return this.swapArrayVals(s, this.arr2, this.arr1);
		        },


		        // Numerically encodes all unicode characters
		        numEncode : function(s) {

		            if (this.isEmpty(s)) return "";

		            var e = "";
		            for (var i = 0; i < s.length; i++) {
		                var c = s.charAt(i);
		                if (c < " " || c > "~") {
		                    c = "&#" + c.charCodeAt() + ";";
		                }
		                e += c;
		            }
		            return e;
		        },

		        // HTML Decode numerical and HTML entities back to original values
		        htmlDecode : function(s) {

		            var c,m,d = s;

		            if (this.isEmpty(d)) return "";

		            // convert HTML entites back to numerical entites first
		            d = this.HTML2Numerical(d);

		            // look for numerical entities &#34;
		            arr = d.match(/&#[0-9]{1,5};/g);

		            // if no matches found in string then skip
		            if (arr != null) {
		                for (var x = 0; x < arr.length; x++) {
		                    m = arr[x];
		                    c = m.substring(2, m.length - 1); //get numeric part which is refernce to unicode character
		                    // if its a valid number we can decode
		                    if (c >= -32768 && c <= 65535) {
		                        // decode every single match within string
		                        d = d.replace(m, String.fromCharCode(c));
		                    } else {
		                        d = d.replace(m, ""); //invalid so replace with nada
		                    }
		                }
		            }

		            return d;
		        },

		        // encode an input string into either numerical or HTML entities
		        htmlEncode : function(s, dbl) {

		            if (this.isEmpty(s)) return "";

		            // do we allow double encoding? E.g will &amp; be turned into &amp;amp;
		            dbl = dbl || false; //default to prevent double encoding

		            // if allowing double encoding we do ampersands first
		            if (dbl) {
		                if (this.EncodeType == "numerical") {
		                    s = s.replace(/&/g, "&#38;");
		                } else {
		                    s = s.replace(/&/g, "&amp;");
		                }
		            }

		            // convert the xss chars to numerical entities ' " < >
		            s = this.XSSEncode(s, false);

		            if (this.EncodeType == "numerical" || !dbl) {
		                // Now call function that will convert any HTML entities to numerical codes
		                s = this.HTML2Numerical(s);
		            }

		            // Now encode all chars above 127 e.g unicode
		            s = this.numEncode(s);

		            // now we know anything that needs to be encoded has been converted to numerical entities we
		            // can encode any ampersands & that are not part of encoded entities
		            // to handle the fact that I need to do a negative check and handle multiple ampersands &&&
		            // I am going to use a placeholder

		            // if we don't want double encoded entities we ignore the & in existing entities
		            if (!dbl) {
		                s = s.replace(/&#/g, "##AMPHASH##");

		                if (this.EncodeType == "numerical") {
		                    s = s.replace(/&/g, "&#38;");
		                } else {
		                    s = s.replace(/&/g, "&amp;");
		                }

		                s = s.replace(/##AMPHASH##/g, "&#");
		            }

		            // replace any malformed entities
		            s = s.replace(/&#\d*([^\d;]|$)/g, "$1");

		            if (!dbl) {
		                // safety check to correct any double encoded &amp;
		                s = this.correctEncoding(s);
		            }

		            // now do we need to convert our numerical encoded string into entities
		            if (this.EncodeType == "entity") {
		                s = this.NumericalToHTML(s);
		            }

		            return s;
		        },

		        // Encodes the basic 4 characters used to malform HTML in XSS hacks
		        XSSEncode : function(s, en) {
		            if (!this.isEmpty(s)) {
		                en = en || true;
		                // do we convert to numerical or html entity?
		                if (en) {
		                    s = s.replace(/\'/g, "&#39;"); //no HTML equivalent as &apos is not cross browser supported
		                    s = s.replace(/\"/g, "&quot;");
		                    s = s.replace(/</g, "&lt;");
		                    s = s.replace(/>/g, "&gt;");
		                } else {
		                    s = s.replace(/\'/g, "&#39;"); //no HTML equivalent as &apos is not cross browser supported
		                    s = s.replace(/\"/g, "&#34;");
		                    s = s.replace(/</g, "&#60;");
		                    s = s.replace(/>/g, "&#62;");
		                }
		                return s;
		            } else {
		                return "";
		            }
		        },

		        // returns true if a string contains html or numerical encoded entities
		        hasEncoded : function(s) {
		            if (/&#[0-9]{1,5};/g.test(s)) {
		                return true;
		            } else if (/&[A-Z]{2,6};/gi.test(s)) {
		                return true;
		            } else {
		                return false;
		            }
		        },

		        // will remove any unicode characters
		        stripUnicode : function(s) {
		            return s.replace(/[^\x20-\x7E]/g, "");

		        },

		        // corrects any double encoded &amp; entities e.g &amp;amp;
		        correctEncoding : function(s) {
		            return s.replace(/(&amp;)(amp;)+/, "$1");
		        },


		        // Function to loop through an array swaping each item with the value from another array e.g swap HTML entities with Numericals
		        swapArrayVals : function(s, arr1, arr2) {
		            if (this.isEmpty(s)) return "";
		            var re;
		            if (arr1 && arr2) {
		                //ShowDebug("in swapArrayVals arr1.length = " + arr1.length + " arr2.length = " + arr2.length)
		                // array lengths must match
		                if (arr1.length == arr2.length) {
		                    for (var x = 0,i = arr1.length; x < i; x++) {
		                        re = new RegExp(arr1[x], 'g');
		                        s = s.replace(re, arr2[x]); //swap arr1 item with matching item from arr2
		                    }
		                }
		            }
		            return s;
		        },

		        inArray : function(item, arr) {
		            for (var i = 0, x = arr.length; i < x; i++) {
		                if (arr[i] === item) {
		                    return i;
		                }
		            }
		            return -1;
		        }
		    }
		}



        exports.on = function(dom,type,handle){
            if(dom && type && handle){
                if(type.indexOf('on') == 0){
                    type = type.substr(2);
                }
                dom.addEventListener(type,handle);
            }
        };
        
        exports.hasClass = function(dom,testClassName){
            if(dom.className == ""){
                return false;
            }
            
            if(dom.classList && dom.classList.contains){
                return dom.classList.contains(testClassName);
            }
            
            var classArr = dom.className.split(' ');
            return classArr.indexOf(testClassName) !== -1;
        };
		
		var $ = function(selector, root){
			var root = root || document;
			var list = root.querySelectorAll(selector);
			if(list.length === 1){ return list[0];}
			else{
				return list;
			}
			
		}

		$.makeArray = function(list){
			return Array.prototype.slice.call(list);
		}

		$.reg = function(Obj, name, method){
			if(!Obj.prototype[name]){
				Obj.prototype[name] = method;
			}
		}
		
		$.extend = function(){
			return false;
		}

		//========= 内置对象 pro by huangxin  ==========//
		//Node
		$.reg(Node, 'contains', function(c){
			return this.compareDocumentPosition(c) - 19 > 0;
		});

		$.reg(Node, 'closestByClass', function(selector){
			var ret = this;
			while(!ret.classList.contains(selector)){
				ret = this.parentNode;	
			}
			return ret;
		});
		
		
		$.reg(Node, 'addClass', function(className){
			this.classList.add(className);
			return this;
		});
		
		$.reg(Node, 'find', function(selector){
			return $(selector, this);
		});

		$.reg(Node, 'removeClass', function(className){
			this.classList.remove(className);
			return this;
		});

		$.reg(Node, 'hasClass', function(className){
			return this.classList.contains(className);
		});
		
		$.reg(Node, 'toggleClass', function(className){
			this.classList.toggle(className);
			return this;
		});

		$.reg(Node, 'css', function(){
			if(arguments.length === 1 && typeof arguments[0] === "string"){
				return this.style[arguments[0]];
			}
			
			if(typeof arguments[0] === "object"){
				var node = this;
				var styles = arguments[0];
				var keys = Object.keys(arguments[0]);
				keys.forEach(function(item, index){
					node.style[keys[index]] = styles[keys[index]];
				});
			}else{
				var key = arguments[0], value = arguments[1];
				this.style[key] = value;
			}
			
			return this;
		});
		
		$.reg(Node, 'forEach', function(callback){
			Array.prototype.forEach.call([this], function(node, index, nodelist){
				callback(node, index, nodelist);
			});
			return this;
		});
		
		$.reg(Node, 'index', function(){
			var elem = this;
			var k = 0;
			while(elem.previousSibling){
				k++;
				elem = elem.previousSibling;
			};
			return k;
		});
		
		//NodeList
		
		$.reg(NodeList, 'forEach', function(callback){
			Array.prototype.forEach.call(this, function(node, index, nodelist){
				callback(node, index, nodelist);
			});
		});

		$.reg(NodeList, 'addClass', function(className){
			this.forEach(function(node){
				node.classList.add(className);
			});
			return this;
		});

		$.reg(NodeList, 'removeClass', function(className){
			this.forEach(function(item, i, array){
				item.classList.remove(className);
			});
			return this;
		});
		
		$.reg(String, 'contains', function(substr){
			if(this.indexOf(substr) === -1){
				return false;
			}else{
				return true;
			}
		});


		Object.equals = function( x, y ) {
	        // If both x and y are null or undefined and exactly the same
	        if ( x === y ) {
	            return true;
	        }
	 
	        // If they are not strictly equal, they both need to be Objects
	        if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) {
	            return false;
	        }
	 
	        // They must have the exact same prototype chain, the closest we can do is
	        // test the constructor.
	        if ( x.constructor !== y.constructor ) {
	            return false;
	        }
	 
	        for ( var p in x ) {
	            // Inherited properties were tested using x.constructor === y.constructor
	            if ( x.hasOwnProperty( p ) ) {
	                // Allows comparing x[ p ] and y[ p ] when set to undefined
	                if ( ! y.hasOwnProperty( p ) ) {
	                    return false;
	                }
	 
	                // If they have the same strict value or identity then they are equal
	                if ( x[ p ] === y[ p ] ) {
	                    continue;
	                }
	 
	                // Numbers, Strings, Functions, Booleans must be strictly equal
	                if ( typeof( x[ p ] ) !== "object" ) {
	                    return false;
	                }
	 
	                // Objects and Arrays must be tested recursively
	                if ( ! Object.equals( x[ p ],  y[ p ] ) ) {
	                    return false;
	                }
	            }
	        }
	 
	        for ( p in y ) {
	            // allows x[ p ] to be set to undefined
	            if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) ) {
	                return false;
	            }
	        }
	        return true;
	    };

		
		//localSotrage Opertaions
		$.getLocalData = function(key){
			return JSON.parse(localStorage.getItem(key));
		};

		$.setLocalData = function(key, value){
			var v = JSON.stringify(value);
			localStorage.setItem(key, v);
		}

		exports.$ = $;
		
    });
})();