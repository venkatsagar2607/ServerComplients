const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupName: String,
    SpecificIssue: String,
    parentName: String,
    sectionName: String,
    category: String,
    issue: String,
    fileUrl: String,  // You can implement file upload later
    status: { type: String, default: "Pending" },
    bookmarked: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
