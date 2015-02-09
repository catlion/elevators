{
    init: function(elevators, floors) {
        var waitingFloors = [];
        var findWaitFloor = function(num, direction) {
            return _.find(
                        waitingFloors,
                        function(floor) {
                            return floor.idx === num && floor.direction === direction;
                        });
        };
        _.each(elevators, function(e, i) {
            e.goingUpIndicator(true);
            e.goingDownIndicator(false);
            e.on("idle", function() {
                var shit = e.getPressedFloors();
                if(shit.length > 0) {
                    e.destinationQueue = shit;
                    e.checkDestinationQueue();
                } else {
                    var cur_floor = e.currentFloor();
                    var top_wf = _.min(waitingFloors, function(wf) { return Math.abs(wf.idx - cur_floor); });
                    if(typeof(top_wf) !== "undefined" && isFinite(top_wf.idx)) {
                        e.goingUpIndicator(top_wf.idx >= cur_floor);
                        e.goingDownIndicator(top_wf.idx <= cur_floor);
                        e.goToFloor(top_wf.idx);
                    } else {
                        e.goingUpIndicator(true);
                        e.goingDownIndicator(true);
                        //e.goToFloor(0);
                        e.stop();
                    }
                }
            });

            e.on("floor_button_pressed", function(fnum) {
                e.goToFloor(fnum);
            });

            e.on("stopped_at_floor", function(floorNum) {
                if(!_.isEmpty(e.destinationQueue)) {
                    var next = _.find(e.destinationQueue, function(i) { return i != floorNum; });
                    e.goingUpIndicator(floorNum < next);
                    e.goingDownIndicator(floorNum > next);
                } else if(floorNum === 0) {
                    e.goingUpIndicator(true);
                    e.goingDownIndicator(false);
                } else if(floorNum === floors.length - 1) {
                    e.goingUpIndicator(false);
                    e.goingDownIndicator(true);
                } else {
                    e.goingUpIndicator(true);
                    e.goingDownIndicator(true);
                }

                var direction = e.goingUpIndicator() ? "up" : "down";
                var waiting = findWaitFloor(floorNum, direction);
                if(e.loadFactor() <= 0.6 && typeof(waiting !== "undefined")) {
                    waitingFloors = _.without(waitingFloors, waiting);
                    console.log("Cleared floor " + floorNum);
                    console.log(JSON.stringify(waitingFloors));
                }
            });

            e.on("passing_floor", function(floorNum, direction) {
                var waiting = findWaitFloor(floorNum, direction);
                if(_.contains(e.getPressedFloors(), floorNum)) {
                    //e.destinationQueue = _.without(e.destinationQueue, floorNum);
                    e.stop();
                    waitingFloors = _.without(waitingFloors, waiting);
                    e.goToFloor(floorNum, true);
                    //e.checkDestinationQueue();
                } else {
                    if(typeof(waiting) !== "undefined") {
                        if((_.contains(e.destinationQueue, floorNum) || e.destinationQueue.length <= 2) && e.loadFactor() < 0.55) {
                            //e.destinationQueue = _.without(e.destinationQueue, floorNum);
                            e.stop();
                            //waitingFloors = _.without(waitingFloors, waiting);
                            e.goToFloor(floorNum, true);
                            //e.checkDestinationQueue();
                        }
                    }
                }
            });
        });

        var bestElevatorIdx = function(floorNum) {
            var criterion = function(elevator) {
                return (elevator.loadFactor() * 2)
                    + elevator.destinationQueue.length
                    + Math.abs(elevator.currentFloor() - floorNum); };
            var min_by_criterion = _.reduce(
                elevators,
                function(acc, e, i) {
                    var c = criterion(e);
                    if(c <= acc.weight) {
                        return { idx: i, weight: c };
                    } else {
                        return acc;
                    }
                },
                { idx: 0, weight: criterion(elevators[0]) }
            );
            return min_by_criterion.idx;
        };

        var floor_press = function(floor, direction) {
            var xxx = findWaitFloor(floor.floorNum(), direction);
            if(typeof(xxx) === "undefined") {
                var new_floor = { idx: floor.floorNum(), direction: direction };
                waitingFloors.push(new_floor);
            };
            var eix = bestElevatorIdx(floor.floorNum());
            elevators[eix].goToFloor(floor.floorNum());
        };

        _.each(floors, function(f) {
            f.on("up_button_pressed", function() {
                floor_press(f, "up");
            });
            f.on("down_button_pressed", function() {
                floor_press(f, "down");
            });
        });
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}