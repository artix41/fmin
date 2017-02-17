import {dot, norm2, scale, zeros, weightedSum} from "./blas1";
import {wolfeLineSearch} from "./linesearch";

export function newton(f, initial, params) {
    params = params || {};
    var maxIterations = params.maxIterations || initial.length * 100,
        learnRate = params.learnRate || 0.001,
        current = {x: initial.slice(), fx: 0, fxprime: initial.slice(), hessianx: initial.slice()};

    for (var i = 0; i < maxIterations; ++i) {
        current.fx = f(current.x, current.fxprime, current.hessianx);
        if (params.history) {
            params.history.push({x: current.x.slice(),
                                 fx: current.fx,
                                 fxprime: current.fxprime.slice(),
                                 hessianx: current.hessianx.slice()});
        }
        var d = numeric.dot(numeric.inv(current.hessianx), current.fxprime);

        weightedSum(current.x, 1, current.x, -learnRate, d);
        if (norm2(current.fxprime) <= 1e-5) {
            break;
        }
    }

    return current;
}

export function newtonLineSearch(f, initial, params) {
    params = params || {};
    var current = {x: initial.slice(), fx: 0, fxprime: initial.slice(), hessianx: initial.slice()},
        next = {x: initial.slice(), fx: 0, fxprime: initial.slice(), hessianx: initial.slice()},
        maxIterations = params.maxIterations || initial.length * 100,
        learnRate = params.learnRate || 1,
        pk = initial.slice(),
        c1 = params.c1 || 1e-3,
        c2 = params.c2 || 0.1,
        temp,
        functionCalls = [];

    if (params.history) {
        // wrap the function call to track linesearch samples
        var inner = f;
        f = function(x, fxprime, hessianx) {
            functionCalls.push(x.slice());
            return inner(x, fxprime, hessianx);
        };
    }

    current.fx = f(current.x, current.fxprime, current.hessianx);
    for (var i = 0; i < maxIterations; ++i) {
        var d = numeric.dot(numeric.inv(current.hessianx), current.fxprime);
        scale(pk, d, -1);
        learnRate = wolfeLineSearch(f, pk, current, next, learnRate, c1, c2);
        //console.log("learning rate : ", learnRate)
        //console.log("gradient : ", current.fxprime)
        if (params.history) {
            params.history.push({x: current.x.slice(),
                                 fx: current.fx,
                                 fxprime: current.fxprime.slice(),
                                 hessianx: current.hessianx.slice(),
                                 functionCalls: functionCalls,
                                 learnRate: learnRate,
                                 alpha: learnRate});
            functionCalls = [];
        }

        temp = current;
        current = next;
        next = temp;

        if ((learnRate === 0) || (norm2(current.fxprime) < 1e-5)) break;
    }

    return current;
}
