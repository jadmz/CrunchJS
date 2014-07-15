/**
 * @author Joe Adams
 */

goog.provide("CrunchJS.Internal.EntityManager");

goog.require('goog.array');
goog.require('goog.structs.Set');
goog.require('goog.object');
goog.require('goog.structs.Map');

goog.require('CrunchJS.Internal.Manager');

/**
 * Creates a new System Manager.
 * @this {CrunchJS.Internal.EntityManager}
 * @constructor
 * @extends {CrunchJS.Internal.Manager} 
 * @class  Manages all of the Entities for the game (for internal use)
 */
CrunchJS.Internal.EntityManager = function(scene) {

	goog.base(this, scene);

	/**
	 * The array of all entities
	 * @type {Array}
	 * @protected
	 */
	this._nextEntityId = 1;

	/**
	 * The enabled entities
	 * @type {goog.structs.Set}
	 */
	this._enabledEntities = new goog.structs.Set();

	/**
	 * The disabled entities
	 * @type {goog.structs.Set}
	 */
	this._disabledEntities = new goog.structs.Set();

	/**
	 * The array of the keys of the freed entities. Stores the unused spots in the entities array
	 * @type {Array}
	 * @protected
	 */
	this._entityPool = [];

	// Entity Count
	this.entities = 0;

	// Actives count
	this.actives = 0;

	/**
	 * Maps names to entity Ids
	 * @type {goog.structs.Map}
	 */
	this._nameMap = new goog.structs.Map();

	
	this.getScene().addEventListener(CrunchJS.EngineCommands.CreateEntity, goog.bind(this.onCreateEntity, this));
	this.getScene().addEventListener(CrunchJS.EngineCommands.DestroyEntity, goog.bind(this.onDestroyEntity, this));
	this.getScene().addEventListener(CrunchJS.EngineCommands.EnableEntity, goog.bind(this.onEnableEntity, this));
	this.getScene().addEventListener(CrunchJS.EngineCommands.DisableEntity, goog.bind(this.onDisableEntity, this));
	this.getScene().addEventListener(CrunchJS.EngineCommands.SetEntityName, goog.bind(this.onSetEntityName, this));

};

goog.inherits(CrunchJS.Internal.EntityManager, CrunchJS.Internal.Manager);


/**
 * Activates the entity manager
 */
CrunchJS.Internal.EntityManager.prototype.activate = function() {
	goog.base(this, 'activate');
	
};	

/**
 * Listens for the create entity command
 * @param  {number} id The id
 * @private
 */
CrunchJS.Internal.EntityManager.prototype.onCreateEntity = function(id) {
	//CrunchJS.world.log('Create Entity:'+id);
	this._createEntity(id);
};

/**
 * Listens for the destroy entity command
 * @param  {number} id The id
 * @private
 */
CrunchJS.Internal.EntityManager.prototype.onDestroyEntity = function(id) {
	//CrunchJS.world.log('Destroy Entity:'+id);
	this._destroyEntity(id);
};

/**
 * Listens for an entity to be enabled
 * @param  {number} id The entity id
 * @private
 */
CrunchJS.Internal.EntityManager.prototype.onEnableEntity = function(id) {
	//CrunchJS.world.log('Entity Enabled:'+id);
	this._enableEntity(id);
};

/**
 * Listens for an entity to be disabled
 * @param  {number} id The entity id
 * @private
 */
CrunchJS.Internal.EntityManager.prototype.onDisableEntity = function(id) {
	//CrunchJS.world.log('Entity Disabled:'+id);
	this._disableEntity(id);
};

/**
 * Listens for the command to set an entity name
 * @param  {Object} data The event data
 */
CrunchJS.Internal.EntityManager.prototype.onSetEntityName = function(data) {
	this.setEntityName(data.name, data.id, false);
};

/**
 * Creates an Entity
 * @return {Number} The id of the entity
 * @this {CrunchJS.Internal.EntityManager}
 */
CrunchJS.Internal.EntityManager.prototype.createEntity = function() {
	
	var id = this._nextEntityId;

	// Checks if we have unused spots in the entities array. If we do, use them
	if(this._entityPool.length > 0) {
		id = this._entityPool.pop();
	}

	this.activateEntity(id);

	this.getScene().postEventToRemoteEngine(CrunchJS.EngineCommands.CreateEntity, id);

	this._nextEntityId++;
	
	return id;
};

/**
 * Creates an entity with a specified id
 * @param  {number} id The id to create it with
 * @private
 */
CrunchJS.Internal.EntityManager.prototype._createEntity = function(id) {
	if(this._nextEntityId > id){
		var foundId = goog.array.find(this._entityPool, function(num) {
			return num == id;
		});

		if(foundId == null){
			CrunchJS.world.log("Entity Id collision for sync. Id: "+id);
			return false;
		}
		else{
			goog.array.remove(this._entityPool, id);
			this.activateEntity(id);
			return true;
		}
	}
	else if(this._nextEntityId < id){
		while(this._nextEntityId < id){
			this._entityPool.push(this._nextEntityId);
			this._nextEntityId++;
		}
		this.activateEntity(id);
		this._nextEntityId++;
	}
	else{
		this.activateEntity(id);
		this._nextEntityId++;
	}
};

/**
 * Activates the entity
 * @param  {number} id Id
 */
CrunchJS.Internal.EntityManager.prototype.activateEntity = function(id) {
	this.getEnabledEntities().add(id);	

	this.entities++;
	this.actives++;

	// Throw event that an entity was created
	this.getScene().fireEvent(CrunchJS.Events.EntityCreated, id);
};

/**
 * Destroys the specified entity 
 * @param  {Number} id The Id of the Entity to destroy
 * @this {CrunchJS.Internal.EntityManager}
 */
CrunchJS.Internal.EntityManager.prototype.destroyEntity = function(id) {
	this._destroyEntity(id);

	this.getScene().removeAllComponents(id);

	this.getScene().postEventToRemoteEngine(CrunchJS.EngineCommands.DestroyEntity, id);
};

/** 
 * Destroys the entity
 * @param  {Number} id The id to destroy
 */
CrunchJS.Internal.EntityManager.prototype._destroyEntity = function(id) {
	this._entityPool.push(id);

	this.entities--;

	if(!this.getEnabledEntities().remove(id)){
		this.getDisabledEntities().remove(id);
	}
	else
		this.actives--;

	this.getScene().fireEvent(CrunchJS.Events.EntityDestroyed, id);	
};

/**
 * Enables an entity
 * @param  {number} id The Id of the entity
 */
CrunchJS.Internal.EntityManager.prototype.enableEntity = function(id) {
	this._enableEntity(id);
	
	this.getScene().postEventToRemoteEngine(CrunchJS.EngineCommands.EnableEntity, id);
};

/**
 * Enables an entity
 * @param {number} id The id to destroy
 * @private
 */
CrunchJS.Internal.EntityManager.prototype._enableEntity = function(id) {
	this.getDisabledEntities().remove(id);

	this.getEnabledEntities().add(id);

	this.actives++;

	this.getScene().fireEvent(CrunchJS.Events.EntityEnabled, id);
};
/**
 * Disables an entity
 * @param  {number} id The entity id
 */
CrunchJS.Internal.EntityManager.prototype.disableEntity = function(id) {
	this._disableEntity(id);

	this.getScene().postEventToRemoteEngine(CrunchJS.EngineCommands.DisableEntity, id);
};

/**
 * Disables an entity
 * @param  {number} id The id to disable
 */
CrunchJS.Internal.EntityManager.prototype._disableEntity = function(id) {
	this.getEnabledEntities().remove(id);
	
	this.getDisabledEntities().add(id);

	this.actives--;

	this.getScene().fireEvent(CrunchJS.Events.EntityDisabled, id);
};

/**
 * Gets a set of enabled entities
 * @return {goog.structs.Set} The set
 */
CrunchJS.Internal.EntityManager.prototype.getEnabledEntities = function() {
	return this._enabledEntities;
};

/**
 * Gets a set of disabled entities
 * @return {goog.structs.Set} The set
 */
CrunchJS.Internal.EntityManager.prototype.getDisabledEntities = function() {
	return this._disabledEntities;
};

/**
 * Sets a name for the entityId
 * @param {string} name     The name to set
 * @param {number} entityId The entityId
 */
CrunchJS.Internal.EntityManager.prototype.setEntityName = function(name, entityId, fireEvent) {
	this._nameMap.set(name, entityId);

	if(fireEvent){
		this.getScene().postEventToRemoteEngine(CrunchJS.EngineCommands.SetEntityName, {
			id : entityId,
			name : name
		});
	}
};

/**
 * Gets the entity from its name, if it has one
 * @param  {string} name The name of the entity
 * @return {number}      The entityId
 */
CrunchJS.Internal.EntityManager.prototype.getEntityByName = function(name) {
	return this._nameMap.get(name);
};

/**
 * Gets a snapshot of the current state of all of the entities
 * @return {Object} The state
 */
CrunchJS.Internal.EntityManager.prototype.getSnapshot = function() {
	var data = {};

	data._nextEntityId = this._nextEntityId;
	data._enabledEntities = this._enabledEntities.getValues();
	data._disabledEntities = this._disabledEntities.getValues();
	data._nameMap = this._nameMap.toObject();

	data._entityPool = this._entityPool;
	data.entities = this.entities;
	data.actives = this.actives;


	return data;
	
};

/**
 * Overwrites the current state with the incoming state
 * @param  {Object} data The new state
 */
CrunchJS.Internal.EntityManager.prototype.sync = function(data) {
	this._nextEntityId = data._nextEntityId ;
	this._enabledEntities = new goog.structs.Set(data._enabledEntities);
	this._disabledEntities = new goog.structs.Set(data._disabledEntities);
	this._nameMap = new goog.structs.Map(data._nameMap);

	this._entityPool = data._entityPool;
	this.entities = data.entities;
	this.actives = data.actives ;
};

