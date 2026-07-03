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
      try {
        return await this.mongooseModel.find(query);
      } catch (err) {
        console.warn(`Mongoose find failed. Falling back to localDb.`, err.message);
      }
    }
    return localDb.find(this.modelName, query);
  }

  async findOne(query = {}) {
    if (this.isConnected) {
      try {
        return await this.mongooseModel.findOne(query);
      } catch (err) {
        console.warn(`Mongoose findOne failed. Falling back to localDb.`, err.message);
      }
    }
    return localDb.findOne(this.modelName, query);
  }

  async findById(id) {
    if (this.isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const doc = await this.mongooseModel.findById(id);
        if (doc) return doc;
      } catch (err) {
        console.warn(`Mongoose findById failed for ID: ${id}. Falling back to localDb.`, err.message);
      }
    }
    return localDb.findById(this.modelName, id);
  }

  async create(doc) {
    if (this.isConnected) {
      try {
        return await this.mongooseModel.create(doc);
      } catch (err) {
        console.warn(`Mongoose create failed. Falling back to localDb.`, err.message);
      }
    }
    return localDb.create(this.modelName, doc);
  }

  async findByIdAndUpdate(id, update, options = { new: true }) {
    if (this.isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const doc = await this.mongooseModel.findByIdAndUpdate(id, update, options);
        if (doc) return doc;
      } catch (err) {
        console.warn(`Mongoose findByIdAndUpdate failed for ID: ${id}. Falling back to localDb.`, err.message);
      }
    }
    return localDb.findByIdAndUpdate(this.modelName, id, update);
  }

  async findByIdAndDelete(id) {
    if (this.isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const doc = await this.mongooseModel.findByIdAndDelete(id);
        if (doc) return doc;
      } catch (err) {
        console.warn(`Mongoose findByIdAndDelete failed for ID: ${id}. Falling back to localDb.`, err.message);
      }
    }
    return localDb.findByIdAndDelete(this.modelName, id);
  }

  async deleteMany(query = {}) {
    if (this.isConnected) {
      try {
        return await this.mongooseModel.deleteMany(query);
      } catch (err) {
        console.warn(`Mongoose deleteMany failed. Falling back to localDb.`, err.message);
      }
    }
    return localDb.deleteMany(this.modelName, query);
  }

  async countDocuments(query = {}) {
    if (this.isConnected) {
      try {
        return await this.mongooseModel.countDocuments(query);
      } catch (err) {
        console.warn(`Mongoose countDocuments failed. Falling back to localDb.`, err.message);
      }
    }
    const results = await localDb.find(this.modelName, query);
    return results.length;
  }
}

module.exports = BaseModel;
