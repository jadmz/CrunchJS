/**
 * @author Joe Adams
 */

goog.provide('Engine.FrameManager');

goog.require('Engine.Frame');

/**
 * Creates a new Frame Manager
 * @constructor
 * @class Manages the Frames for the Engine (for internal use)
 * @this {Engine.FrameManager}
 */
Engine.FrameManager = function() {

	/**
	 * The Next Id of the frame
	 * @type {Number}
	 */
	this.nextId = 1;

	/**
	 * The current frame
	 * @type {Engine.Frame}
	 */
	this.frame = null;

};

/**
 * Updates the endTime of the current frame
 */
Engine.FrameManager.prototype.frameOver = function() {
	var time = goog.now();
	this.frame.endTime = time;
};

/**
 * Creates a new frame
 * @return {Engine.Frame} The new Frame
 * @this {Engine.FrameManager}
 */
Engine.FrameManager.prototype.nextFrame = function() {
	var time = goog.now();

	var delta = null;
	if(this.frame != null){	
		delta = time - this.frame.startTime;
	}

	this.frame = new Engine.Frame(this.nextId, time, null, delta);

	this.nextId++;
	return this.frame;
};