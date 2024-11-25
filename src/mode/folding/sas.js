"use strict";

var oop = require("../../lib/oop");
var BaseFoldMode = require("./cstyle").FoldMode;
var Range = require("../../range").Range;
var TokenIterator = require("../../token_iterator").TokenIterator;


var FoldMode = exports.FoldMode = function () { };

oop.inherits(FoldMode, BaseFoldMode);

(function () {
    this.getFoldWidgetRangeBase = this.getFoldWidgetRange;
    this.getFoldWidgetBase = this.getFoldWidget;

    this.indentKeywordsSAS = {
        "proc": 1,
        "data": 1,
        "run": -1,
        "quit": -1,
        "do": 1,
        "select": 1,
        "end": -1,
        // macro blocks
        "%macro": 1,
        "%mend": -1,
        "%do": 1,
        "%end": -1,
    };
    this.tokenTypeSAS = [
        "storage.type.class.sas",
        "keyword.control.conditional.sas",
        "keyword.control.general.sas",
        "support.class.character-class.sas",
    ];

    // All starting statements (except 'do' and '%do') must be at the beginning
    //  of the line or follow a semicolon (that terminates the previous statement)
    //  'do' and '%do' can also follow 'then' ('%then') or 'else' ('%else') statements
    this.foldingStartMarkerSAS = /(^\s*|;\s*)(proc|data|do|select|%macro|%do)\b|(then\s*|else\s*)(do|%do)\b/i;

    // All ending statements must be at the beginning of the line or follow a semicolon
    //  and be followed by a semicolon
    //  'quit' can be followed by 'cancel' option and '%mend' can be followed by a macro name
    this.foldingStopMarkerSAS = /(;\s*|^\s*)(run|quit\s*\w*|end|%mend\s*\w*|%end)\s*(?=;|$)/i;

    this.testMarkerSAS = (line) => ({
        isStart: this.foldingStartMarkerSAS.test(line),
        isEnd: this.foldingStopMarkerSAS.test(line)
    })

    this.getStartMarkerSAS = function (line) {
        var match = this.foldingStartMarkerSAS.exec(line);
        if (!match) return {};
        return {
            keyword: (match[2] || match[4] || '').toLowerCase(),
            index: match.index + 1 + (match[1] || match[3] || '').length,
        };
    }

    this.getStopMarkerSAS = function (line) {
        var match = this.foldingStopMarkerSAS.exec(line);
        if (!match) return {};
        return {
            keyword: (match[2] || match[4] || '').toLowerCase().split(/\s+/)[0],
            index: match.index + 1 + (match[1] || match[3] || '').length,
        };
    }

    this.getFoldWidgetRange = function (session, foldStyle, row) {
        var line = session.getLine(row);
        var marker = this.testMarkerSAS(line);
        if (marker.isStart || marker.isEnd) {
            var match = (marker.isEnd) ? this.getStopMarkerSAS(line) : this.getStartMarkerSAS(line);
            if (match.keyword) {
                var type = session.getTokenAt(row, match.index).type;
                if (this.tokenTypeSAS.includes(type))
                    return this.sasBlock(session, row, match.index);
            }
        }
        return this.getFoldWidgetRangeBase(session, foldStyle, row);
    };


    this.getFoldWidget = function (session, foldStyle, row) {
        var line = session.getLine(row);
        var marker = this.testMarkerSAS(line);
        if (marker.isStart && !marker.isEnd) {
            var match = this.getStartMarkerSAS(line);
            if (match.keyword) {
                var type = session.getTokenAt(row, match.index).type;
                if (this.tokenTypeSAS.includes(type))
                    return "start";
            }
        }
        if (foldStyle != "markbeginend" || !marker.isEnd || marker.isStart && marker.isEnd)
            return this.getFoldWidgetBase(session, foldStyle, row);

        var match = this.getStopMarkerSAS(line);
        if (this.indentKeywordsSAS[match.keyword]) {
            var token = session.getTokenAt(row, match.index)
            var type = token.type;
            if (this.tokenTypeSAS.includes(type))
                return "end";
        }

        return this.getFoldWidgetBase(session, foldStyle, row);
    };

    this.sasBlock = function (session, row, column, tokenRange) {
        var stream = new TokenIterator(session, row, column);

        var token = stream.getCurrentToken();
        if (!token || !this.tokenTypeSAS.includes(token.type))
            return;

        var val = token.value.toLowerCase();
        var stack = [val];
        var dir = this.indentKeywordsSAS[val];

        if (!dir)
            return;

        var startColumn = dir === -1 ? stream.getCurrentTokenColumn() : session.getLine(row).length;
        var startRow = row;

        stream.step = dir === -1 ? stream.stepBackward : stream.stepForward;
        while (token = stream.step()) {
            val = token.value.toLowerCase();
            if (!this.tokenTypeSAS.includes(token.type) || !this.indentKeywordsSAS[val])
                continue;
            var level = dir * this.indentKeywordsSAS[val];

            if (level > 0) {
                stack.unshift(val);
            } else if (level <= 0) {
                stack.shift();
            }
            if (stack.length === 0) {
                break;
            }
        }

        if (!token)
            return null;

        if (tokenRange)
            return stream.getCurrentTokenRange();

        var row = stream.getCurrentTokenRow();
        if (dir === -1)
            return new Range(row, session.getLine(row).length, startRow, startColumn);
        else
            return new Range(startRow, startColumn, row, stream.getCurrentTokenColumn());
    };

}).call(FoldMode.prototype);
