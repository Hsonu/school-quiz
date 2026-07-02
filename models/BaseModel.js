const mongoose = require('mongoose');
const localDb = require('../utils/localDb');

class BaseModel {
  constructor(modelName, schemaFields) {
    this.modelName = modelName;
    this.schemaFields = schemaFields;
    
    // Define Mongoose Schema & compile Model
    const schema = new mongoose.Schema(schemaFields, { timestamps: true });
    
    try {
      this.mongooseModel = mongoose.model(modelName, schema);
    } catch (e) {
      this.mongooseModel = mongoose.model(modelName);
    }
  }

  get isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async find(query = {}) {
    if (this.isConnected) {
      return this.mongooseModel.find(query);
    }
    return localDb.find(this.modelName, query);
  }

  async findOne(query = {}) {
    if (this.isConnected) {
      return this.mongooseModel.findOne(query);
    }
    return localDb.findOne(this.modelName, query);
  }

  async findById(id) {
    if (this.isConnected) {
      return this.mongooseModel.findById(id);
    }
    return localDb.findById(this.modelName, id);
  }

  async create(doc) {
    if (this.isConnected) {
      return this.mongooseModel.create(doc);
    }
    return localDb.create(this.modelName, doc);
  }

  async findByIdAndUpdate(id, update, options = { new: true }) {
    if (this.isConnected) {
      return this.mongooseModel.findByIdAndUpdate(id, update, options);
    }
    return localDb.findByIdAndUpdate(this.modelName, id, update);
  }

  async findByIdAndDelete(id) {
    if (this.isConnected) {
      return this.mongooseModel.findByIdAndDelete(id);
    }
    return localDb.findByIdAndDelete(this.modelName, id);
  }

  async deleteMany(query = {}) {
    if (this.isConnected) {
      return this.mongooseModel.deleteMany(query);
    }
    return localDb.deleteMany(this.modelName, query);
  }

  async countDocuments(query = {}) {
    if (this.isConnected) {
      return this.mongooseModel.countDocuments(query);
    }
    const results = await localDb.find(this.modelName, query);
    return results.length;
  }
}

module.exports = BaseModel;
