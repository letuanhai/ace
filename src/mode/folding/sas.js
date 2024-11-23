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

    this.foldingStartMarkerSAS = /(?:\s|^)(proc|data|do|select|%macro|%do)\b/i;
    this.foldingStopMarkerSAS = /(?:\b)(run|quit|end|%mend|%end)\b/i;

    this.testMarkerSAS = function (line) {
        return {
            isStart: this.foldingStartMarkerSAS.test(line),
            isEnd: this.foldingStopMarkerSAS.test(line)
        }
    }

    this.getStartMarkerSAS = function (line) {
        var match = this.foldingStartMarkerSAS.exec(line);
        if (!match)
            return {};
        return {
            keyword: match[1].toLowerCase(),
            index: match.index + 2,
        };
    }

    this.getStopMarkerSAS = function (line) {
        var match = this.foldingStopMarkerSAS.exec(line);
        if (!match)
            return {};
        return {
            keyword: match[1].toLowerCase(),
            index: match.index + 2,
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
            if (this.tokenTypeSAS.includes(session.getTokenAt(row, match.index).type))
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
