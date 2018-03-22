(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
var bibtexParse = require('bibtex-parser-js');
function DOILoad() {
    doi = document.todo_post.confirm_doi.value;
    fetch('http://dx.doi.org/'+doi, 
        {
            headers: {
                'Accept': 'application/x-bibtex'
            }
        })
        .then(response => response.text())
        .then(text => {
            bib_data = bibtexParse.toJSON(text); 
            document.todo_post.confirm_authors.value =
               bib_data[0].entryTags.AUTHOR; 
            document.todo_post.confirm_title.value =
               bib_data[0].entryTags.TITLE; 
            document.todo_post.confirm_year.value =
               bib_data[0].entryTags.YEAR; 
            document.todo_post.confirm_url.value =
               bib_data[0].entryTags.URL; 
        });
}
window.DOILoad = DOILoad; 



},{"bibtex-parser-js":2}],2:[function(require,module,exports){
/* start bibtexParse 0.0.2 */

// Original work by Henrik Muehe (c) 2010
//
// CommonJS port by Mikola Lysenko 2013
//
// Port to Browser lib by ORCID / RCPETERS
//
// Issues:
//  no comment handling within strings
//  no string concatenation
//  no variable values yet
// Grammar implemented here:
//  bibtex -> (string | preamble | comment | entry)*;
//  string -> '@STRING' '{' key_equals_value '}';
//  preamble -> '@PREAMBLE' '{' value '}';
//  comment -> '@COMMENT' '{' value '}';
//  entry -> '@' key '{' key ',' key_value_list '}';
//  key_value_list -> key_equals_value (',' key_equals_value)*;
//  key_equals_value -> key '=' value;
//  value -> value_quotes | value_braces | key;
//  value_quotes -> '"' .*? '"'; // not quite
//  value_braces -> '{' .*? '"'; // not quite
(function (exports) {

    function BibtexParser() {
        this.pos = 0;
        this.input = "";

        this.entries = new Array();
        this.strings = {
            JAN: "January",
            FEB: "February",
            MAR: "March",
            APR: "April",
            MAY: "May",
            JUN: "June",
            JUL: "July",
            AUG: "August",
            SEP: "September",
            OCT: "October",
            NOV: "November",
            DEC: "December"
        };
        
        this.currentEntry = "";


        this.setInput = function (t) {
            this.input = t;
        }

        this.getEntries = function () {
            return this.entries;
        }

        this.isWhitespace = function (s) {
            return (s == ' ' || s == '\r' || s == '\t' || s == '\n');
        }

        this.match = function (s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                this.pos += s.length;
            } else {
                throw "Token mismatch, expected " + s + ", found " + this.input.substring(this.pos);
            }
            this.skipWhitespace();
        }

        this.tryMatch = function (s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                return true;
            } else {
                return false;
            }
            this.skipWhitespace();
        }
        
        /* when search for a match  all text can be ignored, not just white space */
		this.matchAt = function () {
            while (this.input.length > this.pos && this.input[this.pos] != '@') {
                this.pos++;
            }

            if (this.input[this.pos] == '@') {
                return true;
            } 
            return false;
        }


        this.skipWhitespace = function () {
            while (this.isWhitespace(this.input[this.pos])) {
                this.pos++;
            }
            if (this.input[this.pos] == "%") {
                while (this.input[this.pos] != "\n") {
                    this.pos++;
                }
                this.skipWhitespace();
            }
        }

        this.value_braces = function () {
            var bracecount = 0;
            this.match("{");
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '}' && this.input[this.pos - 1] != '\\') {
                    if (bracecount > 0) {
                        bracecount--;
                    } else {
                        var end = this.pos;
                        this.match("}");
                        return this.input.substring(start, end);
                    }
                } else if (this.input[this.pos] == '{') {
                    bracecount++;
                } else if (this.pos == this.input.length - 1) {
                    throw "Unterminated value";
                }
                this.pos++;
            }
        }

        this.value_quotes = function () {
            this.match('"');
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '"' && this.input[this.pos - 1] != '\\') {
                    var end = this.pos;
                    this.match('"');
                    return this.input.substring(start, end);
                } else if (this.pos == this.input.length - 1) {
                    throw "Unterminated value:" + this.input.substring(start);
                }
                this.pos++;
            }
        }

        this.single_value = function () {
            var start = this.pos;
            if (this.tryMatch("{")) {
                return this.value_braces();
            } else if (this.tryMatch('"')) {
                return this.value_quotes();
            } else {
                var k = this.key();
                if (this.strings[k.toUpperCase()]) {
                    return this.strings[k];
                } else if (k.match("^[0-9]+$")) {
                    return k;
                } else {
                    throw "Value expected:" + this.input.substring(start);
                }
            }
        }

        this.value = function () {
            var values = [];
            values.push(this.single_value());
            while (this.tryMatch("#")) {
                this.match("#");
                values.push(this.single_value());
            }
            return values.join("");
        }

        this.key = function () {
            var start = this.pos;
            while (true) {
                if (this.pos == this.input.length) {
                    throw "Runaway key";
                }

                if (this.input[this.pos].match("[a-zA-Z0-9_:\\./-]")) {
                    this.pos++
                } else {
                    return this.input.substring(start, this.pos).toUpperCase();
                }
            }
        }

        this.key_equals_value = function () {
            var key = this.key();
            if (this.tryMatch("=")) {
                this.match("=");
                var val = this.value();
                return [key, val];
            } else {
                throw "... = value expected, equals sign missing:" + this.input.substring(this.pos);
            }
        }

        this.key_value_list = function () {
            var kv = this.key_equals_value();
            this.currentEntry['entryTags'] = {};
            this.currentEntry['entryTags'][kv[0]] = kv[1];
            while (this.tryMatch(",")) {
                this.match(",");
                // fixes problems with commas at the end of a list
                if (this.tryMatch("}")) {
                    break;
                }
                kv = this.key_equals_value();
                this.currentEntry['entryTags'][kv[0]] = kv[1];
            }
        }

        this.entry_body = function (d) {
            this.currentEntry = {}; 
            this.currentEntry['citationKey'] = this.key();
            this.currentEntry['entryType'] = d.substring(1);
            this.match(",");
            this.key_value_list();
            this.entries.push(this.currentEntry);
        }

        this.directive = function () {
            this.match("@");
            return "@" + this.key();
        }

        this.string = function () {
            var kv = this.key_equals_value();
            this.strings[kv[0].toUpperCase()] = kv[1];
        }

        this.preamble = function () {
            this.value();
        }

        this.comment = function () {
        	//this.matchAt();
            this.single_value();
        }

        this.entry = function (d) {
            this.entry_body(d);
        }

        this.bibtex = function () {
            while (this.matchAt()) {
                var d = this.directive().toUpperCase();
                this.match("{");
                if (d == "@STRING") {
                    this.string();
                } else if (d == "@PREAMBLE") {
                    this.preamble();
                } else if (d == "@COMMENT") {
                	this.comment();
                } else {
                    this.entry(d);
                }
                this.match("}");
            }
        }
    }

    exports.toJSON = function (input) {
        var b = new BibtexParser();
        b.setInput(input);
        b.bibtex();
        return b.entries
    };


})(typeof exports === 'undefined' ? this['bibtexParse'] = {} : exports);

/* end bibtexParse */

},{}]},{},[1]);
