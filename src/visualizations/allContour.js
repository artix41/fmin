import {Slider} from "./slider";
import {AnimatedContour} from "./animatedContour";
import {flower, himmelblau, banana, matyas, booth, trid, mccormick, plane} from "./functions";

export function AllContour(div) {
    this.div = div;

    this.colour = this.colour || d3.schemeCategory20[8]; // colour of the plot
    this.duration = this.duration || 500;

    this.listAlgorithms = [{name: "Newton's method",
                            normal:fmin.newton,
                            linesearch:fmin.newtonLineSearch,
                            stepSize: 0.1},

                           {name: "Gradient Descent",
                            normal:fmin.gradientDescent,
                            linesearch:fmin.gradientDescentLineSearch,
                            stepSize: 0.01},

                           {name: "Conjugate Gradient",
                            normal:fmin.conjugateGradient,
                            linesearch:fmin.conjugateGradientLineSearch,
                            stepSize: 0.05}
                          ];

    this.listFunctions = [  flower,
                            himmelblau,
                            banana,
                            matyas,
                            trid,
                            mccormick,
                            booth,
                            plane
                        ];

    this.enableLineSearch = new Array(this.listAlgorithms.length).fill(false);

    this.divListAlgorithms = d3.select("#list-algorithms")
    .selectAll("div").data(this.listAlgorithms).enter();

    this.divListFunctions = d3.select("#list-functions")
    .selectAll("li").data(this.listFunctions).enter();

    this.marginCurve = 25;

    this.svgCurve = d3.select("#curve").append("svg")
    .attr("width", "100%").attr("height", 400);

    this.widthCurve = document.getElementById("curve").offsetWidth - this.marginCurve;
    this.heightCurve = document.getElementById("curve").offsetHeight - this.marginCurve;

    AnimatedContour.call(this, div);

}

AllContour.prototype = Object.create(AnimatedContour.prototype);

AllContour.prototype.drawControls = function() {

    function RGBtoRGBA(rgb, alpha) {
        var rgba = "rgba(" + parseInt(rgb.slice(1,3), 16) + "," +
        parseInt(rgb.slice(3,5), 16) + "," +
        parseInt(rgb.slice(5,7), 16) + "," +
        alpha + ")";
        return rgba;
    }

    var obj = this;

    // Draw function selection

    var linkFunction = this.divListFunctions.append("li").append("a")
    .attr("class", function(d,i) { return "function" + i; });

    linkFunction.html(function(d,i) { return "\\(" + d.latex.replace('\\', '\\\\') + "\\)"; });

    linkFunction.on("click", function(func) {
        obj.current = func;
        obj.redraw();
        obj.initialize(obj.current.initial.slice());
        obj.div.select(".function_label").html(d3.select(this).html());
    });

    this.div.select(".function_label").html("\\(" + this.current.latex.replace('\\', '\\\\') + "\\)");

    // Draw list of algorithms and learning rates

    var rowAlgorithm = this.divListAlgorithms.append("div")
    .attr("class", "row")
    .attr("style", function(d, i) {return "background-color:" + RGBtoRGBA(d3.schemeCategory10[i], 0.6); });

    rowAlgorithm.append("label").text(function(d) { return " " + d.name; });
    rowAlgorithm.append("span").attr("class", "caret");

    var formLearningRate = rowAlgorithm.filter(function(d, i) { return d.hasOwnProperty("stepSize"); })
    .append("div").attr("class", "row")
    .append("form").attr("class", "form-inline").attr("role", "form");

    var learningRateGroup = formLearningRate.append("div")
    .attr("class", "form-group col-xs-10 col-md-10 col-md-offset-1");

    learningRateGroup.append("div") // learning rate value
    .attr("style", "text-align:center")
    .append("div").attr("style", "display:inline-block;")
    .append("label").attr("class", "r-only").attr("for", "learningrate")
    .html("Learning Rate \\(\\alpha\\)")
    .append("span").attr("id", function (d, i) { return "learningratevalue" + i; })
    .html("= 0.01");

    learningRateGroup.append("div") // learning rate slider
    .attr("id", function(d, i) { return "learningrate" + i; });

    var labelLineSearch = rowAlgorithm.filter(function(d, i) { return d.hasOwnProperty("linesearch"); })
    .append("div").attr("style", "text-align:center")
    .append("div").attr("style", "display:inline-block;")
    .append("div").attr("class", "checkbox")
    .append("label");

    labelLineSearch.append("input").attr("type", "checkbox")
    .attr("id", function(d, i) { return "linesearchcheck" + i; });

    labelLineSearch.append("span").text(" Use Line Search");

    rowAlgorithm.append("div").attr("style", "text-align:center")
    .append("div").attr("style", "display:inline-block")
    .append("div").attr("class", "row")
    .append("span").attr("class", function(d, i) { return "iterations" + i; });

    this.learnRates = [];

    function callbackStepSize(x, i) { return obj.setStepSize(x, i); }

    this.listAlgorithms.forEach(function(algo, iAlgo) {
        obj.learnRates.push(Slider(obj.div.select("#learningrate" + iAlgo), [0.0001, 10],
                                function(x) { return obj.setStepSize(x, iAlgo); },
                                {'format': function(d) { return d.toString(); },
                                  'initial': obj.listAlgorithms[iAlgo].stepSize,
                                  'scale': d3.scaleLog(),
                                  'ticks': 4}));

        obj.div.select("#linesearchcheck" + iAlgo).on("change", function() {
            obj.enableLineSearch[iAlgo] = document.getElementById("linesearchcheck" + iAlgo).checked;
            obj.initialize(obj.initial);
        });
    });


};

AllContour.prototype.setStepSize = function(x, iAlgo) {
    this.listAlgorithms[iAlgo].stepSize = x;
    this.initialize(this.initial);
    this.divListAlgorithms.select("#learningratevalue" + iAlgo).text(" = " + x.toFixed(4));
};

AllContour.prototype.calculateStates = function(initial) {
    this.states = [];
    this.stateIndex = new Array(this.listAlgorithms.length).fill(0);

    var obj = this;
    var f = function(x, fxprime, hessianx) {
        obj.current.fprime(x, fxprime);
        obj.current.hessian(x, hessianx);
        return obj.current.f(x);
    };

    for (var iAlgo in this.listAlgorithms) {
        this.states.push([]);
        var params = {"history": this.states[iAlgo],
                      "maxIterations" : 5000,
                      "learnRate" : this.listAlgorithms[iAlgo].stepSize};

        if (this.enableLineSearch[iAlgo]) {
            this.listAlgorithms[iAlgo].linesearch(f, initial, params);
        } else {
            this.listAlgorithms[iAlgo].normal(f, initial, params);
        }
    }
};

AllContour.prototype.initialize = function(initial) {
    this.stop();
    this.initial = initial.slice();
    this.calculateStates(initial);

    // =========== Init contour plot ============

    var svg = this.plot.svg, xScale = this.plot.xScale, yScale = this.plot.yScale;
    svg.selectAll(".current").data([]).exit().remove();

    var data = this.states.map(function(row) { return row[0]; });
    var group = svg.selectAll(".current").data(data)
        .enter()
        .append("g")
        .attr("class", "current");

    group.append("g")
        .attr("class", "under");

    group.append("g")
        .attr("class", "gradient");

    group.each(function (_, i) {
        d3.select(this)
        .append("circle")
        .attr("class", "ball" + i)
        .style("fill", d3.schemeCategory10[i])
        .style("fill-opacity", 0.6)
        .attr("filter", "url(#dropshadow)")
        .attr("r", 5)
        .attr("cx", function(d) { return xScale(d.x[0]); })
        .attr("cy", function(d) { return yScale(d.x[1]); });
    });

    // Init curve

    this.svgCurve.selectAll("g").data([]).exit().remove(); // erase previous curve

    var F = [];
    this.states.forEach(function(stateAlgo, iAlgo) {
        F.push(stateAlgo.map(function(elem) {
            if (!elem.fx || elem.fx == Infinity || elem.fx == -Infinity) {
                return 0;
            }
            else {
                return elem.fx;
            }
        }));
    });

    var initF = F[0][0];
    var minF = Infinity;
    F.forEach(function(f,i) {
        minF = Math.min(minF, Math.min(...f));
    });

    var xAxisScale = d3.scaleLinear()
    .domain([0,100])
    .range([this.marginCurve,this.widthCurve]);

    var yAxisScale = d3.scaleLinear()
    .domain([minF,initF])
    .range([this.heightCurve, this.marginCurve]);

    var xAxis = d3.axisBottom(xAxisScale).ticks(10);
    var yAxis = d3.axisLeft(yAxisScale).ticks(10);

    this.svgCurve.append("g")
    .attr("transform", "translate(0," + (this.heightCurve)  + ")")
    .call(d3.axisBottom(xAxisScale));

    this.svgCurve.append("g")
    .attr("transform", "translate(" + this.marginCurve + ",0)")
    .call(d3.axisLeft(yAxisScale));

    var valueLine = d3.line()
    .curve(d3.curveLinear)
	.x(function(d, i) { return xAxisScale(i); })
	.y(function(d, i) { return yAxisScale(d); });

    //this.curve = this.svgCurve.data(F[0]).enter();

    var obj = this;

    this.listAlgorithms.forEach(function(d,i) {
        obj.svgCurve.append("g").append("path").datum(F[i])
        .attr("d", valueLine)
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("stroke", d3.schemeCategory10[i]);
    });

    this.increment(this.cycle, this.duration);
};

AllContour.prototype.displayState = function(){
    var obj = this;

    // Display state on contour plot

    // state is an array with the state for each algo
    var state = this.states.map(function(row, i) { return row[obj.stateIndex[i]]; });
    var group = obj.plot.svg.selectAll(".current")
    .data(state);

    group.each(function (d, i) {
        d3.select(".ball" + i)
        .transition()
        .duration(obj.stateIndex[i] ? obj.duration :0)
        .attr("cx", obj.plot.xScale(state[i].x[0]))
        .attr("cy", obj.plot.yScale(state[i].x[1]));
    });

    // d is an array with the previous state for all algorithms
    var d = this.states.map(function(row, i) {
        if(obj.stateIndex[i] > 0) {
            return row[obj.stateIndex[i]-1];
        }
        else {
            return row[obj.stateIndex[i]];
        }
    });
    this.listAlgorithms.forEach(function(algo, iAlgo) {
        if (obj.enableLineSearch[iAlgo]) {
            obj.learnRates[iAlgo].move(d[iAlgo].learnRate, obj.duration);
            obj.div.select("#learningratevalue" + iAlgo).text(" = " + d[iAlgo].learnRate.toFixed(4));
        }
    });

    var line = obj.plot.svg.selectAll(".current .gradient").append("line")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 3)
        .each(function (_, i) {
            d3.select(this)
            .attr("stroke", d3.schemeCategory10[i])
            .attr("x1", obj.plot.xScale(d[i].x[0]))
            .attr("y1", obj.plot.yScale(d[i].x[1]))
            .attr("x2", obj.plot.xScale(d[i].x[0]))
            .attr("y2", obj.plot.yScale(d[i].x[1]));
        });

    line.each(function (_, i) {
        d3.select(this)
        .transition().duration(obj.duration)
        .attr("x2", obj.plot.xScale(state[i].x[0]))
        .attr("y2", obj.plot.yScale(state[i].x[1]));
    });
};

AllContour.prototype.increment = function(currentCycle, duration) {
    // hack: prevent incrementing if we've reset

    if (currentCycle != this.cycle) {
        return true;
    }

    this.displayState();

    function normV(x) {
        return Math.sqrt(Math.pow(x[0],2) + Math.pow(x[1],2));
    }

    function normM(A) {
        var res = 0;
        for (var i in A) {
            for (var j in A[i]) {
                res += Math.pow(A[i][j],2);
            }
        }
        return Math.sqrt(res);
    }

    function getHessian(H) {
        if (!H) {
            return "";
        }
        else {
            return ", Hessian=[" + numeric.eig(H).lambda.x.map(function(x) { return x.toFixed(2); }) + "]";
        }
    }

    var obj = this;
    this.listAlgorithms.forEach(function(algo, iAlgo) {
        obj.div.select(".iterations" + iAlgo).text("Iteration " + (obj.stateIndex[iAlgo]) + "/" +
                        (obj.states[iAlgo].length - 1) + ", Loss=" + obj.states[iAlgo][obj.stateIndex[iAlgo]].fx.toFixed(5) +
                        ", Gradient=" + normV(obj.states[iAlgo][obj.stateIndex[iAlgo]].fxprime).toFixed(5) +
                        getHessian(obj.states[iAlgo][obj.stateIndex[iAlgo]].hessianx));
    });

    duration = duration || this.duration;

    var nbrAlgosFinished = 0;
    for (var iAlgo in this.listAlgorithms) {
        if (this.stateIndex[iAlgo] < this.states[iAlgo].length - 1) {
            this.stateIndex[iAlgo] += 1;
        }
        else {
            nbrAlgosFinished += 1;
        }
    }
    if (nbrAlgosFinished == this.listAlgorithms.length) {
        duration = 5000;
    }

    this.plot.svg.transition()
        .duration(duration)
        .on("end", () => this.increment(currentCycle));
};
