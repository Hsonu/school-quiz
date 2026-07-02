const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Helper to ensure data directory and files exist
function ensureDirAndFile(modelName) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filePath = path.join(DATA_DIR, `${modelName.toLowerCase()}s.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
  }
  return filePath;
}

// Read records
function readRecords(modelName) {
  const filePath = ensureDirAndFile(modelName);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${modelName} database file:`, err);
    return [];
  }
}

// Write records
function writeRecords(modelName, data) {
  const filePath = ensureDirAndFile(modelName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${modelName} database file:`, err);
  }
}

// Simple query matcher
function matchesQuery(item, query) {
  for (const key in query) {
    // Handling simple comparisons
    if (query[key] && typeof query[key] === 'object' && !Array.isArray(query[key])) {
      // Support simple $in, $ne, etc.
      const val = query[key];
      if ('$in' in val) {
        if (!Array.isArray(val.$in)) continue;
        if (!val.$in.includes(String(item[key]))) return false;
      } else if ('$ne' in val) {
        if (item[key] == val.$ne) return false;
      }
    } else {
      // Direct comparison
      if (String(item[key]) !== String(query[key])) {
        return false;
      }
    }
  }
  return true;
}

const localDb = {
  find: async (modelName, query = {}) => {
    const records = readRecords(modelName);
    return records.filter(item => matchesQuery(item, query));
  },

  findOne: async (modelName, query = {}) => {
    const records = readRecords(modelName);
    return records.find(item => matchesQuery(item, query)) || null;
  },

  findById: async (modelName, id) => {
    const records = readRecords(modelName);
    return records.find(item => String(item._id) === String(id)) || null;
  },

  create: async (modelName, doc) => {
    const records = readRecords(modelName);
    const newDoc = {
      _id: doc._id || Math.random().toString(36).substring(2, 11),
      ...doc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    records.push(newDoc);
    writeRecords(modelName, records);
    return newDoc;
  },

  findByIdAndUpdate: async (modelName, id, update) => {
    const records = readRecords(modelName);
    const index = records.findIndex(item => String(item._id) === String(id));
    if (index === -1) return null;

    // Apply update (flat merges and basic object checks)
    const updated = {
      ...records[index],
      ...update,
      updatedAt: new Date().toISOString()
    };
    records[index] = updated;
    writeRecords(modelName, records);
    return updated;
  },

  findByIdAndDelete: async (modelName, id) => {
    const records = readRecords(modelName);
    const index = records.findIndex(item => String(item._id) === String(id));
    if (index === -1) return null;
    const deleted = records.splice(index, 1)[0];
    writeRecords(modelName, records);
    return deleted;
  },

  deleteMany: async (modelName, query = {}) => {
    const records = readRecords(modelName);
    const remaining = records.filter(item => !matchesQuery(item, query));
    writeRecords(modelName, remaining);
    return { deletedCount: records.length - remaining.length };
  }
};

module.exports = localDb;
