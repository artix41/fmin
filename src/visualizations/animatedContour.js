import {createDropShadowFilter} from "./dropshadow";
import {flower, himmelblau, banana, matyas, booth, trid} from "./functions";
import {ContourPlot} from "../../node_modules/contour_plot/index.js";

export function AnimatedContour(div) {
    this.current = this.current || flower;
    this.initial = this.current.initial.slice() || [1, 1];
    this.plot = null;
    this.div = div;
    this.colour = this.colour || d3.schemeCategory10[0];
    this.states =[];
    this.stateIndex = 0;
    this.cycle = 0;

    var contour = this;
    var list_functions = [{class:".function_flower", name:flower},
                          {class:".function_himmelblau", name:himmelblau},
                          {class:".function_banana", name:banana},
                          {class:".function_matyas", name:matyas},
                          {class:".function_booth", name:booth},
                          {class:".function_trid", name:trid}
                         ];

    function clickOnFunction(func) {
        div.select(func.class).on("click", function() {
            contour.current = func.name;
            contour.redraw();
            contour.initialize(contour.current.initial.slice());
            div.select(".function_label").html(d3.select(this).html());
        });
    }
    for (var i in list_functions) {
        clickOnFunction(list_functions[i])
    }

    this.redraw();
    this.initialize(this.initial);
    this.drawControls();
}

AnimatedContour.prototype.redraw = function() {
    var colourDomain = this.current.colourDomain || [1, 13],
        colourScale = d3.scaleLinear().domain(colourDomain).range(["white", this.colour]);

    var plot = ContourPlot()
        .f((x,y) => this.current.f([x, y]))
        .xDomain(this.current.xDomain)
        .yDomain(this.current.yDomain)
        .minima(this.current.minima)
        .colourScale(colourScale);

    // remove old graph if there
    this.div.select("svg").data([]).exit().remove();
    this.plot = plot(this.div.select("#vis"));
    createDropShadowFilter(this.plot.svg);
    var svg = this.plot.svg, xScale = this.plot.xScale, yScale = this.plot.yScale, contour = this;
    svg.on("click" , function() {
        var pos = d3.mouse(this);
        contour.initialize([ xScale.invert(pos[0]),  yScale.invert(pos[1])]);
    });
};

AnimatedContour.prototype.increment = function(currentCycle, duration) {
    // hack: prevent incrementing if we've reset
    if (currentCycle != this.cycle) {
        return true;
    }

    this.displayState();
    this.div.select(".iterations").text("Iteration " + (this.stateIndex) + "/" +
                    (this.states.length - 1) + ", Loss=" + this.states[this.stateIndex].fx.toFixed(5));

    duration = duration || this.duration;

    this.stateIndex += 1;
    if (this.stateIndex >= this.states.length) {
        this.stateIndex = 0;
        duration = 5000;
    }

    this.plot.svg.transition()
        .duration(duration)
        .on("end", () => this.increment(currentCycle));
};

AnimatedContour.prototype.stop = function() {
    this.cycle += 1;
};

AnimatedContour.prototype.start = function() {
    this.initialize(this.initial);
};
