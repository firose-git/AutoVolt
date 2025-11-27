const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

counterSchema.statics.getNextSequence = function (name) {
    return this.findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    ).then(doc => doc.seq);
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;