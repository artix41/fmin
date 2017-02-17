import {Slider} from "./slider";
import {AnimatedContour} from "./animatedContour";
import {newtonLineSearch} from "../newton";

export function NewtonContour(div) {
    this.stepSize = 1; // Initial learning rate
    this.colour = this.colour || d3.schemeCategory20[8]; // colour of the plot
    this.colourStroke = this.colourStroke || "red"
    this.colourBall = this.colourBall || "red"
    this.duration = this.duration || 500;
    this.enableLineSearch = false; // Initial state

    AnimatedContour.call(this, div);

    var obj = this;
    div.select("#linesearchcheck").on("change", function() {
        obj.enableLineSearch =document.getElementById("linesearchcheck").checked;
        obj.initialize(obj.initial);
    });
}

NewtonContour.prototype = Object.create(AnimatedContour.prototype);

NewtonContour.prototype.drawControls = function() {
    var obj = this;
    this.learnRate = Slider(this.div.select("#learningrate"), [0.00001, 10],
                            // TODO: why can't I just go 'this.setStepSize' here instead?
                            // feel like I fundamentally am missing something with JS
                            function(x) { return obj.setStepSize(x); },
                            {'format': function(d) { return d.toString(); },
                              'initial': this.stepSize,
                              'scale': d3.scaleLog(),
                              'ticks': 4});
};

NewtonContour.prototype.setStepSize = function(x) {
    this.stepSize = x;
    this.initialize(this.initial);
    this.div.select("#learningratevalue").text(" = " + x.toFixed(4));
};

NewtonContour.prototype.calculateStates = function(initial) {
    this.stateIndex = 0;
    this.states = [];
    var obj = this;
    var f = function(x, fxprime, hessianx) {
        obj.current.fprime(x, fxprime);
        obj.current.hessian(x, hessianx)
        return obj.current.f(x);
    };

    var params = {"history": this.states, 'maxIterations' : 5000, 'learnRate' : this.stepSize};

    if (this.enableLineSearch) {
        fmin.newtonLineSearch(f, initial, params);
    } else {
        fmin.newton(f, initial, params);
    }
};

NewtonContour.prototype.initialize = function(initial) {
    this.stop();
    this.initial = initial.slice();
    this.calculateStates(initial);

    var svg = this.plot.svg, xScale = this.plot.xScale, yScale = this.plot.yScale;
    svg.selectAll(".current").data([]).exit().remove();
    var group = svg.selectAll(".current").data([this.states[0]])
        .enter()
        .append("g")
        .attr("class", "current");

    group.append("g")
        .attr("class", "under");

    group.append("g")
        .attr("class", "gradient");

    group.append("circle")
           .attr("class", "ball")
           .style("fill", this.colourBall)
           .style("fill-opacity", 0.9)
           .attr("filter", "url(#dropshadow)")
           .attr("r", 5)
           .attr("cx", function(d) { return xScale(d.x[0]); })
           .attr("cy", function(d) { return yScale(d.x[1]); });

    this.increment(this.cycle, this.duration);
};

NewtonContour.prototype.displayState = function(){
    var state = this.states[this.stateIndex];
    var group = this.plot.svg.selectAll(".current")
                    .data([state])
        .transition()
        .duration(this.stateIndex ? this.duration :0);

    group.select(".ball")
       .attr("cx", d => this.plot.xScale(d.x[0]))
       .attr("cy", d => this.plot.yScale(d.x[1]));

    if (this.stateIndex) {
        var d = this.states[this.stateIndex-1];

        if (this.enableLineSearch) {
            this.learnRate.move(d.learnRate, this.duration);
            this.div.select("#learningratevalue").text(" = " + d.learnRate.toFixed(4));
        }

        var line = this.plot.svg.selectAll(".current .gradient").append("line")
            .attr("stroke-opacity", 0.9)
            .attr("stroke", this.colourStroke)
            .attr("stroke-width", 3)
            .attr("x1", this.plot.xScale(d.x[0]))
            .attr("y1", this.plot.yScale(d.x[1]))
            .attr("x2", this.plot.xScale(d.x[0]))
            .attr("y2", this.plot.yScale(d.x[1]));

        line.transition().duration(this.duration)
           .attr("x2", this.plot.xScale(state.x[0]))
           .attr("y2", this.plot.yScale(state.x[1]));

    } else {
        this.plot.svg.selectAll(".current line").data([]).exit().remove();
    }
};
