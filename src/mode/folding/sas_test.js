if (typeof process !== "undefined") require("amd-loader");

"use strict";

var SASMode = require("../sas").Mode;
var EditSession = require("../../edit_session").EditSession;
const { test } = require("asyncjs");
var assert = require("../../test/assertions");


module.exports = {
    setUp: function () {
        this.mode = new SASMode();
    },

    "test: SAS folding": function () {
        var session = new EditSession(`
%macro theTimer;
    %macro quitIfUnknown;
        %if ( &objectID = 0 ) %then %do;
            %put sendmail Batch Error in data in BatchDat.Object. sas should stop;
            %sendmail(Subject='Batch &BatchName ERROR in startup &dd_dt',
                bodyfile=No,
                Body='Batch &BatchName. not found in batchdat.object (&BatchEnv.!)',
            );
        %end;
    %mend quitIfUnknown;
	data _null_;
		do until(n>=5);
			put n=;
			n+1;
		end;
		select (a);
			when (1) x=x*10;
			otherwise put;
		end;
		if answer=9 then
			do;
				answer=.;
				put 'INVALID ANSWER FOR ' id=;
			end;
	run;
%mend theTimer;
`.trim().split("\n")
        );

        session.setFoldStyle("markbeginend");
        session.setMode(this.mode);
        session.bgTokenizer.$worker();
        session.bgTokenizer.$worker(); // make sure the tokenizer is ready

        testGetFoldWidget(session, 0, "start");
        testGetFoldWidget(session, 1, "start");
        testGetFoldWidget(session, 2, "start");
        testGetFoldWidget(session, 3, "");
        testGetFoldWidget(session, 4, "start");
        testGetFoldWidget(session, 10, "start");
        testGetFoldWidget(session, 11, "start");
        testGetFoldWidget(session, 15, "start");
        testGetFoldWidget(session, 20, "start");
        testGetFoldWidget(session, 5, "");
        testGetFoldWidget(session, 6, "");
        testGetFoldWidget(session, 8, "end");
        testGetFoldWidget(session, 9, "end");
        testGetFoldWidget(session, 23, "end");
        testGetFoldWidget(session, 24, "end");
        testGetFoldWidget(session, 25, "end");

        testGetFoldWidgetRange(session, 0, [0, 16, 25, 0]);
        testGetFoldWidgetRange(session, 25, [0, 16, 25, 0]);
        testGetFoldWidgetRange(session, 1, [1, 25, 9, 4]);
        testGetFoldWidgetRange(session, 9, [1, 25, 9, 4]);
        testGetFoldWidgetRange(session, 2, [2, 40, 8, 8]);
        testGetFoldWidgetRange(session, 8, [2, 40, 8, 8]);
        testGetFoldWidgetRange(session, 10, [10, 13, 24, 1]);
        testGetFoldWidgetRange(session, 24, [10, 13, 24, 1]);
        testGetFoldWidgetRange(session, 11, [11, 17, 14, 2]);
        testGetFoldWidgetRange(session, 14, [11, 17, 14, 2]);
        testGetFoldWidgetRange(session, 15, [15, 13, 18, 2]);
        testGetFoldWidgetRange(session, 18, [15, 13, 18, 2]);

    }
};


if (typeof module !== "undefined" && module === require.main)
    require("asyncjs").test.testcase(module.exports).exec();

function testGetFoldWidget(session, row, expected) {
    console.log("Fold " + row + ": " + session.getLine(row));
    assert.equal(session.getFoldWidget(row), expected);
}

function testGetFoldWidgetRange(session, row, expected) {
    console.log("Fold range " + row + ": " + session.getLine(row));
    assert.range(session.getFoldWidgetRange(row), ...expected);
}